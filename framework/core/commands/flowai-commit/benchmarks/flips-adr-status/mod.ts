import { join } from "@std/path";
import { BenchmarkSkillScenario } from "@bench/types.ts";

export const CommitFlipsAdrStatusBench = new class
  extends BenchmarkSkillScenario {
  id = "flowai-commit-flips-adr-status";
  name =
    "ADR status flips accepted → implemented when commit closes all DoD items";
  skill = "flowai-commit";
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
      "Agent commits the new source files implementing ADR-0042, AND in the same commit flips the ADR's frontmatter status from 'accepted' to 'implemented' (because all DoD items in documents/adr/2026-04-15-add-rate-limiter.md are [x]).",
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
    "/flowai-commit Implemented the rate limiter described in documents/adr/2026-04-15-add-rate-limiter.md (ADR-0042). All DoD items are now satisfied. Commit the changes.";

  checklist = [
    {
      id: "code_committed",
      description:
        "Are all four source files (`src/api/middleware/rate_limit.ts`, `src/api/middleware/rate_limit_test.ts`, `src/api/server.ts`, `src/api/server_test.ts`) present in a commit?",
      critical: true,
    },
    {
      id: "adr_status_flipped",
      description:
        "Read `documents/adr/2026-04-15-add-rate-limiter.md` after the commit. Does its frontmatter contain `status: implemented` (NOT `status: accepted`)?",
      critical: true,
    },
    {
      id: "adr_change_in_commit",
      description:
        "Run `git log -p -- documents/adr/2026-04-15-add-rate-limiter.md`. Is there a commit in the agent's session that includes a diff line changing the ADR's `status` from `accepted` to `implemented`? The change must be IN A COMMIT, not just on disk.",
      critical: true,
    },
    {
      id: "adr_id_unchanged",
      description:
        "Read the ADR file. Does its frontmatter still contain `id: ADR-0042`? The agent must NOT have changed the ID.",
      critical: true,
    },
    {
      id: "dod_items_unchanged",
      description:
        "Read the ADR file. Is the `## Definition of Done` section unchanged from the original (3 items, all `[x]`)? The agent must NOT have edited the DoD list itself — only the frontmatter `status:` line.",
      critical: false,
    },
    {
      id: "clean_status",
      description: "Is the final `git status` clean?",
      critical: true,
    },
  ];
}();
