/**
 * A protocol-speaking stand-in for `codex app-server --listen stdio://`.
 *
 * Test-only, and deliberately NOT a mock of our own code: it replaces the
 * EXTERNAL process, so the ai-ide-cli `CodexAppServerClient` and
 * `codexChatCompletion` are exercised end to end — spawn, framing,
 * request/response correlation, the `turn/completed` notification — without an
 * LLM call.
 *
 * The client spawns a binary by path, so the fake is a real process:
 * {@link fakeAppServerBinary} writes a small shell launcher that runs this file
 * under the current Deno with its options in `FAKE_APPSERVER_OPTS` and appends
 * every client frame it reads to `FAKE_APPSERVER_LOG` (one JSON per line).
 */
import { join } from "@std/path";

export interface FakeAppServerOptions {
  /** Turn status to report. Defaults to `completed`. */
  status?: string;
  /** `error.message` on the reported turn. */
  errorMessage?: string;
  /** Exit instead of answering the handshake. */
  failHandshake?: boolean;
  /** Hold the answer this long, so overlapping turns are really in flight. */
  turnDelayMs?: number;
  /**
   * Acknowledge `turn/start`, then exit before the turn ends — a child that
   * dies mid-turn, after the request itself already succeeded.
   */
  closeAfterTurnAck?: boolean;
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
  /** Path to pass as the client's `binary`. */
  readonly binary: string;
  /** Every client frame the fake received so far, in order, across spawns. */
  seen(): Promise<Record<string, unknown>[]>;
  /** How many times the binary was started. */
  spawns(): Promise<number>;
  /** Remove the launcher and its log. */
  cleanup(): Promise<void>;
}

const SELF = new URL(import.meta.url).pathname;

/** Single-quote a value for `/bin/sh`. */
function shQuote(s: string): string {
  return `'${s.replaceAll("'", `'\\''`)}'`;
}

/** Write a launcher for one fake app-server configuration. */
export async function fakeAppServerBinary(
  opts: FakeAppServerOptions = {},
): Promise<FakeAppServer> {
  const dir = await Deno.makeTempDir({ prefix: "fake-appserver-" });
  const binary = join(dir, "codex");
  const log = join(dir, "frames.jsonl");
  const starts = join(dir, "spawns.log");
  await Deno.writeTextFile(
    binary,
    [
      "#!/bin/sh",
      `echo x >> ${shQuote(starts)}`,
      `FAKE_APPSERVER_OPTS=${shQuote(JSON.stringify(opts))} \\`,
      `FAKE_APPSERVER_LOG=${shQuote(log)} \\`,
      `exec ${shQuote(Deno.execPath())} run -A ${shQuote(SELF)} "$@"`,
      "",
    ].join("\n"),
  );
  await Deno.chmod(binary, 0o755);
  const lines = async (path: string) =>
    (await Deno.readTextFile(path).catch(() => "")).split("\n").filter(
      Boolean,
    );
  return {
    binary,
    seen: async () => (await lines(log)).map((l) => JSON.parse(l)),
    spawns: async () => (await lines(starts)).length,
    cleanup: () => Deno.remove(dir, { recursive: true }).catch(() => {}),
  };
}

async function serve(opts: FakeAppServerOptions, log: string): Promise<void> {
  const encoder = new TextEncoder();
  let threads = 0;
  const send = (msg: unknown) =>
    Deno.stdout.write(encoder.encode(JSON.stringify(msg) + "\n"));

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

  let buffer = "";
  const decoder = new TextDecoder();
  for await (const chunk of Deno.stdin.readable) {
    buffer += decoder.decode(chunk, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl);
      buffer = buffer.slice(nl + 1);
      if (line.trim() === "") continue;
      await Deno.writeTextFile(log, line + "\n", { append: true });
      const msg = JSON.parse(line) as Record<string, unknown>;
      if (opts.failHandshake) Deno.exit(1);
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
        if (opts.closeAfterTurnAck) {
          await send({ jsonrpc: "2.0", id, result: {} });
          Deno.exit(1);
        }
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
}

if (import.meta.main) {
  await serve(
    JSON.parse(Deno.env.get("FAKE_APPSERVER_OPTS") ?? "{}"),
    Deno.env.get("FAKE_APPSERVER_LOG") ?? "/dev/null",
  );
}
