import { assertEquals } from "@std/assert";
import { CursorAdapter } from "./cursor.ts";
import { join } from "@std/path";
import { existsSync } from "@std/fs";

const adapter = new CursorAdapter();

Deno.test("CursorAdapter - properties", () => {
  assertEquals(adapter.ide, "cursor");
  assertEquals(adapter.configDir, ".cursor");
  assertEquals(adapter.command, "cursor-agent");
});

Deno.test("CursorAdapter - buildArgs initial prompt", () => {
  const args = adapter.buildArgs({
    model: "gpt-5",
    workspace: "/tmp/sandbox",
    prompt: "say hello",
  });
  assertEquals(args, [
    "--model",
    "gpt-5",
    "--workspace",
    "/tmp/sandbox",
    "--force",
    "--approve-mcps",
    "--print",
    "--output-format",
    "json",
    "say hello",
  ]);
});

Deno.test("CursorAdapter - buildArgs with resume", () => {
  const args = adapter.buildArgs({
    model: "gpt-5",
    workspace: "/tmp/sandbox",
    prompt: "continue",
    sessionId: "abc-123",
  });
  assertEquals(args, [
    "--model",
    "gpt-5",
    "--workspace",
    "/tmp/sandbox",
    "--force",
    "--approve-mcps",
    "--print",
    "--output-format",
    "json",
    "--resume",
    "abc-123",
    "continue",
  ]);
});

Deno.test("CursorAdapter - buildArgs empty prompt", () => {
  const args = adapter.buildArgs({
    model: "gpt-5",
    workspace: "/tmp/sandbox",
    prompt: "",
  });
  // No prompt appended when empty
  assertEquals(args, [
    "--model",
    "gpt-5",
    "--workspace",
    "/tmp/sandbox",
    "--force",
    "--approve-mcps",
    "--print",
    "--output-format",
    "json",
  ]);
});

Deno.test("CursorAdapter - parseOutput success", () => {
  const stdout =
    `Some log output\n{"type":"result","subtype":"success","result":"Hello World","session_id":"sess-1"}\n`;
  const parsed = adapter.parseOutput(stdout);
  assertEquals(parsed.sessionId, "sess-1");
  assertEquals(parsed.result, "Hello World");
  assertEquals(parsed.subtype, "success");
});

Deno.test("CursorAdapter - parseOutput with nested result object", () => {
  const stdout =
    `{"type":"result","subtype":"success","result":{"subtype":"text","result":"nested text"},"session_id":"sess-2"}`;
  const parsed = adapter.parseOutput(stdout);
  assertEquals(parsed.sessionId, "sess-2");
  assertEquals(parsed.result, "nested text");
  assertEquals(parsed.subtype, "success");
});

Deno.test("CursorAdapter - parseOutput input_required", () => {
  const stdout =
    `{"subtype":"input_required","result":"What color?","session_id":"sess-3"}`;
  const parsed = adapter.parseOutput(stdout);
  assertEquals(parsed.sessionId, "sess-3");
  assertEquals(parsed.subtype, "input_required");
  assertEquals(parsed.result, "What color?");
});

Deno.test("CursorAdapter - parseOutput no JSON", () => {
  const parsed = adapter.parseOutput("just plain text");
  assertEquals(parsed.sessionId, null);
  assertEquals(parsed.result, null);
  assertEquals(parsed.subtype, null);
});

Deno.test("CursorAdapter - parseOutput multiple JSON objects takes last", () => {
  const stdout =
    `{"session_id":"first","result":"one","subtype":"success"}\n{"session_id":"second","result":"two","subtype":"success"}`;
  const parsed = adapter.parseOutput(stdout);
  assertEquals(parsed.sessionId, "second");
  assertEquals(parsed.result, "two");
});

Deno.test("CursorAdapter - setupMocks creates hooks", async () => {
  const tmpDir = await Deno.makeTempDir();
  const sandboxPath = join(tmpDir, "sandbox");
  await Deno.mkdir(sandboxPath, { recursive: true });

  await adapter.setupMocks(sandboxPath, {
    "gh": "PR Created #42",
    "npm": "added 10 packages",
  });

  // Verify hooks directory created
  const hooksDir = join(sandboxPath, ".cursor", "hooks");
  assertEquals(existsSync(hooksDir), true);

  // Verify hook scripts exist
  assertEquals(existsSync(join(hooksDir, "mock-gh.sh")), true);
  assertEquals(existsSync(join(hooksDir, "mock-npm.sh")), true);

  // Verify hooks.json
  const hooksConfig = JSON.parse(
    await Deno.readTextFile(join(sandboxPath, ".cursor", "hooks.json")),
  );
  assertEquals(hooksConfig.version, 1);
  assertEquals(hooksConfig.hooks.beforeShellExecution.length, 2);

  // Verify hook script content
  const ghScript = await Deno.readTextFile(join(hooksDir, "mock-gh.sh"));
  assertEquals(ghScript.includes("PR Created #42"), true);

  await Deno.remove(tmpDir, { recursive: true });
});

Deno.test("CursorAdapter - setupMocks with empty mocks does nothing", async () => {
  const tmpDir = await Deno.makeTempDir();
  await adapter.setupMocks(tmpDir, {});
  assertEquals(existsSync(join(tmpDir, ".cursor")), false);
  await Deno.remove(tmpDir, { recursive: true });
});
