import { assert, assertEquals, assertRejects } from "@std/assert";
import { join } from "@std/path";
import { ensureDir } from "@std/fs";
import {
  accessesFromTranscript,
  collectWebAudit,
  isOracleAdjacent,
} from "./webaudit.ts";

const REPO = "django/django";
const INSTANCE = "django__django-16454";

function assistantLine(
  msgId: string,
  blocks: Array<Record<string, unknown>>,
): string {
  return JSON.stringify({
    type: "assistant",
    message: { id: msgId, content: blocks },
  });
}

Deno.test("accessesFromTranscript: WebFetch url + WebSearch query, toolu dedupe, parse errors counted", () => {
  const fetchBlock = {
    type: "tool_use",
    id: "toolu_01",
    name: "WebFetch",
    input: { url: "https://docs.djangoproject.com/en/dev/topics/cache/" },
  };
  const searchBlock = {
    type: "tool_use",
    id: "toolu_02",
    name: "WebSearch",
    input: { query: "django cache culling race condition" },
  };
  const text = [
    // One API response spans multiple lines; the tool_use block repeats.
    assistantLine("msg_a", [fetchBlock]),
    assistantLine("msg_a", [fetchBlock, searchBlock]),
    '{"torn tail', // killed session → counted, not dropped
  ].join("\n");

  const { accesses, parseErrors } = accessesFromTranscript(
    text,
    REPO,
    INSTANCE,
  );
  assertEquals(parseErrors, 1);
  assertEquals(accesses.length, 2, "repeated toolu block must dedupe to one");
  assertEquals(accesses[0].tool, "WebFetch");
  assertEquals(
    accesses[0].target,
    "https://docs.djangoproject.com/en/dev/topics/cache/",
  );
  assertEquals(accesses[1].tool, "WebSearch");
  assertEquals(accesses[1].target, "django cache culling race condition");
});

Deno.test("accessesFromTranscript: URLs inside Bash commands are audited too (curl bypass)", () => {
  const bashBlock = {
    type: "tool_use",
    id: "toolu_03",
    name: "Bash",
    input: {
      command:
        "curl -sL https://github.com/django/django/pull/16460.diff -o /tmp/fix.diff && wget https://example.com/notes.txt",
    },
  };
  const noUrlBlock = {
    type: "tool_use",
    id: "toolu_04",
    name: "Bash",
    input: { command: "git log --oneline | head" },
  };
  const { accesses } = accessesFromTranscript(
    assistantLine("msg_b", [bashBlock, noUrlBlock]),
    REPO,
    INSTANCE,
  );
  assertEquals(accesses.length, 2, "each URL in the command is one access");
  assert(accesses.every((a) => a.tool === "Bash"));
  assertEquals(
    accesses[0].target,
    "https://github.com/django/django/pull/16460.diff",
  );
  assert(accesses[0].flagged, "own-repo PR URL must be flagged");
  assertEquals(accesses[1].target, "https://example.com/notes.txt");
  assert(!accesses[1].flagged);
});

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

Deno.test("collectWebAudit: harvests all transcripts; absent projects dir fails fast", async () => {
  const tmp = await Deno.makeTempDir({ prefix: "webaudit-test-" });
  try {
    const projects = join(tmp, "bench-home", ".claude", "projects", "sess");
    await ensureDir(projects);
    await Deno.writeTextFile(
      join(projects, "main.jsonl"),
      assistantLine("msg_c", [
        {
          type: "tool_use",
          id: "toolu_10",
          name: "WebSearch",
          input: { query: "django 16454 fix" },
        },
      ]) + "\n",
    );
    await Deno.writeTextFile(
      join(projects, "subagent.jsonl"),
      assistantLine("msg_d", [
        {
          type: "tool_use",
          id: "toolu_11",
          name: "WebFetch",
          input: { url: "https://docs.djangoproject.com/" },
        },
      ]) + "\n",
    );

    const audit = await collectWebAudit(
      join(tmp, "bench-home"),
      REPO,
      INSTANCE,
    );
    assertEquals(audit.instanceId, INSTANCE);
    assertEquals(audit.repo, REPO);
    assertEquals(audit.transcriptFiles, 2);
    assertEquals(audit.accesses.length, 2);
    assertEquals(audit.flaggedCount, 1, "only the ticket-number search flags");

    await assertRejects(
      () => collectWebAudit(join(tmp, "nope"), REPO, INSTANCE),
      Error,
      "projects dir absent",
    );
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});
