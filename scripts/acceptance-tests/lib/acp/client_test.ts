/**
 * AcpClient tests (FR-ACCEPT.ACP), driven by the real local `stub_agent.ts` ACP
 * server over stdio — no LLM, deterministic, offline. Per project rules these
 * use a real implementation (the stub speaks the official protocol), not a mock
 * of our own code.
 */
import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { fromFileUrl, join } from "@std/path";
import { AcpClient } from "./client.ts";

const STUB = fromFileUrl(new URL("./stub_agent.ts", import.meta.url));

function spawnStub(): Deno.ChildProcess {
  return new Deno.Command("deno", {
    args: ["run", "-A", STUB],
    stdin: "piped",
    stdout: "piped",
    stderr: "null",
  }).spawn();
}

async function shutdown(child: Deno.ChildProcess): Promise<void> {
  try {
    child.kill("SIGKILL");
  } catch { /* already gone */ }
  await child.status;
}

Deno.test({
  name: "prompt turn yields assistant text and tool-call updates",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const cwd = await Deno.makeTempDir({ prefix: "acp-test-" });
    const child = spawnStub();
    const client = AcpClient.fromChild(child);
    try {
      const init = await client.initialize();
      assertEquals(init.protocolVersion, 1);

      const sessionId = await client.newSession(cwd);
      assert(sessionId.startsWith("stub-session-"));

      const out = await client.prompt(sessionId, "hello world");
      assertEquals(out.subtype, "success");
      assertStringIncludes(out.assistantText ?? "", "echo: hello world");
      assertEquals(out.sessionId, sessionId);
    } finally {
      await shutdown(child);
    }
  },
});

Deno.test({
  name: "tool permission auto-allowed, real command runs",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const cwd = await Deno.makeTempDir({ prefix: "acp-test-" });
    const child = spawnStub();
    const client = AcpClient.fromChild(child);
    try {
      await client.initialize();
      const sessionId = await client.newSession(cwd);
      const out = await client.prompt(
        sessionId,
        "run it [[TOOL:echo hello]]",
      );

      // Client auto-allows permission (bypassPermissions equivalent), so the
      // stub's tool runs and writes the sentinel. Mocking is done out-of-band
      // by PATH-shadowing (mock_bin.ts), not by denying here.
      const sentinel = join(cwd, "tool-ran.txt");
      await Deno.lstat(sentinel); // throws if the tool was NOT allowed to run
      assertStringIncludes(out.assistantText ?? "", "ran:");
    } finally {
      await shutdown(child);
    }
  },
});

Deno.test({
  name: "connection drop maps to exit_code_zero failure verdict",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const cwd = await Deno.makeTempDir({ prefix: "acp-test-" });
    const child = spawnStub();
    const client = AcpClient.fromChild(child);
    try {
      await client.initialize();
      const sessionId = await client.newSession(cwd);
      // Stub exits(1) mid-turn; prompt must resolve to a failure verdict, NOT
      // throw an unhandled rejection.
      const out = await client.prompt(sessionId, "do it [[CRASH]]");
      assertEquals(out.subtype, "error");
      assertEquals(out.result, null);
      assert(
        typeof (out.raw as { acpError?: string }).acpError === "string",
        "failure verdict carries an acpError reason",
      );
    } finally {
      await shutdown(child);
    }
  },
});
