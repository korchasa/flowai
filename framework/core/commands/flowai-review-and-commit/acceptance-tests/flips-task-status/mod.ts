import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Verifies FR-DOC-TASK-LIFECYCLE for the composite review-and-commit skill:
// Phase 2 (commit) derives task `status` from DoD checkbox count and rewrites
// the frontmatter — same logic as flowai-commit, but exercised through the
// inlined two-phase contract.
//
// Fixture: documents/tasks/2026/04/add-rate-limiter.md with frontmatter
// `status: in progress` AND all 3 DoD items already `[x]`. Composite agent
// must inline Phase 1 (Review) and Phase 2 (Commit) without delegating via
// the Skill tool, and the commit phase flips `status` to `done`.
export const ReviewAndCommitFlipsTaskStatusBench = new class
  extends AcceptanceTestScenario {
  id = "flowai-review-and-commit-flips-task-status";
  name =
    "Composite review-and-commit flips task status in progress → done when commit closes all DoD items (inline, no Skill-tool delegation)";
  skill = "flowai-review-and-commit";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override sandboxState = {
    commits: [],
    untracked: [
      "src/api/middleware/rate_limit.ts",
      "src/api/middleware/rate_limit_test.ts",
      "src/api/server.ts",
      "src/api/server_test.ts",
    ],
    expectedOutcome:
      "Agent reviews the changes (Phase 1 — Approve verdict expected for clean implementation), then in Phase 2 commits the source files AND in the same commit flips the task's frontmatter status from 'in progress' to 'done' (because all DoD items in documents/tasks/2026/04/add-rate-limiter.md are [x]).",
  };

  override async setup(sandboxPath: string) {
    const middlewareCode = `interface Bucket {
  tokens: number;
  lastRefill: number;
}

interface Options {
  limit: number;
  windowMs: number;
}

const buckets = new Map<string, Bucket>();

export function rateLimit(opts: Options) {
  return (req: Request): Response | null => {
    const key = req.headers.get("X-API-Key") ?? "anon";
    const now = Date.now();
    const bucket = buckets.get(key) ?? { tokens: opts.limit, lastRefill: now };
    const elapsed = now - bucket.lastRefill;
    bucket.tokens = Math.min(opts.limit, bucket.tokens + (elapsed / opts.windowMs) * opts.limit);
    bucket.lastRefill = now;
    if (bucket.tokens < 1) {
      return new Response("Too Many Requests", { status: 429 });
    }
    bucket.tokens -= 1;
    buckets.set(key, bucket);
    return null;
  };
}
`;

    const middlewareTest = `import { assertEquals } from "@std/assert";
import { rateLimit } from "./rate_limit.ts";

Deno.test("enforces_bucket", () => {
  const mw = rateLimit({ limit: 2, windowMs: 60_000 });
  const req = new Request("http://x/", { headers: { "X-API-Key": "k1" } });
  assertEquals(mw(req), null);
  assertEquals(mw(req), null);
  assertEquals(mw(req)?.status, 429);
});

Deno.test("per_route_override", () => {
  const mw = rateLimit({ limit: 1, windowMs: 60_000 });
  const req = new Request("http://x/", { headers: { "X-API-Key": "k2" } });
  assertEquals(mw(req), null);
  assertEquals(mw(req)?.status, 429);
});
`;

    const serverCode = `import { rateLimit } from "./middleware/rate_limit.ts";

export function buildServer() {
  const limiter = rateLimit({ limit: 60, windowMs: 60_000 });
  return {
    handle(req: Request): Response {
      const limited = limiter(req);
      if (limited) return limited;
      return new Response("ok");
    },
  };
}
`;

    const serverTest = `import { assertEquals } from "@std/assert";
import { buildServer } from "./server.ts";

Deno.test("registers_rate_limit", () => {
  const s = buildServer();
  const r = s.handle(new Request("http://x/"));
  assertEquals(r.status, 200);
});
`;

    await Deno.mkdir(join(sandboxPath, "src/api/middleware"), {
      recursive: true,
    });
    await Deno.writeTextFile(
      join(sandboxPath, "src/api/middleware/rate_limit.ts"),
      middlewareCode,
    );
    await Deno.writeTextFile(
      join(sandboxPath, "src/api/middleware/rate_limit_test.ts"),
      middlewareTest,
    );
    await Deno.writeTextFile(
      join(sandboxPath, "src/api/server.ts"),
      serverCode,
    );
    await Deno.writeTextFile(
      join(sandboxPath, "src/api/server_test.ts"),
      serverTest,
    );
  }

  userQuery =
    "/flowai-review-and-commit Implemented the rate limiter described in the task at documents/tasks/2026/04/add-rate-limiter.md. All DoD items are now satisfied. Review and commit.";

  checklist = [
    {
      id: "review_phase_executed",
      description:
        "Did the agent execute Phase 1 (Review) and emit a structured verdict (Approve / Request Changes / Needs Discussion) BEFORE committing?",
      critical: true,
    },
    {
      id: "code_committed",
      description:
        "Are all four source files (`src/api/middleware/rate_limit.ts`, `src/api/middleware/rate_limit_test.ts`, `src/api/server.ts`, `src/api/server_test.ts`) present in a commit?",
      critical: true,
    },
    {
      id: "task_status_flipped",
      description:
        "Read `documents/tasks/2026/04/add-rate-limiter.md` after the commit. Does its frontmatter contain `status: done` (NOT `status: in progress`)?",
      critical: true,
    },
    {
      id: "task_change_in_commit",
      description:
        "Run `git log -p -- documents/tasks/2026/04/add-rate-limiter.md`. Is there a commit in the agent's session that includes a diff line changing the task's `status` from `in progress` to `done`? The change must be IN A COMMIT, not just on disk.",
      critical: true,
    },
    {
      id: "no_skill_tool_delegation",
      description:
        "Inspect the agent's tool calls. Did the agent invoke the `Skill` tool to call `flowai-skill-review`, `flowai-commit`, or `flowai-commit-beta`? If yes, this is a composite-skill violation — Phase 1 and Phase 2 must be inlined. The check passes ONLY if NO such Skill-tool calls occurred.",
      critical: true,
    },
    {
      id: "task_file_not_deleted",
      description:
        "The new-shape task file at `documents/tasks/2026/04/add-rate-limiter.md` must NOT have been deleted (`git log --diff-filter=D -- documents/tasks/2026/04/add-rate-limiter.md` should be empty). New-shape tasks are persistent canonical records — only legacy flat-path tasks may be deleted on completion.",
      critical: true,
    },
    {
      id: "clean_status",
      description: "Is the final `git status` clean?",
      critical: true,
    },
  ];
}();
