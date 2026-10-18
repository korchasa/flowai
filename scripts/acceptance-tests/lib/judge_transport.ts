/**
 * Judge transport dispatch (FR-ACCEPT.JUDGE-ACP). The acceptance judge and the
 * user emulator call `chatCompletion`; a claude model goes over the claude ACP
 * bridge, every other model over the codex app-server
 * (FR-ACCEPT.JUDGE-APPSERVER). Kept apart from `llm.ts` because the ACP agent
 * module already imports `llm.ts`.
 *
 * ## Claude path
 *
 * One bridge process per `[model, effort, env, cwd]`, opened once through the
 * ai-ide-cli connection (`openAcpConnection`) and reused; every call opens its
 * own session on it and ends it after the reply, which closes the session on
 * the bridge. The session is stripped through `_meta.claudeCode.options`: no
 * tools, no setting sources (no user or project settings, no `CLAUDE.md`), the
 * pinned effort and a one-line system prompt in place of the Claude Code
 * prompt. Measured 2026-10-17 on bridge 0.81.0: ~506 tokens per call instead
 * of 31,793.
 *
 * The bridge has no structured-output parameter, so the schema goes into the
 * prompt and the reply is validated here; a mismatch throws, never passes.
 */
import {
  type AcpConnection,
  type AcpFrontLauncher,
  openAcpConnection,
  type RuntimeSession,
} from "@korchasa/ai-ide-cli/runtime";
import { ProcessRegistry } from "@korchasa/ai-ide-cli/process-registry";
import {
  closeCodexSessions,
  type CodexCallConfig,
  codexChatCompletion,
  codexPrompt,
  prewarmCodexSession,
} from "./llm.ts";
import { resolveBridgeCommand } from "./acp/bridge_store.ts";
import { ACP_AGENTS } from "./acp/registry.ts";
import { type AcpRunUsage, tokensFromAcpUsage } from "./token_usage.ts";
import type { LLMMessage, LLMResponse } from "./types.ts";

export type JudgeTransport = "claude-acp" | "codex-appserver";

/** Which transport serves a model, by its name. */
export function judgeTransportFor(model: string): JudgeTransport {
  return /^claude/i.test(model) ? "claude-acp" : "codex-appserver";
}

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

/** A call config either transport accepts; each reads its own fields. */
export type JudgeCallConfig = CodexCallConfig & ClaudeCallConfig;

/** Chat completion routed by model name. */
export function chatCompletion(
  messages: LLMMessage[],
  config: JudgeCallConfig,
  signal?: AbortSignal,
): Promise<LLMResponse> {
  return judgeTransportFor(config.model) === "claude-acp"
    ? claudeChatCompletion(messages, config, signal)
    : codexChatCompletion(messages, config, signal);
}

/** Open the judge's transport ahead of its first prompt. */
export function prewarmJudgeSession(config: JudgeCallConfig): Promise<void> {
  return judgeTransportFor(config.model) === "claude-acp"
    ? prewarmClaudeJudge(config)
    : prewarmCodexSession(config);
}

/** Close every pooled judge session of both transports. */
export async function closeJudgeSessions(): Promise<void> {
  closeCodexSessions();
  await closeClaudeJudgeSessions();
}

interface Bridge {
  conn: AcpConnection;
  stderrTail: () => string;
  cwd: string;
  ownCwd: boolean;
  /** Pool key and pool entry, so a failed call evicts exactly this bridge
   * and never a newer one under the same key. */
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
  // implements [FR-ACCEPT.BRIDGE-LOCAL](../../../documents/requirements.md#fr-accept.bridge-local-acp-bridges-are-installed-once-and-launched-directly-ancfraccept.bridge-local):
  // the judge runs the same locally stored bridge as the agent arm.
  const launch = config.launch ?? resolveBridgeCommand(spec);
  const front: AcpFrontLauncher = {
    cmd: launch.command,
    args: launch.args,
    env: spec.env ?? {},
    pilot: true,
  };
  let tail = "";
  try {
    const conn = await openAcpConnection("claude", {
      processRegistry: new ProcessRegistry(),
      acpFront: front,
      cwd,
      env: { ANTHROPIC_MODEL: config.model, ...config.env },
      // The bridge leads its own process group, so `close()` takes its
      // children with it.
      processGroup: true,
      onStderr: (text) => {
        tail = (tail + text).slice(-2000);
      },
    });
    return {
      conn,
      stderrTail: () => tail.trim(),
      cwd,
      ownCwd,
      key,
    };
  } catch (e) {
    if (ownCwd) await Deno.remove(cwd, { recursive: true }).catch(() => {});
    throw e;
  }
}

async function closeBridge(b: Bridge): Promise<void> {
  await b.conn.close().catch(() => {});
  if (b.ownCwd) await Deno.remove(b.cwd, { recursive: true }).catch(() => {});
}

function evict(bridge: Bridge): void {
  if (bridge.pooled && bridges.get(bridge.key) === bridge.pooled) {
    bridges.delete(bridge.key);
  }
  closeBridge(bridge).catch(() => {});
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
    b.conn.done.finally(() => {
      if (bridges.get(key) === opening) bridges.delete(key);
    }).catch(() => {});
  }).catch(() => {});
  bridges.set(key, opening);
  return opening;
}

/**
 * Spawn the bridge ahead of the judge's prompt. A failure is reported and
 * swallowed: the bridge is then spawned at call time.
 */
async function prewarmClaudeJudge(config: ClaudeCallConfig): Promise<void> {
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

/** Close every pooled bridge. Call at the end of a run. */
async function closeClaudeJudgeSessions(): Promise<void> {
  const pending = [...bridges.values()];
  bridges.clear();
  await Promise.all(
    pending.map((p) => p.then(closeBridge).catch(() => {})),
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

interface Turn {
  text: string;
  stopReason: string;
  usage?: AcpRunUsage;
}

/** Send one prompt and read the session's events up to its `turn-end`. */
async function runTurn(session: RuntimeSession, text: string): Promise<Turn> {
  const sent = session.send(text);
  // Observed below; a rejection must not surface before that.
  sent.catch(() => {});
  const chunks: string[] = [];
  // `next()` by hand: leaving a `for await` closes the session's stream.
  while (true) {
    const { value: ev, done } = await session.events.next();
    if (done) break;
    if (ev.type === "turn-end") {
      await sent;
      return {
        text: chunks.join(""),
        stopReason: String(ev.raw["stopReason"] ?? ""),
        usage: ev.raw["usage"] as AcpRunUsage | undefined,
      };
    }
    const update = ev.raw["update"] as Record<string, unknown> | undefined;
    const content = update?.["content"] as Record<string, unknown> | undefined;
    if (
      update?.["sessionUpdate"] === "agent_message_chunk" &&
      content?.["type"] === "text" && typeof content["text"] === "string"
    ) {
      chunks.push(content["text"]);
    }
  }
  await sent;
  throw new Error("the session ended before the turn did");
}

/**
 * One chat completion over the claude ACP bridge. Returns the validated JSON
 * (re-serialised) when `config.jsonSchema` is set, the raw reply otherwise.
 */
async function claudeChatCompletion(
  messages: LLMMessage[],
  config: ClaudeCallConfig,
  signal?: AbortSignal,
): Promise<LLMResponse> {
  signal?.throwIfAborted();
  const bridge = await acquire(config);
  let turn: Turn;
  try {
    // implements [FR-ACCEPT.JUDGE-ACP](../../../documents/requirements.md#fr-accept.judge-acp-a-claude-judge-runs-over-a-prewarmed-claude-acp-bridge-ancfraccept.judge-acp):
    // a stripped session on the shared bridge. No permission callback: with
    // `tools: []` nothing should ask, and anything that still asks is refused.
    const session = await bridge.conn.openSession({
      cwd: bridge.cwd,
      acpSessionMeta: {
        claudeCode: {
          options: {
            tools: [],
            settingSources: [],
            effort: config.effort ?? DEFAULT_CLAUDE_EFFORT,
            systemPrompt: JUDGE_SYSTEM_PROMPT,
          },
        },
      },
    });
    const onAbort = () => session.abort();
    signal?.addEventListener("abort", onAbort, { once: true });
    try {
      turn = await runTurn(session, promptText(messages, config.jsonSchema));
    } finally {
      signal?.removeEventListener("abort", onAbort);
      // Leaves the bridge running and closes the session on it.
      await session.endInput();
      await session.done;
    }
  } catch (e) {
    // A failed call means a broken bridge: drop it so the next call spawns a
    // fresh one instead of inheriting the dead connection. Name the bridge in
    // the failure, with its stderr, so the caller sees which process died.
    evict(bridge);
    signal?.throwIfAborted();
    const msg = e instanceof Error ? e.message : String(e);
    const tail = bridge.stderrTail();
    throw new Error(
      `claude judge bridge failed: ${msg}${tail ? `: ${tail}` : ""}`,
      { cause: e },
    );
  }
  signal?.throwIfAborted();
  if (turn.stopReason !== "end_turn") {
    throw new Error(
      `claude judge bridge stopped with "${turn.stopReason}"${
        bridge.stderrTail() ? `: ${bridge.stderrTail()}` : ""
      }`,
    );
  }
  if (!turn.text.trim()) {
    throw new Error("claude judge bridge returned an empty reply");
  }
  const usage = turn.usage ? tokensFromAcpUsage(turn.usage) : undefined;
  if (!config.jsonSchema) return { content: turn.text, usage };
  const parsed = parseStructuredReply(turn.text, config.jsonSchema);
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
