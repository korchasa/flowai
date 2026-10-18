import type { LLMMessage, LLMResponse } from "./types.ts";
import { CodexAppServerClient } from "@korchasa/ai-ide-cli/codex/app-server";
import { ProcessRegistry } from "@korchasa/ai-ide-cli/process-registry";
import {
  EMPTY_TOKENS,
  type TokenBreakdown,
  tokensFromAppServer,
} from "./token_usage.ts";

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
  /** Test seam: run this binary instead of `codex` (a protocol fake). */
  binary?: string;
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
    binary: config.binary,
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
  const { text, usage } = await session.run(
    codexPrompt(messages),
    config.jsonSchema,
    signal,
  );
  return { content: text, usage };
}

/** Shape of an injectable chat-completion client (tests swap in a stub). */
export type ChatCompletionFn = typeof codexChatCompletion;

// --- app-server session (FR-ACCEPT.JUDGE-APPSERVER) ---
//
// `codex exec` fuses session and turn: every call pays the whole warmup before
// the prompt is even read (measured 2026-09-15 on a trivial judge-shaped turn:
// 4.2/4.2/4.9 s). `codex app-server` splits them, so the warmup can be moved
// off the critical path — the session opens when the agent run STARTS and the
// prompt arrives ~50 s later, against a process and a thread that are already
// warm.
//
// The process, its framing and request correlation belong to the ai-ide-cli
// `CodexAppServerClient`; this session adds the harness policy on top:
//
//   initialize → initialized (notification) → thread/start → turn/start
//     … item/completed streams each finished item, turn/completed ends the turn.
//
// `thread/tokenUsage/updated` reports what the thread has spent so far
// (FR-ACCEPT.TOKEN-USAGE). It is the only route to the judge's token counts:
// its threads are `ephemeral`, so it writes no rollout to read them back from.
//
// The answer comes from `item/completed` where `item.type === "agentMessage"`.
// `turn/completed` reports only the status: its `items` array arrives EMPTY
// with `itemsView: "notLoaded"` (verified against codex-cli 0.144.6), so a
// reader that trusts the turn payload alone sees every reply as blank.
//
// One thread per call: a thread is a conversation, and a judge verdict must
// never see the previous scenario's. The session keeps ONE spare thread open at
// all times, so the ~1.5-2 s `thread/start` is paid in the background rather
// than in front of the prompt.

export interface AppServerConfig {
  /** Pinned model for every thread and turn of this session. */
  readonly model: string;
  /** Pinned reasoning effort (`low` … `xhigh`). */
  readonly effort: string;
  /**
   * Working directory for the thread. Codex reads `AGENTS.md` up the cwd path,
   * so a caller that must not see the repo's instructions passes a temp dir.
   */
  readonly cwd: string;
  /** Extra env for the child (e.g. the caller's own isolated `CODEX_HOME`). */
  readonly env?: Record<string, string>;
  /** Test seam: run this binary instead of `codex`. */
  readonly binary?: string;
}

/** A finished thread item, as `item/completed` reports it. */
export interface ThreadItem {
  readonly type: string;
  readonly text?: string;
}

/** One turn's answer together with what it cost (FR-ACCEPT.TOKEN-USAGE). */
export interface TurnResult {
  readonly text: string;
  readonly usage: TokenBreakdown;
}

/** The `turn` payload of a `turn/completed` notification. */
export interface CompletedTurn {
  readonly status: string;
  readonly items: readonly ThreadItem[];
  readonly error?: { readonly message?: string } | null;
}

/**
 * Params for `thread/start`. `sandbox: "read-only"` is what
 * `--sandbox read-only` bought on the exec path, and `ephemeral: true` keeps the
 * emulator's own rollouts out of the caller's `CODEX_HOME`.
 */
export function threadStartParams(
  config: Pick<AppServerConfig, "model" | "cwd" | "effort">,
): Record<string, unknown> {
  return {
    model: config.model,
    cwd: config.cwd,
    sandbox: "read-only",
    ephemeral: true,
  };
}

/**
 * Params for `turn/start`. Model and effort are repeated per turn on purpose:
 * they are the campaign's operating point, and an unpinned turn would inherit
 * whatever the server defaults to (FR-BENCH-SWE.SYMMETRY).
 */
export function turnStartParams(opts: {
  threadId: string;
  prompt: string;
  model: string;
  effort: string;
  outputSchema?: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    threadId: opts.threadId,
    input: [{ type: "text", text: opts.prompt }],
    model: opts.model,
    effort: opts.effort,
    ...(opts.outputSchema ? { outputSchema: opts.outputSchema } : {}),
  };
}

/**
 * The turn's answer, or an error. A blank reply is an error, not silence to
 * guess at — the same fail-loud contract the exec path had.
 *
 * `observed` holds the items collected from `item/completed` during the turn.
 * It is what the answer actually comes from; the turn's own `items` array is
 * consulted first only because the protocol allows the server to populate it.
 */
export function finalAgentMessage(
  turn: CompletedTurn,
  observed: readonly ThreadItem[] = [],
): string {
  if (turn.status !== "completed") {
    const detail = turn.error?.message ?? "(no error detail)";
    throw new Error(`Codex app-server turn ${turn.status}: ${detail}`);
  }
  const items = turn.items.length > 0 ? turn.items : observed;
  const messages = items.filter((i) => i.type === "agentMessage");
  const text = (messages.at(-1)?.text ?? "").trim();
  if (text === "") {
    throw new Error("Codex app-server: empty final message");
  }
  return text;
}

interface LiveTurn {
  items: ThreadItem[];
  usage: TokenBreakdown;
  resolve: (turn: CompletedTurn) => void;
  reject: (error: Error) => void;
}

/** One warm app-server child, driving one turn at a time per thread. */
export class AppServerSession {
  readonly #config: AppServerConfig;
  readonly #client: CodexAppServerClient;
  #closed = false;
  #closeError: Error | null = null;
  /** Live turns, keyed by thread id — one child can run several at once. */
  readonly #turns = new Map<string, LiveTurn>();
  readonly #ready: Promise<void>;
  #spareThread: Promise<string>;

  constructor(config: AppServerConfig) {
    this.#config = config;
    this.#client = CodexAppServerClient.spawn({
      ...(config.binary ? { binary: config.binary } : {}),
      env: config.env,
      processRegistry: new ProcessRegistry(),
    });
    this.#client.done.catch(() => {});
    this.#pump();
    // Prewarm: handshake and the first thread start NOW, not when a prompt
    // arrives (FR-ACCEPT.JUDGE-APPSERVER).
    this.#ready = this.#handshake();
    this.#ready.catch(() => {});
    this.#spareThread = this.#ready.then(() => this.#startThread());
    this.#spareThread.catch(() => {});
  }

  /** Resolves once the handshake and the first thread are done. */
  async ready(): Promise<void> {
    await this.#ready;
    await this.#spareThread;
  }

  /**
   * Run one turn on a thread of its own and return the final agent message
   * together with what the turn cost. Concurrent calls are fine: each gets its
   * own thread, and the protocol frames carry the thread id that routes them
   * back — including the token counts, which is why the usage of a turn can be
   * attributed to its caller rather than drained from a shared counter.
   */
  run(
    prompt: string,
    outputSchema?: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<TurnResult> {
    return this.#runTurn(prompt, outputSchema, signal);
  }

  /** Kill the child and reject anything still in flight. */
  close(): void {
    if (this.#closed) return;
    this.#closed = true;
    this.#failAll(new Error("Codex app-server session closed"));
    this.#client.abort();
  }

  async #runTurn(
    prompt: string,
    outputSchema: Record<string, unknown> | undefined,
    signal: AbortSignal | undefined,
  ): Promise<TurnResult> {
    // Claim the spare thread and open the next one SYNCHRONOUSLY, before the
    // first await: two concurrent callers that both read `#spareThread` after
    // awaiting would run their turns on the same thread and cross their
    // answers. Opening it now also keeps the next call from paying for
    // `thread/start` in front of its prompt.
    const claimed = this.#spareThread;
    this.#spareThread = claimed.then(
      () => this.#startThread(),
      () => this.#startThread(),
    );
    this.#spareThread.catch(() => {});
    const threadId = await claimed;

    const state: LiveTurn = {
      items: [],
      usage: EMPTY_TOKENS,
      resolve: () => {},
      reject: () => {},
    };
    const completed = new Promise<CompletedTurn>((resolve, reject) => {
      state.resolve = resolve;
      state.reject = reject;
      signal?.addEventListener(
        "abort",
        () => reject(new Error("Codex app-server turn aborted")),
        { once: true },
      );
    });
    this.#turns.set(threadId, state);
    if (this.#closeError) state.reject(this.#closeError);
    const request = this.#call(
      "turn/start",
      turnStartParams({
        threadId,
        prompt,
        model: this.#config.model,
        effort: this.#config.effort,
        outputSchema,
      }),
    );
    try {
      const turn = await Promise.race([
        completed,
        request.then(() => completed),
      ]);
      return {
        text: finalAgentMessage(turn, state.items),
        usage: state.usage,
      };
    } finally {
      this.#turns.delete(threadId);
    }
  }

  async #handshake(): Promise<void> {
    await this.#call("initialize", {
      clientInfo: { name: "flowai", title: "flowai harness", version: "1" },
    });
    await this.#client.notify("initialized", {});
  }

  async #startThread(): Promise<string> {
    const result = await this.#call(
      "thread/start",
      threadStartParams(this.#config),
    );
    const thread = result.thread as { id?: string } | undefined;
    if (!thread?.id) {
      throw new Error(`Codex app-server: thread/start returned no thread id`);
    }
    return thread.id;
  }

  #call(
    method: string,
    params: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    if (this.#closeError) return Promise.reject(this.#closeError);
    return this.#client.request<Record<string, unknown> | undefined>(
      method,
      params,
    ).then((r) => r ?? {});
  }

  async #pump(): Promise<void> {
    try {
      for await (const message of this.#client.notifications) {
        this.#dispatch(message.method, message.params);
      }
    } catch {
      // The stream ended abnormally — handled below like a clean end.
    }
    this.#failAll(new Error("Codex app-server closed its stream"));
  }

  #dispatch(method: string, params: unknown): void {
    const p = (params ?? {}) as { threadId?: string };
    const turn = p.threadId ? this.#turns.get(p.threadId) : undefined;
    if (!turn) return;
    if (method === "item/completed") {
      const item = (params as { item?: ThreadItem }).item;
      if (item) turn.items.push(item);
      return;
    }
    // What the turn cost (FR-ACCEPT.TOKEN-USAGE). `tokenUsage.total` is
    // cumulative over the THREAD, and a thread here runs exactly one turn, so
    // the latest frame is that turn's bill. Frames arrive before
    // `turn/completed`, which is what makes the value readable by the caller.
    if (method === "thread/tokenUsage/updated") {
      const total = (params as { tokenUsage?: { total?: unknown } })
        .tokenUsage?.total;
      if (total && typeof total === "object") {
        turn.usage = tokensFromAppServer(total as Record<string, never>);
      }
      return;
    }
    if (method === "turn/completed") {
      const completed = (params as { turn?: CompletedTurn }).turn;
      if (completed) turn.resolve(completed);
    }
  }

  #failAll(error: Error): void {
    this.#closeError ??= error;
    // A turn whose `turn/start` was already acknowledged waits only for
    // `turn/completed`, which a dead child never sends. Pending requests are
    // rejected by the client itself once the child exits.
    for (const [, turn] of this.#turns) turn.reject(error);
  }
}
