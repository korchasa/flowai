import { assertEquals, assertRejects } from "@std/assert";
import { ensureDir } from "@std/fs";
import { join } from "@std/path";
import {
  collectPeekAudit,
  peeksFromClaudeTranscript,
  peeksFromRollout,
  sessionPeekMarker,
} from "./peek_audit.ts";

const INSTANCE = "agronholm__anyio-1134";

function execCommand(callId: string, cmd: string): string {
  return JSON.stringify({
    payload: {
      type: "function_call",
      name: "exec_command",
      call_id: callId,
      arguments: JSON.stringify({ cmd }),
    },
  });
}

function shellCommand(callId: string, command: string): string {
  return JSON.stringify({
    payload: {
      type: "function_call",
      name: "shell_command",
      call_id: callId,
      arguments: JSON.stringify({ command }),
    },
  });
}

Deno.test("sessionPeekMarker: rollout files and session dirs match, ordinary work does not", () => {
  assertEquals(
    sessionPeekMarker("cat ~/.codex/sessions/2026/08/rollout-x.jsonl"),
    "rollout-",
  );
  assertEquals(
    sessionPeekMarker("ls -la /tmp/bench-home/.codex"),
    "bench-home",
  );
  assertEquals(sessionPeekMarker("echo $CODEX_HOME"), "CODEX_HOME");
  // The work the agent is actually here to do must not trip the flag.
  assertEquals(
    sessionPeekMarker("python -m pytest tests/test_sockets.py"),
    undefined,
  );
  assertEquals(sessionPeekMarker("git diff --stat"), undefined);
});

Deno.test("peeksFromRollout: a command reaching for a session store is flagged with the trigger", () => {
  const text = [
    execCommand("c1", "python -m pytest tests/"),
    shellCommand(
      "c2",
      "grep -r DECISION /var/folders/x/T/flowai-bench-emulator-ab12/.codex/sessions",
    ),
    "{not json",
  ].join("\n");
  const { peeks, parseErrors } = peeksFromRollout(text);
  assertEquals(peeks.length, 1);
  assertEquals(peeks[0].tool, "Shell");
  assertEquals(peeks[0].matched, ".codex/sessions");
  assertEquals(parseErrors, 1);
});

Deno.test("peeksFromRollout: a long command is truncated, not dropped", () => {
  const long = "cat " + "a".repeat(600) + "/rollout-x.jsonl";
  const { peeks } = peeksFromRollout(execCommand("c1", long));
  assertEquals(peeks.length, 1);
  assertEquals(peeks[0].command.length, 401);
  assertEquals(peeks[0].command.endsWith("…"), true);
});

Deno.test("collectPeekAudit: reads both stores; an absent sessions dir fails fast", async () => {
  const tmp = await Deno.makeTempDir({ prefix: "peek-audit-test-" });
  try {
    const agent = join(tmp, "bench-home", ".codex");
    const emulator = join(tmp, "emulator-home", ".codex");
    await ensureDir(join(agent, "sessions"));
    await ensureDir(join(emulator, "sessions"));
    await Deno.writeTextFile(
      join(agent, "sessions", "rollout-a.jsonl"),
      execCommand("c1", "cat /tmp/other/.codex/sessions/rollout-b.jsonl") +
        "\n",
    );
    await Deno.writeTextFile(
      join(emulator, "sessions", "rollout-b.jsonl"),
      shellCommand("c2", "echo done") + "\n",
    );

    const audit = await collectPeekAudit(
      { ide: "codex", codexHomes: [agent, emulator] },
      INSTANCE,
    );
    assertEquals(audit.instanceId, INSTANCE);
    assertEquals(audit.transcriptFiles, 2);
    assertEquals(audit.peekCount, 1, "only the agent reached for a store");

    await assertRejects(
      () =>
        collectPeekAudit(
          { ide: "codex", codexHomes: [agent, join(tmp, "nope")] },
          INSTANCE,
        ),
      Error,
      "sessions dir absent",
    );
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

/** One Claude Code `assistant` line carrying `tool_use` blocks. */
function claudeTools(
  msgId: string,
  calls: Array<{ id: string; name: string; input: Record<string, unknown> }>,
): string {
  return JSON.stringify({
    type: "assistant",
    message: {
      id: msgId,
      content: calls.map((c) => ({ type: "tool_use", ...c })),
    },
  });
}

// Claude Code reads files with its own tools as well as with the shell, so the
// peek surface is Bash commands plus the paths Read, Grep and Glob take.
// Its store is `<HOME>/.claude/projects`; the emulator's sessions sit there
// under a slug of its temp cwd (`flowai-operator-…`, `answer-emulator-…`).
Deno.test("peeksFromClaudeTranscript: Bash and file tools reaching for a session store are flagged", () => {
  const text = [
    claudeTools("msg_1", [
      {
        id: "toolu_1",
        name: "Bash",
        input: { command: "ls ~/.claude/projects" },
      },
      {
        id: "toolu_2",
        name: "Read",
        input: { file_path: "/T/x/bench-home/.claude/projects/s.jsonl" },
      },
      {
        id: "toolu_3",
        name: "Grep",
        input: { pattern: "DECISION", path: "/T/flowai-operator-ab12" },
      },
      {
        id: "toolu_4",
        name: "Glob",
        input: { pattern: "**/*.py", path: "/sandbox" },
      },
      { id: "toolu_5", name: "Bash", input: { command: "pytest tests/ -q" } },
      {
        id: "toolu_6",
        name: "Read",
        input: { file_path: "/sandbox/.claude/skills/plan/SKILL.md" },
      },
    ]),
  ].join("\n");
  const { peeks } = peeksFromClaudeTranscript(text);
  assertEquals(peeks.map((p) => [p.tool, p.matched]), [
    ["Bash", ".claude/projects"],
    ["Read", "bench-home"],
    ["Grep", "flowai-operator-"],
  ]);
});

Deno.test("sessionPeekMarker: claude store markers", () => {
  assertEquals(
    sessionPeekMarker("cat $CLAUDE_CONFIG_DIR/x"),
    "CLAUDE_CONFIG_DIR",
  );
  assertEquals(
    sessionPeekMarker("ls /T/answer-emulator-x9"),
    "answer-emulator-",
  );
  assertEquals(
    sessionPeekMarker("cat .claude/skills/plan/SKILL.md"),
    undefined,
  );
});

Deno.test("collectPeekAudit: reads a claude HOME's transcripts", async () => {
  const home = await Deno.makeTempDir({ prefix: "peek-claude-" });
  try {
    const slug = join(home, ".claude", "projects", "-tmp-sb");
    await ensureDir(slug);
    await Deno.writeTextFile(
      join(slug, "s.jsonl"),
      claudeTools("msg_1", [
        {
          id: "toolu_1",
          name: "Bash",
          input: { command: "cat ~/.claude/projects/*/x.jsonl" },
        },
      ]) + "\n",
    );
    const audit = await collectPeekAudit(
      { ide: "claude", homes: [home] },
      INSTANCE,
    );
    assertEquals(audit.transcriptFiles, 1);
    assertEquals(audit.peekCount, 1);
  } finally {
    await Deno.remove(home, { recursive: true });
  }
});
