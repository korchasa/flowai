/**
 * A protocol-speaking stand-in for `codex app-server --stdio`.
 *
 * Test-only, and deliberately NOT a mock of our own code: it replaces the
 * EXTERNAL process, so `AppServerSession` and `codexChatCompletion` are
 * exercised end to end — framing, request/response correlation, the
 * `turn/completed` notification — without an LLM call.
 */
import type { AppServerProcess } from "../appserver_client.ts";

export interface FakeAppServerOptions {
  /** Turn status to report. Defaults to `completed`. */
  status?: string;
  /** `error.message` on the reported turn. */
  errorMessage?: string;
  /** Close the stream instead of answering the handshake. */
  failHandshake?: boolean;
  /** Hold the answer this long, so overlapping turns are really in flight. */
  turnDelayMs?: number;
  /**
   * Report this `TokenUsageBreakdown` as the thread's cumulative total before
   * the turn ends (FR-ACCEPT.TOKEN-USAGE). Omit to send no usage frame at all,
   * which is how an older app-server behaves.
   */
  tokenUsage?: {
    inputTokens: number;
    cachedInputTokens: number;
    outputTokens: number;
    reasoningOutputTokens: number;
    totalTokens: number;
  };
}

export interface FakeAppServer {
  readonly process: AppServerProcess;
  /** Every client frame this fake received, in order. */
  readonly seen: Record<string, unknown>[];
}

/** Build one fake app-server child. */
export function fakeAppServer(opts: FakeAppServerOptions = {}): FakeAppServer {
  const seen: Record<string, unknown>[] = [];
  const toClient = new TransformStream<Uint8Array, Uint8Array>();
  const fromClient = new TransformStream<Uint8Array, Uint8Array>();
  const encoder = new TextEncoder();
  const out = toClient.writable.getWriter();
  let threads = 0;

  const send = (msg: unknown) =>
    out.write(encoder.encode(JSON.stringify(msg) + "\n"));

  async function answerTurn(
    id: unknown,
    params: { threadId: string; input: { text: string }[] },
    status: string,
  ) {
    if (opts.turnDelayMs) {
      await new Promise((r) => setTimeout(r, opts.turnDelayMs));
    }
    if (status === "completed") {
      // Real codex reports the answer here; the turn payload that follows
      // carries `items: []` / `itemsView: "notLoaded"`.
      await send({
        jsonrpc: "2.0",
        method: "item/completed",
        params: {
          threadId: params.threadId,
          item: {
            type: "agentMessage",
            text: `echo:${params.input[0].text}`,
          },
        },
      });
    }
    if (opts.tokenUsage) {
      // Real codex sends this before the turn ends, and reports the thread's
      // cumulative total next to the last turn's.
      await send({
        jsonrpc: "2.0",
        method: "thread/tokenUsage/updated",
        params: {
          threadId: params.threadId,
          turnId: `turn-${params.threadId}`,
          tokenUsage: {
            last: opts.tokenUsage,
            total: opts.tokenUsage,
            modelContextWindow: 258400,
          },
        },
      });
    }
    await send({
      jsonrpc: "2.0",
      method: "turn/completed",
      params: {
        threadId: params.threadId,
        turn: {
          id: `turn-${params.threadId}`,
          status,
          items: [],
          itemsView: "notLoaded",
          ...(opts.errorMessage
            ? { error: { message: opts.errorMessage } }
            : {}),
        },
      },
    });
    await send({ jsonrpc: "2.0", id, result: {} });
  }

  (async () => {
    let buffer = "";
    const decoder = new TextDecoder();
    for await (const chunk of fromClient.readable) {
      buffer += decoder.decode(chunk, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 1);
        if (line.trim() === "") continue;
        const msg = JSON.parse(line) as Record<string, unknown>;
        seen.push(msg);
        if (opts.failHandshake) {
          await out.close().catch(() => {});
          return;
        }
        const id = msg.id;
        if (msg.method === "initialize") {
          await send({ jsonrpc: "2.0", id, result: { userAgent: "fake" } });
        } else if (msg.method === "thread/start") {
          threads += 1;
          await send({
            jsonrpc: "2.0",
            id,
            result: { thread: { id: `thread-${threads}` } },
          });
        } else if (msg.method === "turn/start") {
          const params = msg.params as {
            threadId: string;
            input: { text: string }[];
          };
          const status = opts.status ?? "completed";
          if (opts.turnDelayMs) {
            // Answer out of band so a second turn/start is read meanwhile.
            void answerTurn(id, params, status);
            continue;
          }
          await answerTurn(id, params, status);
        }
      }
    }
  })();

  return {
    process: {
      stdin: fromClient.writable,
      stdout: toClient.readable,
      kill: () => {},
    },
    seen,
  };
}
