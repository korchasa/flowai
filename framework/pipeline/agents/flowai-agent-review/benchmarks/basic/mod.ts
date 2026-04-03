import { BenchmarkAgentScenario } from "@bench/types.ts";
import { join } from "@std/path";

/**
 * Tests that flowai-agent-review produces a valid review artifact with:
 * - YAML frontmatter (verdict, findings_count)
 * - Check results, spec alignment, scope check, working tree status
 * - MERGE/OPEN verdict based on analysis
 */
export const AgentReviewBasicBench = new class extends BenchmarkAgentScenario {
  id = "flowai-agent-review-basic";
  name = "Review Agent Produces Valid Review Report with Verdict";
  agent = "flowai-agent-review";
  stepTimeoutMs = 300_000;
  totalTimeoutMs = 600_000;
  maxSteps = 15;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override async setup(sandboxPath: string) {
    const runDir = join(sandboxPath, ".flowai", "runs", "test");
    const reviewDir = join(runDir, "review");
    await Deno.mkdir(reviewDir, { recursive: true });

    // Create spec
    const specDir = join(runDir, "specification");
    await Deno.mkdir(specDir, { recursive: true });
    await Deno.writeTextFile(
      join(specDir, "01-spec.md"),
      `---
scope: processData function in main.ts
---

## Problem Statement

The processData function needs an in-memory cache with 5-minute expiration.

## Affected Requirements

- Performance: cached results for repeated inputs.

## Scope Boundaries

- Excluded: persistent caching, API changes.

## Summary

Add in-memory caching to processData. No external dependencies.
`,
    );

    // Create design artifact
    const designDir = join(runDir, "design");
    await Deno.mkdir(designDir, { recursive: true });
    await Deno.writeTextFile(
      join(designDir, "02-design.md"),
      `---
variant: "Variant A: Map-based cache"
tasks:
  - desc: "Add cache module"
    files: ["cache.ts"]
  - desc: "Integrate cache into processData"
    files: ["main.ts", "main_test.ts"]
---

## Variant A: Map-based cache

Simple Map with timestamp-based expiration.

## Decision

Selected Variant A for simplicity.

## Tasks

1. Add cache module (cache.ts)
2. Integrate cache into processData (main.ts, main_test.ts)

## Summary

Variant A selected. 2 tasks. Branch: sdlc/add-caching-layer.
`,
    );

    // Create source files (simulating "already implemented" state)
    await Deno.writeTextFile(
      join(sandboxPath, "main.ts"),
      `import { getOrSet } from "./cache.ts";

export function processData(input: string): string {
  return getOrSet(input, () => input.toUpperCase(), 5 * 60 * 1000);
}

export function handleRequest(req: string): string {
  return processData(req);
}
`,
    );

    await Deno.writeTextFile(
      join(sandboxPath, "cache.ts"),
      `const cache = new Map<string, { value: string; expiresAt: number }>();

export function getOrSet(
  key: string,
  compute: () => string,
  ttlMs: number,
): string {
  const entry = cache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.value;
  }
  const value = compute();
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}
`,
    );

    await Deno.writeTextFile(
      join(sandboxPath, "main_test.ts"),
      `import { assertEquals } from "@std/assert";
import { processData } from "./main.ts";

Deno.test("processData uppercases input", () => {
  assertEquals(processData("hello"), "HELLO");
});
`,
    );

    // Create deno.json so deno task check can work
    await Deno.writeTextFile(
      join(sandboxPath, "deno.json"),
      JSON.stringify(
        {
          tasks: {
            check: "deno fmt --check . && deno lint && deno test -A",
          },
          imports: {
            "@std/assert": "jsr:@std/assert@^1",
          },
        },
        null,
        2,
      ),
    );
  }

  userQuery = `You are the Review agent. Your task:
    - Read flowai-shared-rules and flowai-reflection-protocol from the agents directory
    - Read specification at: .flowai/runs/test/specification/01-spec.md
    - Read design at: .flowai/runs/test/design/02-design.md
    - Review the diff: git diff main...HEAD
    - Run project checks (deno task check)
    - Check clean working tree
    - Decide: MERGE or OPEN
    - Write review report to: .flowai/runs/test/review/04-review.md
    - Node output directory: .flowai/runs/test/review/
    - Pipeline status: success
    Follow your agent definition for exact steps.`;

  checklist = [
    {
      id: "review_created",
      description:
        "Did the agent create 04-review.md in .flowai/runs/test/review/?",
      critical: true,
    },
    {
      id: "yaml_frontmatter",
      description:
        "Does 04-review.md start with YAML frontmatter containing 'verdict' (MERGE or OPEN) and 'findings_count' fields?",
      critical: true,
    },
    {
      id: "check_results",
      description:
        "Does 04-review.md contain a section about project check results?",
      critical: true,
    },
    {
      id: "spec_alignment",
      description:
        "Does 04-review.md contain a section verifying spec alignment?",
      critical: true,
    },
    {
      id: "scope_check",
      description:
        "Does 04-review.md contain a scope check section (in-scope vs out-of-scope)?",
      critical: true,
    },
    {
      id: "working_tree",
      description:
        "Does 04-review.md contain a section about working tree status?",
      critical: true,
    },
    {
      id: "summary_section",
      description:
        "Does 04-review.md contain a summary section with the verdict?",
      critical: true,
    },
    {
      id: "no_code_changes",
      description:
        "Did the agent avoid modifying source code files (read-only analysis)?",
      critical: true,
    },
  ];
}();
