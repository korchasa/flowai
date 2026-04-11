import { assertEquals } from "@std/assert";
import { CodexAdapter } from "./codex.ts";
import { join } from "@std/path";
import { existsSync } from "@std/fs";

const adapter = new CodexAdapter();

Deno.test("CodexAdapter - properties", () => {
  assertEquals(adapter.ide, "codex");
  assertEquals(adapter.configDir, ".codex");
  assertEquals(adapter.command, "codex");
  assertEquals(adapter.outputFormat, "stream-json");
});

Deno.test("CodexAdapter - buildArgs initial prompt", () => {
  const args = adapter.buildArgs({
    model: "gpt-5.3-codex",
    workspace: "/tmp/sandbox",
    prompt: "say hello",
  });
  assertEquals(args, [
    "exec",
    "--json",
    "--cd",
    "/tmp/sandbox",
    "--skip-git-repo-check",
    "--dangerously-bypass-approvals-and-sandbox",
    "--model",
    "gpt-5.3-codex",
    "say hello",
  ]);
});

Deno.test("CodexAdapter - buildArgs with resume switches to nested subcommand", () => {
  const args = adapter.buildArgs({
    model: "gpt-5.4",
    workspace: "/tmp/sandbox",
    prompt: "continue task",
    sessionId: "019d7d56-af20-7e02-81a6-69cfa0ec1ee3",
  });
  // Resume uses `codex exec resume [SESSION_ID]` — workspace not passed on
  // resume (inherited from the persisted session).
  assertEquals(args, [
    "exec",
    "resume",
    "--json",
    "--skip-git-repo-check",
    "--dangerously-bypass-approvals-and-sandbox",
    "--model",
    "gpt-5.4",
    "019d7d56-af20-7e02-81a6-69cfa0ec1ee3",
    "continue task",
  ]);
});

Deno.test("CodexAdapter - buildArgs empty prompt omits trailing prompt arg", () => {
  const args = adapter.buildArgs({
    model: "gpt-5.4-mini",
    workspace: "/tmp/sandbox",
    prompt: "",
  });
  assertEquals(args, [
    "exec",
    "--json",
    "--cd",
    "/tmp/sandbox",
    "--skip-git-repo-check",
    "--dangerously-bypass-approvals-and-sandbox",
    "--model",
    "gpt-5.4-mini",
  ]);
});

// Real captured output from `codex exec --json --skip-git-repo-check "say hi"`
// (edited for brevity; structure matches codex-cli 0.118.0).
const REAL_CODEX_NDJSON =
  `{"type":"thread.started","thread_id":"019d7d56-af20-7e02-81a6-69cfa0ec1ee3"}
{"type":"turn.started"}
{"type":"item.started","item":{"id":"item_0","type":"agent_message","text":""}}
{"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"hello!"}}
{"type":"turn.completed","usage":{"input_tokens":42,"output_tokens":5}}`;

Deno.test("CodexAdapter - parseOutput extracts session + final agent_message", () => {
  const parsed = adapter.parseOutput(REAL_CODEX_NDJSON);
  assertEquals(parsed.sessionId, "019d7d56-af20-7e02-81a6-69cfa0ec1ee3");
  assertEquals(parsed.result, "hello!");
  assertEquals(parsed.subtype, "success");
});

Deno.test("CodexAdapter - parseOutput picks the last agent_message when multiple present", () => {
  const ndjson = `{"type":"thread.started","thread_id":"sess-1"}
{"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"thinking..."}}
{"type":"item.completed","item":{"id":"item_1","type":"agent_message","text":"final answer"}}
{"type":"turn.completed"}`;
  const parsed = adapter.parseOutput(ndjson);
  assertEquals(parsed.sessionId, "sess-1");
  assertEquals(parsed.result, "final answer");
  assertEquals(parsed.assistantText, "thinking...\n\nfinal answer");
});

Deno.test("CodexAdapter - parseOutput marks error subtype on turn.failed", () => {
  const ndjson = `{"type":"thread.started","thread_id":"sess-err"}
{"type":"turn.failed","error":{"message":"rate limited"}}`;
  const parsed = adapter.parseOutput(ndjson);
  assertEquals(parsed.sessionId, "sess-err");
  assertEquals(parsed.subtype, "error");
});

Deno.test("CodexAdapter - parseOutput skips malformed lines", () => {
  const ndjson = `not json
{"type":"thread.started","thread_id":"sess-2"}
garbage
{"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"ok"}}
{"type":"turn.completed"}`;
  const parsed = adapter.parseOutput(ndjson);
  assertEquals(parsed.sessionId, "sess-2");
  assertEquals(parsed.result, "ok");
});

Deno.test("CodexAdapter - parseOutput no valid JSON returns empty", () => {
  const parsed = adapter.parseOutput("just plain text");
  assertEquals(parsed.sessionId, null);
  assertEquals(parsed.result, null);
  assertEquals(parsed.subtype, null);
});

Deno.test("CodexAdapter - setupMocks writes hooks.json with PreToolUse array", async () => {
  const tmpDir = await Deno.makeTempDir();
  const sandboxPath = join(tmpDir, "sandbox");
  await Deno.mkdir(sandboxPath, { recursive: true });

  await adapter.setupMocks(sandboxPath, { gh: "PR created #42" });

  const hooksPath = join(sandboxPath, ".codex", "hooks.json");
  assertEquals(existsSync(hooksPath), true);
  const parsed = JSON.parse(await Deno.readTextFile(hooksPath));
  assertEquals(Array.isArray(parsed.hooks?.PreToolUse), true);
  assertEquals(parsed.hooks.PreToolUse.length, 1);
  assertEquals(parsed.hooks.PreToolUse[0].matcher, "Bash(gh:*)");
  assertEquals(
    parsed.hooks.PreToolUse[0].hooks[0].command,
    ".codex/hooks/mock-gh.sh",
  );

  const scriptPath = join(sandboxPath, ".codex", "hooks", "mock-gh.sh");
  assertEquals(existsSync(scriptPath), true);

  await Deno.remove(tmpDir, { recursive: true });
});

Deno.test("CodexAdapter - setupMocks with empty mocks does nothing", async () => {
  const tmpDir = await Deno.makeTempDir();
  await adapter.setupMocks(tmpDir, {});
  assertEquals(existsSync(join(tmpDir, ".codex")), false);
  await Deno.remove(tmpDir, { recursive: true });
});

Deno.test("CodexAdapter - getEnv clears CODEX_THREAD_ID", () => {
  assertEquals(adapter.getEnv(), { CODEX_THREAD_ID: "" });
});
