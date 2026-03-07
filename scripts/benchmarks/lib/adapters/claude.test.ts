import { assertEquals } from "@std/assert";
import { ClaudeAdapter } from "./claude.ts";
import { join } from "@std/path";
import { existsSync } from "@std/fs";

const adapter = new ClaudeAdapter();

Deno.test("ClaudeAdapter - properties", () => {
  assertEquals(adapter.ide, "claude");
  assertEquals(adapter.configDir, ".claude");
  assertEquals(adapter.command, "claude");
});

Deno.test("ClaudeAdapter - buildArgs initial prompt", () => {
  const args = adapter.buildArgs({
    model: "sonnet",
    workspace: "/tmp/sandbox",
    prompt: "say hello",
  });
  assertEquals(args, [
    "-p",
    "--model",
    "sonnet",
    "--output-format",
    "json",
    "--permission-mode",
    "bypassPermissions",
    "say hello",
  ]);
});

Deno.test("ClaudeAdapter - buildArgs with resume", () => {
  const args = adapter.buildArgs({
    model: "opus",
    workspace: "/tmp/sandbox",
    prompt: "continue task",
    sessionId: "61417c7a-03e5-428a-b68a-be085247f617",
  });
  assertEquals(args, [
    "-p",
    "--model",
    "opus",
    "--output-format",
    "json",
    "--permission-mode",
    "bypassPermissions",
    "--resume",
    "61417c7a-03e5-428a-b68a-be085247f617",
    "continue task",
  ]);
});

Deno.test("ClaudeAdapter - buildArgs empty prompt", () => {
  const args = adapter.buildArgs({
    model: "sonnet",
    workspace: "/tmp/sandbox",
    prompt: "",
  });
  assertEquals(args, [
    "-p",
    "--model",
    "sonnet",
    "--output-format",
    "json",
    "--permission-mode",
    "bypassPermissions",
  ]);
});

// Real captured output from claude -p --output-format json
const REAL_CLAUDE_OUTPUT =
  `[{"type":"system","subtype":"init","cwd":"/private/tmp","session_id":"61417c7a-03e5-428a-b68a-be085247f617","tools":["Bash","Read"],"model":"claude-sonnet-4-6"},{"type":"assistant","message":{"model":"claude-sonnet-4-6","content":[{"type":"text","text":"BANANA"}],"usage":{"input_tokens":3,"output_tokens":5}},"session_id":"61417c7a-03e5-428a-b68a-be085247f617"},{"type":"result","subtype":"success","is_error":false,"duration_ms":978,"result":"BANANA","session_id":"61417c7a-03e5-428a-b68a-be085247f617","total_cost_usd":0.0399525,"usage":{"input_tokens":3,"output_tokens":5}}]`;

Deno.test("ClaudeAdapter - parseOutput real success output", () => {
  const parsed = adapter.parseOutput(REAL_CLAUDE_OUTPUT);
  assertEquals(parsed.sessionId, "61417c7a-03e5-428a-b68a-be085247f617");
  assertEquals(parsed.result, "BANANA");
  assertEquals(parsed.subtype, "success");
});

Deno.test("ClaudeAdapter - parseOutput extracts from result event", () => {
  const output =
    `[{"type":"result","subtype":"success","result":"Hello World","session_id":"sess-1","total_cost_usd":0.01}]`;
  const parsed = adapter.parseOutput(output);
  assertEquals(parsed.sessionId, "sess-1");
  assertEquals(parsed.result, "Hello World");
  assertEquals(parsed.subtype, "success");
});

Deno.test("ClaudeAdapter - parseOutput input_required", () => {
  const output =
    `[{"type":"result","subtype":"input_required","result":"What should I do?","session_id":"sess-2"}]`;
  const parsed = adapter.parseOutput(output);
  assertEquals(parsed.sessionId, "sess-2");
  assertEquals(parsed.subtype, "input_required");
});

Deno.test("ClaudeAdapter - parseOutput no valid JSON", () => {
  const parsed = adapter.parseOutput("just plain text without json");
  assertEquals(parsed.sessionId, null);
  assertEquals(parsed.result, null);
  assertEquals(parsed.subtype, null);
});

Deno.test("ClaudeAdapter - parseOutput extracts session_id from init event", () => {
  // Even if result event is missing, session_id from init should be captured
  const output =
    `[{"type":"system","subtype":"init","session_id":"from-init"},{"type":"assistant","message":{"content":[{"type":"text","text":"hi"}]}}]`;
  const parsed = adapter.parseOutput(output);
  assertEquals(parsed.sessionId, "from-init");
});

Deno.test("ClaudeAdapter - setupMocks creates settings.local.json hooks", async () => {
  const tmpDir = await Deno.makeTempDir();
  const sandboxPath = join(tmpDir, "sandbox");
  await Deno.mkdir(sandboxPath, { recursive: true });

  await adapter.setupMocks(sandboxPath, {
    "gh": "PR Created #42",
  });

  // Claude uses .claude/settings.local.json for hooks
  const settingsPath = join(sandboxPath, ".claude", "settings.local.json");
  assertEquals(existsSync(settingsPath), true);

  const settings = JSON.parse(await Deno.readTextFile(settingsPath));
  assertEquals(Array.isArray(settings.hooks?.preToolUse), true);
  assertEquals(settings.hooks.preToolUse.length, 1);
  assertEquals(settings.hooks.preToolUse[0].matcher, "Bash(gh:*)");

  // Verify hook script exists
  const hooksDir = join(sandboxPath, ".claude", "hooks");
  assertEquals(existsSync(join(hooksDir, "mock-gh.sh")), true);

  await Deno.remove(tmpDir, { recursive: true });
});

Deno.test("ClaudeAdapter - setupMocks with empty mocks does nothing", async () => {
  const tmpDir = await Deno.makeTempDir();
  await adapter.setupMocks(tmpDir, {});
  assertEquals(existsSync(join(tmpDir, ".claude")), false);
  await Deno.remove(tmpDir, { recursive: true });
});
