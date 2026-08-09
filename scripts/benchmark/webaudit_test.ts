import { assert, assertEquals, assertRejects } from "@std/assert";
import { join } from "@std/path";
import { ensureDir } from "@std/fs";
import {
  accessesFromRollout,
  collectWebAudit,
  isOracleAdjacent,
} from "./webaudit.ts";

const REPO = "django/django";
const INSTANCE = "django__django-16454";

/** `exec_command` — the dominant codex shell tool (33465 records on this host). */
function execCommand(callId: string, cmd: string): string {
  return JSON.stringify({
    type: "response_item",
    payload: {
      type: "function_call",
      call_id: callId,
      name: "exec_command",
      arguments: JSON.stringify({ cmd, workdir: "/sandbox" }),
    },
  });
}

/** `shell_command` — the other real shape, which names the field `command`. */
function shellCommand(callId: string, command: string): string {
  return JSON.stringify({
    type: "response_item",
    payload: {
      type: "function_call",
      call_id: callId,
      name: "shell_command",
      arguments: JSON.stringify({ command, workdir: "/sandbox" }),
    },
  });
}

Deno.test("isOracleAdjacent: own-repo pull/commit/issues URLs flagged; docs are not", () => {
  assert(
    isOracleAdjacent(
      "https://github.com/django/django/pull/16460",
      REPO,
      INSTANCE,
    ),
  );
  assert(
    isOracleAdjacent(
      "https://github.com/django/django/commit/abc123",
      REPO,
      INSTANCE,
    ),
  );
  assert(
    isOracleAdjacent(
      "https://github.com/django/django/issues/99",
      REPO,
      INSTANCE,
    ),
  );
  assert(
    !isOracleAdjacent(
      "https://docs.djangoproject.com/en/dev/topics/cache/",
      REPO,
      INSTANCE,
    ),
    "plain docs research is normal work — never flagged",
  );
  assert(
    !isOracleAdjacent(
      "https://github.com/psf/requests/pull/123",
      REPO,
      INSTANCE,
    ),
    "another repo's PR is not this instance's oracle",
  );
});

Deno.test("isOracleAdjacent: repo short name + ticket number in a search query is flagged", () => {
  assert(isOracleAdjacent("django 16454 fix", REPO, INSTANCE));
  assert(
    isOracleAdjacent(
      "https://code.djangoproject.com/ticket/16454",
      REPO,
      INSTANCE,
    ),
  );
  assert(
    !isOracleAdjacent("django cache culling bug", REPO, INSTANCE),
    "repo name without the ticket number is ordinary research",
  );
  assert(
    !isOracleAdjacent("error code 16454 meaning", REPO, INSTANCE),
    "ticket number without the repo name is a coincidence",
  );
});

Deno.test("accessesFromRollout: URLs inside codex shell commands are audited", () => {
  // Codex has no WebFetch/WebSearch tools in the bench sandbox — it reaches the
  // network through the shell, so the command text IS the audit surface. Both
  // real tool shapes appear on this host: `exec_command` carries `cmd`,
  // `shell_command` carries `command` (33465 vs 5588 records scanned).
  const text = [
    execCommand("call_1", "curl -sL https://docs.example.org/guide"),
    shellCommand("call_2", `pip download foo -i https://pypi.org/simple`),
  ].join("\n");
  const { accesses } = accessesFromRollout(text, REPO, INSTANCE);
  assertEquals(accesses.length, 2);
  assertEquals(accesses[0].target, "https://docs.example.org/guide");
  assertEquals(accesses.every((a) => a.tool === "Shell"), true);
});

Deno.test("accessesFromRollout: an own-repo fetch through the shell is flagged", () => {
  // The leak this audit exists for: the instance's upstream fix is public while
  // the session runs, and a plain curl would otherwise bypass every check.
  const text = execCommand(
    "call_9",
    `curl -sL https://github.com/${REPO}/pull/16454.diff`,
  );
  const { accesses } = accessesFromRollout(text, REPO, INSTANCE);
  assertEquals(accesses.length, 1);
  assertEquals(accesses[0].flagged, true);
});

Deno.test("accessesFromRollout: repeated tool calls dedupe by call_id; bad lines counted", () => {
  const text = [
    execCommand("call_1", "curl https://a.example/x"),
    execCommand("call_1", "curl https://a.example/x"),
    "{not json",
  ].join("\n");
  const { accesses, parseErrors } = accessesFromRollout(text, REPO, INSTANCE);
  assertEquals(accesses.length, 1);
  assertEquals(parseErrors, 1);
});

Deno.test("collectWebAudit: harvests every rollout; an absent sessions dir fails fast", async () => {
  const tmp = await Deno.makeTempDir({ prefix: "webaudit-test-" });
  try {
    const sessions = join(tmp, "bench-home", ".codex", "sessions", "2026");
    await ensureDir(sessions);
    await Deno.writeTextFile(
      join(sessions, "rollout-a.jsonl"),
      execCommand("call_a", `curl https://github.com/${REPO}/commit/abc`) +
        "\n",
    );
    await Deno.writeTextFile(
      join(sessions, "rollout-b.jsonl"),
      shellCommand("call_b", "curl https://docs.djangoproject.com/") + "\n",
    );

    const audit = await collectWebAudit(
      join(tmp, "bench-home"),
      REPO,
      INSTANCE,
    );
    assertEquals(audit.instanceId, INSTANCE);
    assertEquals(audit.transcriptFiles, 2);
    assertEquals(audit.accesses.length, 2);
    assertEquals(audit.flaggedCount, 1, "only the own-repo commit flags");

    await assertRejects(
      () => collectWebAudit(join(tmp, "nope"), REPO, INSTANCE),
      Error,
      "sessions dir absent",
    );
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});
