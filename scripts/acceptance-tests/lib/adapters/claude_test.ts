import { assert, assertEquals } from "@std/assert";
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
    "--verbose",
    "--model",
    "sonnet",
    "--output-format",
    "stream-json",
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
    "--verbose",
    "--model",
    "opus",
    "--output-format",
    "stream-json",
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
    "--verbose",
    "--model",
    "sonnet",
    "--output-format",
    "stream-json",
    "--permission-mode",
    "bypassPermissions",
  ]);
});

// Real captured output from claude -p --verbose --output-format stream-json (NDJSON)
const REAL_CLAUDE_NDJSON =
  `{"type":"system","subtype":"init","cwd":"/private/tmp","session_id":"61417c7a-03e5-428a-b68a-be085247f617","tools":["Bash","Read"],"model":"claude-sonnet-4-6"}
{"type":"assistant","message":{"model":"claude-sonnet-4-6","content":[{"type":"text","text":"BANANA"}],"usage":{"input_tokens":3,"output_tokens":5}},"session_id":"61417c7a-03e5-428a-b68a-be085247f617"}
{"type":"result","subtype":"success","is_error":false,"duration_ms":978,"result":"BANANA","session_id":"61417c7a-03e5-428a-b68a-be085247f617","total_cost_usd":0.0399525,"usage":{"input_tokens":3,"output_tokens":5}}`;

Deno.test("ClaudeAdapter - parseOutput NDJSON success output", () => {
  const parsed = adapter.parseOutput(REAL_CLAUDE_NDJSON);
  assertEquals(parsed.sessionId, "61417c7a-03e5-428a-b68a-be085247f617");
  assertEquals(parsed.result, "BANANA");
  assertEquals(parsed.subtype, "success");
});

Deno.test("ClaudeAdapter - parseOutput extracts from result event", () => {
  const output =
    `{"type":"result","subtype":"success","result":"Hello World","session_id":"sess-1","total_cost_usd":0.01}`;
  const parsed = adapter.parseOutput(output);
  assertEquals(parsed.sessionId, "sess-1");
  assertEquals(parsed.result, "Hello World");
  assertEquals(parsed.subtype, "success");
});

Deno.test("ClaudeAdapter - parseOutput input_required", () => {
  const output =
    `{"type":"result","subtype":"input_required","result":"What should I do?","session_id":"sess-2"}`;
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
  const output = `{"type":"system","subtype":"init","session_id":"from-init"}
{"type":"assistant","message":{"content":[{"type":"text","text":"hi"}]}}`;
  const parsed = adapter.parseOutput(output);
  assertEquals(parsed.sessionId, "from-init");
});

Deno.test("ClaudeAdapter - parseOutput partial NDJSON (timeout case)", () => {
  // On timeout, we may have partial output — init + some assistant events but no result
  const output = `{"type":"system","subtype":"init","session_id":"partial-sess"}
{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Read","input":{"file_path":"/tmp/foo.ts"}}]},"session_id":"partial-sess"}
{"type":"assistant","message":{"content":[{"type":"text","text":"Reading file..."}]},"session_id":"partial-sess"}`;
  const parsed = adapter.parseOutput(output);
  assertEquals(parsed.sessionId, "partial-sess");
  assertEquals(parsed.result, "Reading file...");
  assertEquals(parsed.subtype, null); // No result event = no subtype
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
  assertEquals(Array.isArray(settings.hooks?.PreToolUse), true);
  assertEquals(settings.hooks.PreToolUse.length, 1);
  // Matcher is now the broad `Bash` — the hook script itself filters
  // by tool name, so env-prefixed commands (e.g. `FOO=1 gh …`) match.
  assertEquals(settings.hooks.PreToolUse[0].matcher, "Bash");

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

/**
 * Integration-style check: run the generated hook script against
 * realistic PreToolUse JSON payloads and verify the script blocks the
 * call (non-empty stdout with `"decision": "block"`) only when the
 * first bare command word matches the mocked tool. This binds the
 * adapter's on-disk behaviour to the shapes Claude Code actually
 * sends, catching regressions that a JSON-structure-only test (above)
 * would miss — including the PascalCase casing bug that silenced
 * hooks for months.
 */
Deno.test(
  "ClaudeAdapter - setupMocks hook script matches env-prefixed and nested commands",
  async () => {
    const tmpDir = await Deno.makeTempDir();
    await adapter.setupMocks(tmpDir, {
      claude: "MOCK-CLAUDE-RESPONSE-0xdeadbeef",
      opencode: "MOCK-OPENCODE-RESPONSE-0xcafe",
    });

    const hookPath = join(tmpDir, ".claude", "hooks", "mock-claude.sh");
    assertEquals(existsSync(hookPath), true);

    // Each case: (command, shouldBlock, label).
    const cases: Array<[string, boolean, string]> = [
      ["claude -p hi --model sonnet", true, "plain claude"],
      [`CLAUDECODE="" claude -p hi`, true, "env-prefix"],
      ["FOO=1 BAR=2 claude -p hi", true, "multi-env"],
      [
        `( CLAUDECODE="" claude -p hi > /tmp/out 2>&1 ) &`,
        true,
        "subshell+background",
      ],
      [`$( CLAUDECODE="" claude -p hi )`, true, "command-substitution"],
      ["opencode run hi", false, "different tool"],
      ["cat /tmp/out", false, "unrelated cmd"],
      ["echo claude", false, "claude as arg, not command"],
    ];

    for (const [cmd, shouldBlock, label] of cases) {
      const payload = JSON.stringify({
        tool_name: "Bash",
        tool_input: { command: cmd },
      });
      const child = new Deno.Command("bash", {
        args: [hookPath],
        stdin: "piped",
        stdout: "piped",
        stderr: "piped",
      }).spawn();
      const writer = child.stdin.getWriter();
      await writer.write(new TextEncoder().encode(payload));
      await writer.close();
      const { stdout } = await child.output();
      const out = new TextDecoder().decode(stdout);

      const didBlock = out.includes(`"decision": "block"`) &&
        out.includes("MOCK-CLAUDE-RESPONSE-0xdeadbeef");
      assertEquals(
        didBlock,
        shouldBlock,
        `[${label}] cmd=${cmd} expected block=${shouldBlock}, got stdout=${
          JSON.stringify(
            out,
          )
        }`,
      );
    }

    await Deno.remove(tmpDir, { recursive: true });
  },
);

/**
 * FR-ACCEPT-ISOLATION — `prepareWorkspace` must build an isolated `$HOME`
 * with an EMPTY `.claude/skills/` directory so that user-level skill
 * installations at `~/.claude/skills/` cannot shadow sandbox-level skills
 * via Claude Code's Skill tool resolution path. The bench-home is a
 * sandbox subdirectory; the real `$HOME` is read for symlink targets but
 * `~/.claude/skills/` is deliberately NOT mirrored.
 */
Deno.test(
  "ClaudeAdapter - prepareWorkspace isolation: empty user-level skills dir",
  async () => {
    const tmpDir = await Deno.makeTempDir({ prefix: "iso-test-" });
    try {
      const sandboxPath = join(tmpDir, "sandbox");
      await Deno.mkdir(sandboxPath, { recursive: true });
      const env = await adapter.prepareWorkspace(sandboxPath);
      const benchHome = join(tmpDir, "bench-home");
      assertEquals(env.HOME, benchHome);

      // bench-home/.claude/skills must exist and be empty — this is the
      // "user-level skills" view that claude consults via $HOME, and the
      // emptiness is what kills the precedence-bug.
      const skillsDir = join(benchHome, ".claude", "skills");
      assert(existsSync(skillsDir), "bench-home skills dir must exist");
      const entries: string[] = [];
      for await (const entry of Deno.readDir(skillsDir)) {
        entries.push(entry.name);
      }
      assertEquals(
        entries,
        [],
        "bench-home `.claude/skills/` MUST be empty; non-empty means user-level skills will leak into the sandbox",
      );
    } finally {
      await Deno.remove(tmpDir, { recursive: true });
    }
  },
);

/**
 * FR-ACCEPT-ISOLATION — auth must keep working under the isolated `$HOME`.
 * On macOS, OAuth/Keychain reads need `~/Library/Keychains` and
 * `~/.local/share/claude` reachable from `$HOME`. The adapter symlinks
 * those paths into the bench-home if (and only if) they exist on the host.
 * On Linux/CI those paths may not exist, in which case the symlink is
 * skipped — the test asserts presence-iff-source-exists rather than
 * unconditional presence so it is portable.
 */
Deno.test(
  "ClaudeAdapter - prepareWorkspace isolation: auth-related symlinks track host",
  async () => {
    const tmpDir = await Deno.makeTempDir({ prefix: "iso-test-" });
    try {
      const sandboxPath = join(tmpDir, "sandbox");
      await Deno.mkdir(sandboxPath, { recursive: true });
      await adapter.prepareWorkspace(sandboxPath);
      const benchHome = join(tmpDir, "bench-home");
      const realHome = Deno.env.get("HOME");
      if (!realHome) return; // No HOME in env — adapter writes only the empty skills dir.

      for (const rel of ["Library/Keychains", ".local/share/claude"]) {
        const src = join(realHome, rel);
        const dst = join(benchHome, rel);
        let srcExists = false;
        try {
          await Deno.lstat(src);
          srcExists = true;
        } catch { /* not present on host */ }

        if (srcExists) {
          const lst = await Deno.lstat(dst);
          assert(
            lst.isSymlink,
            `${rel} must be a symlink in bench-home when source exists on host`,
          );
        } else {
          assertEquals(
            existsSync(dst),
            false,
            `${rel} must NOT be created in bench-home when source is absent on host`,
          );
        }
      }
    } finally {
      await Deno.remove(tmpDir, { recursive: true });
    }
  },
);

/**
 * FR-ACCEPT-ISOLATION — `~/.credentials.json` must NOT be mirrored even
 * if present on the host. Mirroring it would force claude onto the
 * plaintext-credentials backend (stale `refreshToken` → HTTP 400 from
 * the OAuth token endpoint); leaving it absent lets Keychain win.
 */
Deno.test(
  "ClaudeAdapter - prepareWorkspace isolation: never mirrors .credentials.json",
  async () => {
    const tmpDir = await Deno.makeTempDir({ prefix: "iso-test-" });
    try {
      const sandboxPath = join(tmpDir, "sandbox");
      await Deno.mkdir(sandboxPath, { recursive: true });
      await adapter.prepareWorkspace(sandboxPath);
      const benchHome = join(tmpDir, "bench-home");
      assertEquals(
        existsSync(join(benchHome, ".claude", ".credentials.json")),
        false,
      );
    } finally {
      await Deno.remove(tmpDir, { recursive: true });
    }
  },
);

/**
 * FR-ACCEPT-ISOLATION — the real `~/.claude/skills/` MUST remain untouched
 * by `prepareWorkspace`. The developer's interactive installation lives
 * there; the bench cannot move/delete/symlink it as a side effect.
 */
Deno.test(
  "ClaudeAdapter - prepareWorkspace isolation: does not touch ~/.claude/skills/",
  async () => {
    const realHome = Deno.env.get("HOME");
    if (!realHome) return;
    const userSkillsPath = join(realHome, ".claude", "skills");

    // Snapshot before — list of names + mtimes — and assert it is unchanged
    // afterwards. If the user has no `~/.claude/skills/` (CI), this is a
    // no-op assertion (snapshot stays []).
    const snapshot: Array<[string, number]> = [];
    try {
      for await (const e of Deno.readDir(userSkillsPath)) {
        const stat = await Deno.lstat(join(userSkillsPath, e.name));
        snapshot.push([e.name, stat.mtime?.getTime() ?? 0]);
      }
    } catch { /* dir absent → snapshot stays empty */ }
    snapshot.sort();

    const tmpDir = await Deno.makeTempDir({ prefix: "iso-test-" });
    try {
      const sandboxPath = join(tmpDir, "sandbox");
      await Deno.mkdir(sandboxPath, { recursive: true });
      await adapter.prepareWorkspace(sandboxPath);

      const after: Array<[string, number]> = [];
      try {
        for await (const e of Deno.readDir(userSkillsPath)) {
          const stat = await Deno.lstat(join(userSkillsPath, e.name));
          after.push([e.name, stat.mtime?.getTime() ?? 0]);
        }
      } catch { /* still absent → fine */ }
      after.sort();

      assertEquals(after, snapshot);
    } finally {
      await Deno.remove(tmpDir, { recursive: true });
    }
  },
);

/**
 * Guards the PascalCase settings-key invariant. Claude Code silently
 * ignores camelCase hook event names; this test pins the casing so a
 * future refactor can't regress the mock mechanism without a failing
 * test.
 */
Deno.test(
  "ClaudeAdapter - setupMocks uses PascalCase PreToolUse key (not camelCase)",
  async () => {
    const tmpDir = await Deno.makeTempDir();
    await adapter.setupMocks(tmpDir, { gh: "x" });
    const settings = JSON.parse(
      await Deno.readTextFile(
        join(tmpDir, ".claude", "settings.local.json"),
      ),
    );
    // Must use PascalCase; Claude Code does not read camelCase.
    assertEquals(
      "PreToolUse" in settings.hooks,
      true,
      "hooks must contain PascalCase PreToolUse key",
    );
    assertEquals(
      "preToolUse" in settings.hooks,
      false,
      "hooks must NOT contain camelCase preToolUse key (silently ignored by Claude Code)",
    );
    await Deno.remove(tmpDir, { recursive: true });
  },
);
