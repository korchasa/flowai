/**
 * AcpClient tests (FR-ACCEPT.ACP), driven by the real local `stub_agent.ts` ACP
 * server over stdio — no LLM, deterministic, offline. Per project rules these
 * use a real implementation (the stub speaks the official protocol), not a mock
 * of our own code.
 */
import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { fromFileUrl, join } from "@std/path";
import {
  AcpClient,
  confineWritePath,
  flattenRawOutput,
  flattenToolCallContent,
  resolveSessionPath,
} from "./client.ts";

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

/**
 * `rawOutput` vs `content` on a tool call: claude-code-acp fills `content` for
 * a subagent dispatch with an echo of the PROMPT, so reading it first rendered
 * `-> returned: <the original request>` in the trace and a judge concluded the
 * scout had echoed its input (2026-08-13, plan-uses-scout-findings).
 */
Deno.test("flattenRawOutput reads a string return value", () => {
  assertEquals(flattenRawOutput("agentId: a1"), "agentId: a1");
});

Deno.test("flattenRawOutput reads content blocks nested in an object return value", () => {
  assertEquals(
    flattenRawOutput({ content: [{ type: "text", text: "## Surface" }] }),
    "## Surface",
  );
});

Deno.test("flattenRawOutput falls back to JSON for a shape it does not recognise, rather than dropping the result", () => {
  assertEquals(flattenRawOutput({ agentId: "a1" }), '{"agentId":"a1"}');
});

Deno.test("flattenRawOutput treats empty and absent alike so the caller can fall through to content", () => {
  assertEquals(flattenRawOutput(undefined), undefined);
  assertEquals(flattenRawOutput(null), undefined);
  assertEquals(flattenRawOutput(""), undefined);
  assertEquals(flattenRawOutput({}), undefined);
});

/**
 * Sandbox escape (2026-08-13). The ACP spec says client-fs paths are absolute,
 * but claude-code-acp forwards the model's `file_path` verbatim, so a relative
 * one arrives as-is. `Deno.writeTextFile` then resolved it against the RUNNER's
 * cwd — this repository — and a `plan-writes-task-new-frontmatter` sandbox wrote
 * `documents/tasks/2026/08/add-healthz-endpoint.md` into the real tree; other
 * runs read and rewrote the real `.github/workflows/ci.yml`, `documents/index.md`
 * and two `scripts/check-*.ts`, stripping SALP anchors. A write to the real
 * `documents/requirements.md` was attempted and missed by luck.
 */
Deno.test("resolveSessionPath anchors a relative client-fs path to the sandbox, not the runner cwd", () => {
  assertEquals(
    resolveSessionPath("/tmp/run-1/sandbox", "documents/tasks/x.md"),
    "/tmp/run-1/sandbox/documents/tasks/x.md",
  );
});

Deno.test("resolveSessionPath keeps an absolute path as given", () => {
  assertEquals(
    resolveSessionPath(
      "/tmp/run-1/sandbox",
      "/tmp/run-1/bench-home/.claude/settings.json",
    ),
    "/tmp/run-1/bench-home/.claude/settings.json",
  );
});

Deno.test("resolveSessionPath refuses to guess when no session cwd is known", () => {
  assertThrows(
    () => resolveSessionPath(undefined, "documents/x.md"),
    Error,
    "no session cwd",
  );
});

Deno.test("confineWritePath accepts a write inside the sandbox", () => {
  assertEquals(
    confineWritePath("/tmp/run-1/sandbox", "documents/x.md"),
    "/tmp/run-1/sandbox/documents/x.md",
  );
});

Deno.test("confineWritePath rejects a write that escapes the sandbox", () => {
  assertThrows(
    () =>
      confineWritePath(
        "/tmp/run-1/sandbox",
        "/Users/korchasa/www/flowai/flowai/documents/index.md",
      ),
    Error,
    "outside the sandbox",
  );
  assertThrows(
    () => confineWritePath("/tmp/run-1/sandbox", "../../../documents/index.md"),
    Error,
    "outside the sandbox",
  );
});

Deno.test("flattenToolCallContent joins text blocks and ignores blocks without text", () => {
  assertEquals(
    flattenToolCallContent([
      { type: "text", text: "one" },
      { type: "image" },
      { content: { type: "text", text: "two" } },
    ]),
    "one\ntwo",
  );
  assertEquals(flattenToolCallContent(undefined), undefined);
});
