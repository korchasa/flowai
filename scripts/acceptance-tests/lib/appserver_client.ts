/**
 * Codex app-server transport for the harness's programmatic LLM callers
 * (FR-ACCEPT.JUDGE-APPSERVER) — the acceptance judge, the acceptance user
 * emulator, the benchmark human emulator.
 *
 * `codex exec` fuses session and turn: every call pays the whole warmup before
 * the prompt is even read (measured 2026-09-15 on a trivial judge-shaped turn:
 * 4.2/4.2/4.9 s). `codex app-server --stdio` splits them, so the warmup can be
 * moved off the critical path — the session opens when the agent run STARTS and
 * the prompt arrives ~50 s later, against a process and a thread that are
 * already warm.
 *
 * Protocol (JSON-RPC 2.0, newline-delimited, over the child's stdio; verified
 * against `codex app-server generate-json-schema`, v2):
 *
 *   initialize → initialized (notification) → thread/start → turn/start
 *     … item/completed streams each finished item, turn/completed ends the turn.
 *
 * `thread/tokenUsage/updated` reports what the thread has spent so far
 * (FR-ACCEPT.TOKEN-USAGE). It is the only route to the judge's token counts:
 * its threads are `ephemeral`, so it writes no rollout to read them back from.
 *
 * The answer comes from `item/completed` where `item.type === "agentMessage"`.
 * `turn/completed` reports only the status: its `items` array arrives EMPTY
 * with `itemsView: "notLoaded"` (verified against codex-cli 0.144.6), so a
 * reader that trusts the turn payload alone sees every reply as blank.
 *
 * One thread per call: a thread is a conversation, and a judge verdict must
 * never see the previous scenario's. The session keeps ONE spare thread open at
 * all times, so the ~1.5-2 s `thread/start` is paid in the background rather
 * than in front of the prompt.
 */
import {
  EMPTY_TOKENS,
  type TokenBreakdown,
  tokensFromAppServer,
} from "./token_usage.ts";

/** The child process seam — real `codex app-server`, or a fake in tests. */
export interface AppServerProcess {
  readonly stdin: WritableStream<Uint8Array>;
  readonly stdout: ReadableStream<Uint8Array>;
  kill(): void;
}

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
  /** Test seam: supply the child process instead of spawning `codex`. */
  readonly spawn?: (config: AppServerConfig) => AppServerProcess;
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

function spawnCodexAppServer(config: AppServerConfig): AppServerProcess {
  const child = new Deno.Command("codex", {
    args: ["app-server", "--stdio"],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
    env: { ...Deno.env.toObject(), ...(config.env ?? {}) },
  }).spawn();
  child.stderr.cancel().catch(() => {});
  return {
    stdin: child.stdin,
    stdout: child.stdout,
    kill: () => {
      try {
        child.kill("SIGKILL");
      } catch {
        // Already gone.
      }
    },
  };
}

/** One warm app-server child, driving one turn at a time. */
export class AppServerSession {
  readonly #config: AppServerConfig;
  readonly #process: AppServerProcess;
  readonly #writer: WritableStreamDefaultWriter<Uint8Array>;
  readonly #encoder = new TextEncoder();
  readonly #pending = new Map<
    number,
    {
      resolve: (v: Record<string, unknown>) => void;
      reject: (e: Error) => void;
    }
  >();
  #nextId = 0;
  #closed = false;
  #closeError: Error | null = null;
  /** Live turns, keyed by thread id — one child can run several at once. */
  readonly #turns = new Map<
    string,
    {
      items: ThreadItem[];
      usage: TokenBreakdown;
      resolve: (turn: CompletedTurn) => void;
    }
  >();
  readonly #ready: Promise<void>;
  #spareThread: Promise<string>;

  constructor(config: AppServerConfig) {
    this.#config = config;
    this.#process = (config.spawn ?? spawnCodexAppServer)(config);
    this.#writer = this.#process.stdin.getWriter();
    this.#pump();
    // Prewarm: handshake and the first thread start NOW, not when a prompt
    // arrives (FR-ACCEPT.JUDGE-APPSERVER).
    this.#ready = this.#handshake();
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
    this.#writer.close().catch(() => {});
    this.#process.kill();
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

    const state = {
      items: [] as ThreadItem[],
      usage: EMPTY_TOKENS,
      resolve: (_: CompletedTurn) => {},
    };
    const completed = new Promise<CompletedTurn>((resolve, reject) => {
      state.resolve = resolve;
      signal?.addEventListener(
        "abort",
        () => reject(new Error("Codex app-server turn aborted")),
        { once: true },
      );
    });
    this.#turns.set(threadId, state);
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
    await this.#notify("initialized", {});
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

  #call(method: string, params: unknown): Promise<Record<string, unknown>> {
    if (this.#closeError) return Promise.reject(this.#closeError);
    const id = ++this.#nextId;
    const promise = new Promise<Record<string, unknown>>((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
    });
    this.#write({ jsonrpc: "2.0", id, method, params }).catch((e) =>
      this.#failAll(e instanceof Error ? e : new Error(String(e)))
    );
    return promise;
  }

  #notify(method: string, params: unknown): Promise<void> {
    return this.#write({ jsonrpc: "2.0", method, params });
  }

  #write(message: unknown): Promise<void> {
    return this.#writer.write(
      this.#encoder.encode(JSON.stringify(message) + "\n"),
    );
  }

  async #pump(): Promise<void> {
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      for await (const chunk of this.#process.stdout) {
        buffer += decoder.decode(chunk, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.trim() !== "") this.#dispatch(line);
        }
      }
      this.#failAll(new Error("Codex app-server closed its stream"));
    } catch (e) {
      this.#failAll(e instanceof Error ? e : new Error(String(e)));
    }
  }

  #dispatch(line: string): void {
    let message: Record<string, unknown>;
    try {
      message = JSON.parse(line) as Record<string, unknown>;
    } catch {
      // Not a protocol frame (a stray log line) — ignore it rather than
      // killing a live turn over unparsable noise.
      return;
    }
    if (message.method === "item/completed") {
      const params = message.params as
        | { threadId?: string; item?: ThreadItem }
        | undefined;
      const turn = params?.threadId
        ? this.#turns.get(params.threadId)
        : undefined;
      if (turn && params?.item) turn.items.push(params.item);
      return;
    }
    // What the turn cost (FR-ACCEPT.TOKEN-USAGE). `tokenUsage.total` is
    // cumulative over the THREAD, and a thread here runs exactly one turn, so
    // the latest frame is that turn's bill. Frames arrive before
    // `turn/completed`, which is what makes the value readable by the caller.
    if (message.method === "thread/tokenUsage/updated") {
      const params = message.params as
        | { threadId?: string; tokenUsage?: { total?: unknown } }
        | undefined;
      const turn = params?.threadId
        ? this.#turns.get(params.threadId)
        : undefined;
      const total = params?.tokenUsage?.total;
      if (turn && total && typeof total === "object") {
        turn.usage = tokensFromAppServer(total as Record<string, never>);
      }
      return;
    }
    if (message.method === "turn/completed") {
      const params = message.params as
        | { threadId?: string; turn?: CompletedTurn }
        | undefined;
      const turn = params?.threadId
        ? this.#turns.get(params.threadId)
        : undefined;
      if (turn && params?.turn) turn.resolve(params.turn);
      return;
    }
    const id = message.id;
    if (typeof id !== "number") return;
    const waiter = this.#pending.get(id);
    if (!waiter) return;
    this.#pending.delete(id);
    if (message.error) {
      const err = message.error as { message?: string };
      waiter.reject(
        new Error(
          `Codex app-server error: ${
            err.message ?? JSON.stringify(message.error)
          }`,
        ),
      );
      return;
    }
    waiter.resolve((message.result ?? {}) as Record<string, unknown>);
  }

  #failAll(error: Error): void {
    this.#closeError ??= error;
    for (const [, waiter] of this.#pending) waiter.reject(error);
    this.#pending.clear();
  }
}
