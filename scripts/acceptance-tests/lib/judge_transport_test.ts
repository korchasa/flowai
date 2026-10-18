/**
 * Judge transport dispatch (FR-ACCEPT.JUDGE-ACP): a claude model goes over the
 * claude ACP bridge, every other model over the codex app-server.
 */
import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
  chatCompletion,
  closeJudgeSessions,
  judgeTransportFor,
} from "./judge_transport.ts";

const STUB = fromFileUrl(new URL("./acp/stub_agent.ts", import.meta.url));

Deno.test("judgeTransportFor: claude models go to acp, others to codex", () => {
  assertEquals(judgeTransportFor("claude-sonnet-5-5"), "claude-acp");
  assertEquals(judgeTransportFor("Claude-Opus-5-5"), "claude-acp");
  assertEquals(judgeTransportFor("gpt-5.6-sol"), "codex-appserver");
  assertEquals(judgeTransportFor("o4-mini"), "codex-appserver");
});

Deno.test({
  name: "chatCompletion: a claude model reaches the ACP bridge",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const cwd = await Deno.makeTempDir({ prefix: "judge-transport-test-" });
    try {
      const res = await chatCompletion(
        [{ role: "user", content: "[[META]]" }],
        {
          model: "claude-test-model",
          cwd,
          launch: { command: Deno.execPath(), args: ["run", "-A", STUB] },
        },
      );
      assertEquals(JSON.parse(res.content).model, "claude-test-model");
    } finally {
      await closeJudgeSessions();
      await Deno.remove(cwd, { recursive: true });
    }
  },
});
