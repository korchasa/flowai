import type { LLMMessage, LLMResponse } from "./types.ts";
import { type AppServerProcess, AppServerSession } from "./appserver_client.ts";

export interface ModelConfig {
  model: string;
  temperature: number;
  /** Codex reasoning effort (`low` … `xhigh`). Pinned per call so a verdict
   * never inherits the operator's `~/.codex/config.toml`; defaults to
   * `medium` when a config omits it. */
  effort?: string;
  jsonSchema?: Record<string, unknown>;
  /** Extra environment for the spawned CLI (e.g. an isolated `HOME` so a
   * programmatic judge does not inherit the developer's personal memory). */
  env?: Record<string, string>;
  /** Working directory for the spawned CLI. Ancestor-directory memory files
   * (`CLAUDE.md`/`AGENTS.md` up the cwd path) load regardless of `HOME`; a cwd
   * outside the developer's home is the only way to exclude them. */
  cwd?: string;
  provider?: {
    order?: string[];
    allow_fallbacks?: boolean;
    require_parameters?: boolean;
    data_collection?: "allow" | "deny";
  };
  [key: string]: unknown;
}

export interface IdeConfig {
  agent_models: string[];
  default_agent_model: string;
  /** Reasoning effort for the agent under test (codex only). */
  agent_effort?: string;
  judge: ModelConfig;
}

export interface BenchmarkConfig {
  default_ides: string[];
  ides: Record<string, IdeConfig>;
}

/** Get IDE-specific config */
export function getIdeConfig(
  config: BenchmarkConfig,
  ide: string,
): IdeConfig {
  const ideSection = config.ides[ide];
  if (!ideSection) {
    throw new Error(
      `No configuration found for IDE "${ide}". Available: ${
        Object.keys(config.ides).join(", ")
      }`,
    );
  }
  return ideSection;
}

/**
 * Loads the benchmark configuration file (`acceptance-tests/config.json` by default).
 * Throws with an actionable message when the file is missing or malformed.
 */
export async function loadConfig(
  path = "acceptance-tests/config.json",
): Promise<BenchmarkConfig> {
  try {
    const content = await Deno.readTextFile(path);
    const config = JSON.parse(content) as BenchmarkConfig;
    return config;
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      throw new Error(
        `Configuration file not found at ${path}. Please create it to run benchmarks.`,
      );
    }
    throw e;
  }
}

/**
 * Fold a chat-shaped message list into the single prompt a codex turn accepts.
 * There is no separate system channel, so the persona leads the text or it is
 * lost; the remaining turns keep their order and are labelled by role.
 */
export function codexPrompt(messages: LLMMessage[]): string {
  const system = messages.filter((m) => m.role === "system").map((m) =>
    m.content
  );
  const rest = messages.filter((m) => m.role !== "system").map((m) =>
    `[${m.role}]\n${m.content}`
  );
  return [...system, ...rest].join("\n\n");
}

/** Default reasoning effort for a programmatic codex turn. */
export const DEFAULT_CODEX_EFFORT = "medium";

/** Options a programmatic codex caller pins per call. */
export interface CodexCallConfig {
  model: string;
  effort?: string;
  jsonSchema?: Record<string, unknown>;
  /** Extra env for the child (the caller's own isolated `CODEX_HOME`). */
  env?: Record<string, string>;
  /**
   * Working directory for the thread. Defaults to a temp dir owned by the
   * session — codex reads `AGENTS.md` up the cwd path regardless of any flag,
   * and a caller that forgets to isolate itself must never run from the repo.
   */
  cwd?: string;
  /** Test seam: supply the child process instead of spawning `codex`. */
  spawn?: () => AppServerProcess;
}

/**
 * Cache key for one app-server child. Model, effort, cwd and env all change
 * what a turn means, so each combination gets its own session; two callers with
 * different isolated `CODEX_HOME`s never share one child.
 */
export function codexSessionKey(config: CodexCallConfig): string {
  return JSON.stringify([
    config.model,
    config.effort ?? DEFAULT_CODEX_EFFORT,
    config.cwd ?? null,
    config.env ?? null,
  ]);
}

interface CachedSession {
  session: AppServerSession;
  ownCwd?: string;
}

const sessions = new Map<string, Promise<CachedSession>>();

async function openSession(config: CodexCallConfig): Promise<CachedSession> {
  const ownCwd = config.cwd
    ? undefined
    : await Deno.makeTempDir({ prefix: "codex-cwd-" });
  const session = new AppServerSession({
    model: config.model,
    effort: config.effort ?? DEFAULT_CODEX_EFFORT,
    cwd: config.cwd ?? ownCwd!,
    env: config.env,
    ...(config.spawn ? { spawn: config.spawn } : {}),
  });
  try {
    await session.ready();
  } catch (e) {
    session.close();
    if (ownCwd) await Deno.remove(ownCwd, { recursive: true }).catch(() => {});
    throw e;
  }
  return { session, ownCwd };
}

function acquire(config: CodexCallConfig): Promise<CachedSession> {
  const key = codexSessionKey(config);
  const existing = sessions.get(key);
  if (existing) return existing;
  // A session that fails to open leaves no entry behind: the next call opens a
  // fresh one instead of inheriting the broken child.
  const opening = openSession(config).catch((e) => {
    sessions.delete(key);
    throw e;
  });
  sessions.set(key, opening);
  return opening;
}

/**
 * Open the caller's app-server session ahead of time
 * (FR-ACCEPT.JUDGE-APPSERVER). Call it when the agent run STARTS: the handshake
 * and `thread/start` then overlap a scenario that runs ~50 s instead of sitting
 * in front of the judge's prompt.
 *
 * A prewarm that fails is reported and swallowed — the session degrades to
 * being opened at call time, never to a wrong verdict.
 */
export async function prewarmCodexSession(
  config: CodexCallConfig,
): Promise<void> {
  try {
    await acquire(config);
  } catch (e) {
    console.warn(
      `[llm] codex app-server prewarm failed, falling back to at-call start: ${
        e instanceof Error ? e.message : String(e)
      }`,
    );
  }
}

/** Close every cached session. Call at the end of a run. */
export function closeCodexSessions(): void {
  for (const [key, pending] of sessions) {
    sessions.delete(key);
    pending.then(({ session, ownCwd }) => {
      session.close();
      if (ownCwd) return Deno.remove(ownCwd, { recursive: true });
    }).catch(() => {});
  }
}

/**
 * Chat completion over the Codex app-server. No API key — uses the existing CLI
 * auth under `CODEX_HOME`.
 *
 * The single LLM transport of the harness: the benchmark's human emulator moved
 * here when the Claude subject arm was retired (2026-08-09), and the
 * acceptance-test judge and user emulator followed on 2026-09-01, when a
 * `-p 4` sweep on `claude -p` burned the account's whole subscription window in
 * five hours (250M cache-read tokens, 583 sessions in a day).
 *
 * It ran on `codex exec` until 2026-09-15. `exec` fuses session and turn, so
 * every call paid the full warmup before reading its prompt — 4.2-4.9 s on a
 * trivial judge-shaped turn. The app-server splits them; with the session
 * prewarmed the same turn takes 2.4-3.4 s from prompt to answer.
 *
 * `config.jsonSchema` is forwarded as the turn's `outputSchema`: the reply is
 * then the validated JSON object itself.
 */
export async function codexChatCompletion(
  messages: LLMMessage[],
  config: CodexCallConfig,
  signal?: AbortSignal,
): Promise<LLMResponse> {
  const { session } = await acquire(config);
  const content = await session.run(
    codexPrompt(messages),
    config.jsonSchema,
    signal,
  );
  return { content, usage: undefined };
}

/** Shape of an injectable chat-completion client (tests swap in a stub). */
export type ChatCompletionFn = typeof codexChatCompletion;
