import { BenchmarkAgentScenario } from "@bench/types.ts";
import { join } from "@std/path";

/**
 * Tests that agent-tech-lead-review performs final code review,
 * checks working tree cleanliness, and produces a review report
 * with MERGE or OPEN verdict.
 */
export const AgentTechLeadReviewBasicBench = new class
  extends BenchmarkAgentScenario {
  id = "agent-tech-lead-review-basic";
  name = "Tech Lead Review Produces Final Review Report";
  agent = "agent-tech-lead-review";
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override async setup(sandboxPath: string) {
    const specDir = join(sandboxPath, ".flow", "runs", "test", "specification");
    const decisionDir = join(sandboxPath, ".flow", "runs", "test", "decision");
    const reviewDir = join(
      sandboxPath,
      ".flow",
      "runs",
      "test",
      "tech-lead-review",
    );
    await Deno.mkdir(specDir, { recursive: true });
    await Deno.mkdir(decisionDir, { recursive: true });
    await Deno.mkdir(reviewDir, { recursive: true });

    // Spec
    await Deno.writeTextFile(
      join(specDir, "01-spec.md"),
      `---
issue: 42
scope: engine
---

## Problem Statement
Add caching for processData.

## Summary
Issue #42: Add in-memory caching with TTL.
`,
    );

    // Decision
    await Deno.writeTextFile(
      join(decisionDir, "03-decision.md"),
      `---
variant: "Variant A: Simple Map Cache"
tasks:
  - desc: "Add cache module"
    files: ["cache.ts", "cache_test.ts"]
  - desc: "Integrate cache"
    files: ["processor.ts", "processor_test.ts"]
---

## Summary
Variant A selected. 2 tasks.
`,
    );

    // Implemented source files (already committed via git)
    await Deno.writeTextFile(
      join(sandboxPath, "cache.ts"),
      `const cache = new Map<string, { value: string; expires: number }>();

export function cacheGet(key: string): string | null {
  const entry = cache.get(key);
  if (!entry || Date.now() > entry.expires) return null;
  return entry.value;
}

export function cacheSet(key: string, value: string): void {
  cache.set(key, { value, expires: Date.now() + 300000 });
}
`,
    );

    await Deno.writeTextFile(
      join(sandboxPath, "processor.ts"),
      `import { cacheGet, cacheSet } from "./cache.ts";

export function processData(input: string): string {
  const cached = cacheGet(input);
  if (cached) return cached;
  const result = input.toUpperCase();
  cacheSet(input, result);
  return result;
}
`,
    );
  }

  userQuery = `You are the Tech Lead Review agent. Your task:
    - Read shared-rules and reflection-protocol from the agents directory
    - Read specification at: .flow/runs/test/specification/01-spec.md
    - Read decision at: .flow/runs/test/decision/03-decision.md
    - Review the diff: git diff main...HEAD (or git log/diff to see changes)
    - Check clean working tree: git status --porcelain
    - Decide: MERGE or OPEN
    - Write review report to: .flow/runs/test/tech-lead-review/06-review.md
    - Node output directory: .flow/runs/test/tech-lead-review/
    - Pipeline status: success
    Follow your agent definition for exact steps.`;

  checklist = [
    {
      id: "review_created",
      description:
        "Did the agent create 06-review.md in .flow/runs/test/tech-lead-review/?",
      critical: true,
    },
    {
      id: "verdict_present",
      description: "Does 06-review.md contain a clear verdict (MERGE or OPEN)?",
      critical: true,
    },
    {
      id: "working_tree_checked",
      description: "Did the agent check the working tree status (git status)?",
      critical: true,
    },
    {
      id: "findings_section",
      description:
        "Does the report contain a Findings section with review observations?",
      critical: true,
    },
    {
      id: "scope_check",
      description:
        "Does the report check that changes are within the decision scope (cache.ts, processor.ts)?",
      critical: false,
    },
    {
      id: "summary_section",
      description: "Does the report contain a Summary section?",
      critical: true,
    },
  ];
}();
