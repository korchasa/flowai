import { BenchmarkAgentScenario } from "@bench/types.ts";
import { join } from "@std/path";

/**
 * Tests that flowai-agent-qa verifies implementation against specification,
 * runs project checks, and produces a QA report with PASS/FAIL verdict
 * and YAML frontmatter (verdict, high_confidence_issues).
 */
export const AgentQaBasicBench = new class extends BenchmarkAgentScenario {
  id = "flowai-agent-qa-basic";
  name = "QA Verifies Implementation and Produces Report";
  agent = "flowai-agent-qa";
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override async setup(sandboxPath: string) {
    const specDir = join(sandboxPath, ".flow", "runs", "test", "specification");
    const decisionDir = join(sandboxPath, ".flow", "runs", "test", "decision");
    const buildDir = join(
      sandboxPath,
      ".flow",
      "runs",
      "test",
      "build",
      "iter-1",
    );
    const verifyDir = join(
      sandboxPath,
      ".flow",
      "runs",
      "test",
      "verify",
      "iter-1",
    );
    await Deno.mkdir(specDir, { recursive: true });
    await Deno.mkdir(decisionDir, { recursive: true });
    await Deno.mkdir(buildDir, { recursive: true });
    await Deno.mkdir(verifyDir, { recursive: true });

    // Spec
    await Deno.writeTextFile(
      join(specDir, "01-spec.md"),
      `---
issue: 42
scope: engine
---

## Problem Statement
Add in-memory caching for processData function with 5-minute TTL.

## Scope Boundaries
- Excludes distributed caching

## Summary
Issue #42: Add caching layer with TTL.
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
2 tasks implemented.
`,
    );

    // Implementation summary
    await Deno.writeTextFile(
      join(buildDir, "04-impl-summary.md"),
      `## Summary
- cache.ts: Created with Map-based TTL cache
- cache_test.ts: Added tests for cache get/set/expiration
- processor.ts: Integrated cache lookup before computation
- processor_test.ts: Updated with cache integration tests
- deno task check result: PASS
`,
    );

    // Implemented source files (correct implementation)
    await Deno.writeTextFile(
      join(sandboxPath, "cache.ts"),
      `const cache = new Map<string, { value: string; expires: number }>();
const TTL_MS = 5 * 60 * 1000;

export function cacheGet(key: string): string | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

export function cacheSet(key: string, value: string): void {
  cache.set(key, { value, expires: Date.now() + TTL_MS });
}

export function cacheClear(): void {
  cache.clear();
}
`,
    );

    await Deno.writeTextFile(
      join(sandboxPath, "cache_test.ts"),
      `import { assertEquals } from "@std/assert";
import { cacheClear, cacheGet, cacheSet } from "./cache.ts";

Deno.test("cache: set and get", () => {
  cacheClear();
  cacheSet("key", "value");
  assertEquals(cacheGet("key"), "value");
});

Deno.test("cache: miss returns null", () => {
  cacheClear();
  assertEquals(cacheGet("nonexistent"), null);
});
`,
    );

    await Deno.writeTextFile(
      join(sandboxPath, "processor.ts"),
      `import { cacheGet, cacheSet } from "./cache.ts";

export function processData(input: string): string {
  const cached = cacheGet(input);
  if (cached) return cached;

  let result = input;
  for (let i = 0; i < 100; i++) {
    result = result.split("").reverse().join("");
  }
  cacheSet(input, result);
  return result;
}
`,
    );

    await Deno.writeTextFile(
      join(sandboxPath, "processor_test.ts"),
      `import { assertEquals } from "@std/assert";
import { processData } from "./processor.ts";

Deno.test("processData returns string", () => {
  assertEquals(typeof processData("hello"), "string");
});

Deno.test("processData is deterministic", () => {
  const a = processData("test");
  const b = processData("test");
  assertEquals(a, b);
});
`,
    );

    // deno.json for project checks
    await Deno.writeTextFile(
      join(sandboxPath, "deno.json"),
      JSON.stringify(
        {
          tasks: {
            check: "deno fmt --check && deno lint && deno test",
          },
          imports: {
            "@std/assert": "jsr:@std/assert@1",
          },
        },
        null,
        2,
      ),
    );
  }

  userQuery = `You are the QA agent. Your task:
    - Read flowai-shared-rules and flowai-reflection-protocol from the agents directory
    - Read specification at: .flow/runs/test/specification/01-spec.md
    - Read decision at: .flow/runs/test/decision/03-decision.md
    - Read implementation summary at: .flow/runs/test/build/iter-1/04-impl-summary.md
    - Issue data: Title: "Add caching layer for processData function", Body: "Add in-memory cache with 5-minute TTL"
    - Run project checks (deno task check) and review changed files
    - Write QA report to: .flow/runs/test/verify/iter-1/05-qa-report.md
    - Node output directory: .flow/runs/test/verify/iter-1/
    - Issue number: 42
    - Iteration: 1
    Follow your agent definition for exact steps.`;

  checklist = [
    {
      id: "qa_report_created",
      description:
        "Did the agent create 05-qa-report.md in .flow/runs/test/verify/iter-1/?",
      critical: true,
    },
    {
      id: "yaml_frontmatter",
      description:
        "Does 05-qa-report.md have YAML frontmatter with 'verdict' and 'high_confidence_issues' fields?",
      critical: true,
    },
    {
      id: "checks_ran",
      description:
        "Did the agent run the project check command (deno task check)?",
      critical: true,
    },
    {
      id: "verdict_present",
      description: "Does the report contain a clear PASS or FAIL verdict?",
      critical: true,
    },
    {
      id: "check_results_section",
      description:
        "Does the report contain a section about project check results?",
      critical: true,
    },
    {
      id: "no_code_changes",
      description:
        "Did the agent avoid modifying any source code files (read-only analysis)?",
      critical: false,
    },
  ];
}();
