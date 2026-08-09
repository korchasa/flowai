import { assertEquals, assertRejects } from "@std/assert";
import { ensureDir } from "@std/fs";
import { join } from "@std/path";
import {
  collectPeekAudit,
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

    const audit = await collectPeekAudit([agent, emulator], INSTANCE);
    assertEquals(audit.instanceId, INSTANCE);
    assertEquals(audit.transcriptFiles, 2);
    assertEquals(audit.peekCount, 1, "only the agent reached for a store");

    await assertRejects(
      () => collectPeekAudit([agent, join(tmp, "nope")], INSTANCE),
      Error,
      "sessions dir absent",
    );
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});
