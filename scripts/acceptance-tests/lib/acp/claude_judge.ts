/**
 * Claude judge transport (FR-ACCEPT.JUDGE-ACP) — the acceptance judge and user
 * emulator reach a claude model through the claude ACP bridge, the same bridge
 * the claude agent arm runs on.
 *
 * One bridge process per `[model, effort, env, cwd]`, spawned once and reused;
 * every call opens its own session and closes it after the reply. The session
 * is stripped through `_meta.claudeCode.options`: no tools, no setting sources
 * (no user or project settings, no `CLAUDE.md`), the pinned effort and a
 * one-line system prompt in place of the Claude Code prompt. Measured
 * 2026-10-17 on bridge 0.81.0: ~506 tokens per call instead of 31,793.
 *
 * The bridge has no structured-output parameter, so the schema goes into the
 * prompt and the reply is validated here; a mismatch throws, never passes.
 */
import {
  type Client,
  ClientSideConnection,
  ndJsonStream,
  type PromptResponse,
  PROTOCOL_VERSION,
} from "@agentclientprotocol/sdk";
import { fromFileUrl } from "@std/path";
import { resolveBridgeCommand } from "./bridge_store.ts";
import { ACP_AGENTS } from "./registry.ts";
import { codexPrompt } from "../llm.ts";
import { tokensFromAcpUsage } from "../token_usage.ts";
import type { LLMMessage, LLMResponse } from "../types.ts";

const SETPGRP_WRAPPER = fromFileUrl(
  new URL("../setpgrp_exec.py", import.meta.url),
);

/** Default reasoning effort for a programmatic claude turn. */
export const DEFAULT_CLAUDE_EFFORT = "medium";

/** Replaces the Claude Code system prompt: the caller's own instructions
 * travel in the user turn, as they do on the codex path. */
export const JUDGE_SYSTEM_PROMPT =
  "You are a text-only evaluator with no tools. Answer exactly in the format the user message asks for.";

/** Options a programmatic claude caller pins per call. */
export interface ClaudeCallConfig {
  model: string;
  effort?: string;
  jsonSchema?: Record<string, unknown>;
  /** Extra env for the bridge (the caller's isolated `HOME`). */
  env?: Record<string, string>;
  /** Session working directory. Defaults to a temp dir owned by the bridge
   * entry, so a caller that forgets to isolate itself never runs from a repo. */
  cwd?: string;
  /** Test seam: launch this command instead of the pinned bridge. */
  launch?: { command: string; args: string[] };
}

interface Bridge {
  child: Deno.ChildProcess;
  conn: ClientSideConnection;
  texts: Map<string, string[]>;
  /** Rejects when the process exits; every request races it. */
  exited: Promise<never>;
  stderrTail: () => string;
  canClose: boolean;
  cwd: string;
  ownCwd: boolean;
  /** Pool key and pool entry, so a failed request evicts exactly this
   * bridge and never a newer one under the same key. */
  key: string;
  pooled?: Promise<Bridge>;
}

const bridges = new Map<string, Promise<Bridge>>();

function bridgeKey(config: ClaudeCallConfig): string {
  return JSON.stringify([
    config.model,
    config.effort ?? DEFAULT_CLAUDE_EFFORT,
    config.cwd ?? null,
    config.env ?? null,
    config.launch ?? null,
  ]);
}

async function openBridge(
  config: ClaudeCallConfig,
  key: string,
): Promise<Bridge> {
  const ownCwd = !config.cwd;
  const cwd = config.cwd ??
    await Deno.makeTempDir({ prefix: "claude-judge-cwd-" });
  const spec = ACP_AGENTS.claude.launch;
  const launch = config.launch ?? resolveBridgeCommand(spec);
  const child = new Deno.Command("python3", {
    args: [SETPGRP_WRAPPER, launch.command, ...launch.args],
    cwd,
    env: { ...spec.env, ANTHROPIC_MODEL: config.model, ...config.env },
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn();

  let tail = "";
  (async () => {
    const decoder = new TextDecoder();
    for await (const chunk of child.stderr) {
      tail = (tail + decoder.decode(chunk, { stream: true })).slice(-2000);
    }
  })().catch(() => {});
  const stderrTail = () => tail.trim();

  const exited = child.status.then((s) => {
    throw new Error(
      `claude judge bridge exited (code ${s.code}) before replying${
        tail.trim() ? `: ${tail.trim()}` : ""
      }`,
    );
  });
  exited.catch(() => {});

  const texts = new Map<string, string[]>();
  const client: Client = {
    sessionUpdate: (p) => {
      const u = p.update;
      if (
        u.sessionUpdate === "agent_message_chunk" && u.content.type === "text"
      ) {
        texts.get(p.sessionId)?.push(u.content.text);
      }
      return Promise.resolve();
    },
    // `tools: []` leaves nothing to ask about; anything that still asks is
    // refused rather than granted.
    requestPermission: () =>
      Promise.resolve({ outcome: { outcome: "cancelled" } }),
  };
  const conn = new ClientSideConnection(
    () => client,
    ndJsonStream(child.stdin, child.stdout),
  );
  try {
    const init = await Promise.race([
      conn.initialize({
        protocolVersion: PROTOCOL_VERSION,
        clientCapabilities: {},
      }),
      exited,
    ]);
    return {
      child,
      conn,
      texts,
      exited,
      stderrTail,
      canClose: Boolean(init.agentCapabilities?.sessionCapabilities?.close),
      cwd,
      ownCwd,
      key,
    };
  } catch (e) {
    await killBridge({ child, cwd, ownCwd });
    throw e;
  }
}

async function killBridge(
  b: Pick<Bridge, "child" | "cwd" | "ownCwd">,
): Promise<void> {
  try {
    Deno.kill(-b.child.pid, "SIGTERM");
  } catch { /* already gone */ }
  await b.child.status.catch(() => {});
  if (b.ownCwd) await Deno.remove(b.cwd, { recursive: true }).catch(() => {});
}

/**
 * Race one bridge request against the process exit, and name the bridge in
 * every failure: the SDK reports a dead child as a bare "ACP connection
 * closed", which says nothing about which caller or process it was.
 */
async function request<T>(bridge: Bridge, call: Promise<T>): Promise<T> {
  try {
    return await Promise.race([call, bridge.exited]);
  } catch (e) {
    // A failed request means a broken bridge: drop it so the next call
    // spawns a fresh one instead of inheriting the dead connection.
    evict(bridge);
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith("claude judge bridge")) throw e;
    const tail = bridge.stderrTail();
    throw new Error(
      `claude judge bridge failed: ${msg}${tail ? `: ${tail}` : ""}`,
    );
  }
}

function evict(bridge: Bridge): void {
  if (bridge.pooled && bridges.get(bridge.key) === bridge.pooled) {
    bridges.delete(bridge.key);
  }
  killBridge(bridge).catch(() => {});
}

function acquire(config: ClaudeCallConfig): Promise<Bridge> {
  const key = bridgeKey(config);
  const existing = bridges.get(key);
  if (existing) return existing;
  const opening = openBridge(config, key).catch((e) => {
    bridges.delete(key);
    throw e;
  });
  // A bridge that dies later leaves the pool, so the next call starts afresh.
  opening.then((b) => {
    b.pooled = opening;
    b.exited.catch(() => {
      if (bridges.get(key) === opening) bridges.delete(key);
    });
  }).catch(() => {});
  bridges.set(key, opening);
  return opening;
}

/**
 * Spawn the bridge ahead of the judge's prompt. A failure is reported and
 * swallowed: the bridge is then spawned at call time.
 */
export async function prewarmClaudeJudge(
  config: ClaudeCallConfig,
): Promise<void> {
  try {
    await acquire(config);
  } catch (e) {
    console.warn(
      `[claude-judge] bridge prewarm failed, falling back to at-call start: ${
        e instanceof Error ? e.message : String(e)
      }`,
    );
  }
}

/** Kill every pooled bridge. Call at the end of a run. */
export async function closeClaudeJudgeSessions(): Promise<void> {
  const pending = [...bridges.values()];
  bridges.clear();
  await Promise.all(
    pending.map((p) => p.then(killBridge).catch(() => {})),
  );
}

function promptText(
  messages: LLMMessage[],
  schema?: Record<string, unknown>,
): string {
  const base = codexPrompt(messages);
  if (!schema) return base;
  return `${base}\n\nReply with ONLY one JSON object that conforms to this JSON Schema — no prose, no code fence:\n${
    JSON.stringify(schema)
  }`;
}

/**
 * One chat completion over the claude ACP bridge. Returns the validated JSON
 * (re-serialised) when `config.jsonSchema` is set, the raw reply otherwise.
 */
export async function claudeChatCompletion(
  messages: LLMMessage[],
  config: ClaudeCallConfig,
  signal?: AbortSignal,
): Promise<LLMResponse> {
  signal?.throwIfAborted();
  const bridge = await acquire(config);
  const { sessionId } = await request(
    bridge,
    bridge.conn.newSession({
      cwd: bridge.cwd,
      mcpServers: [],
      _meta: {
        claudeCode: {
          options: {
            tools: [],
            settingSources: [],
            effort: config.effort ?? DEFAULT_CLAUDE_EFFORT,
            systemPrompt: JUDGE_SYSTEM_PROMPT,
          },
        },
      },
    }),
  );
  bridge.texts.set(sessionId, []);
  const onAbort = () => {
    bridge.conn.cancel({ sessionId }).catch(() => {});
  };
  signal?.addEventListener("abort", onAbort, { once: true });
  let resp: PromptResponse;
  try {
    resp = await request(
      bridge,
      bridge.conn.prompt({
        sessionId,
        prompt: [{
          type: "text",
          text: promptText(messages, config.jsonSchema),
        }],
      }),
    );
  } finally {
    signal?.removeEventListener("abort", onAbort);
  }
  const text = (bridge.texts.get(sessionId) ?? []).join("");
  bridge.texts.delete(sessionId);
  if (bridge.canClose) {
    await request(bridge, bridge.conn.closeSession({ sessionId }));
  }
  signal?.throwIfAborted();
  if (resp.stopReason !== "end_turn") {
    throw new Error(
      `claude judge bridge stopped with "${resp.stopReason}"${
        bridge.stderrTail() ? `: ${bridge.stderrTail()}` : ""
      }`,
    );
  }
  if (!text.trim()) {
    throw new Error("claude judge bridge returned an empty reply");
  }
  const usage = resp.usage ? tokensFromAcpUsage(resp.usage) : undefined;
  if (!config.jsonSchema) return { content: text, usage };
  const parsed = parseStructuredReply(text, config.jsonSchema);
  return { content: JSON.stringify(parsed), usage };
}

/**
 * Extract the JSON object from a model reply and validate it against the
 * subset of JSON Schema the harness uses: `type` (object, boolean, string,
 * number, integer, array), `properties`, `required`, `additionalProperties:
 * false` and `items`. Throws with the path of the first offending field.
 */
export function parseStructuredReply(
  text: string,
  schema: Record<string, unknown>,
): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) {
    throw new Error(
      `claude judge reply: no JSON object in the reply: ${text.slice(0, 200)}`,
    );
  }
  let value: unknown;
  try {
    value = JSON.parse(text.slice(start, end + 1));
  } catch (e) {
    throw new Error(
      `claude judge reply: invalid JSON (${
        e instanceof Error ? e.message : String(e)
      }): ${text.slice(0, 200)}`,
    );
  }
  validate(value, schema, "");
  return value;
}

function at(path: string, key: string): string {
  return path ? `${path}.${key}` : key;
}

function typeOf(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}

function validate(
  value: unknown,
  schema: Record<string, unknown>,
  path: string,
) {
  const where = path || "<root>";
  const type = schema.type;
  const fail = (msg: string): never => {
    throw new Error(`claude judge reply: ${msg}`);
  };
  switch (type) {
    case "object": {
      if (typeOf(value) !== "object") {
        fail(`"${where}" must be object, got ${typeOf(value)}`);
      }
      const obj = value as Record<string, unknown>;
      const props = (schema.properties ?? {}) as Record<
        string,
        Record<string, unknown>
      >;
      for (const key of (schema.required ?? []) as string[]) {
        if (!(key in obj)) fail(`missing required key "${at(path, key)}"`);
      }
      for (const [key, v] of Object.entries(obj)) {
        if (key in props) validate(v, props[key], at(path, key));
        else if (schema.additionalProperties === false) {
          fail(`unexpected key "${at(path, key)}"`);
        }
      }
      return;
    }
    case "array": {
      if (!Array.isArray(value)) {
        fail(`"${where}" must be array, got ${typeOf(value)}`);
      }
      const items = schema.items as Record<string, unknown> | undefined;
      if (items) {
        (value as unknown[]).forEach((v, i) =>
          validate(v, items, at(path, String(i)))
        );
      }
      return;
    }
    case "integer":
      if (!Number.isInteger(value)) {
        fail(`"${where}" must be integer, got ${typeOf(value)}`);
      }
      return;
    case "boolean":
    case "string":
    case "number":
      if (typeOf(value) !== type) {
        fail(`"${where}" must be ${type}, got ${typeOf(value)}`);
      }
      return;
    default:
      return;
  }
}
