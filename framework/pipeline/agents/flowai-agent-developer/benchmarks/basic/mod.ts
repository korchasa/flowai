import { BenchmarkAgentScenario } from "@bench/types.ts";
import { join } from "@std/path";

/**
 * Tests that flowai-agent-developer implements code following TDD based on the
 * task breakdown: writes tests first, then implementation, runs checks,
 * produces implementation summary.
 */
export const AgentDeveloperBasicBench = new class
  extends BenchmarkAgentScenario {
  id = "flowai-agent-developer-basic";
  name = "Developer Implements with TDD from Task Breakdown";
  agent = "flowai-agent-developer";
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override async setup(sandboxPath: string) {
    const decisionDir = join(sandboxPath, ".flow", "runs", "test", "decision");
    const buildDir = join(
      sandboxPath,
      ".flow",
      "runs",
      "test",
      "build",
      "iter-1",
    );
    await Deno.mkdir(decisionDir, { recursive: true });
    await Deno.mkdir(buildDir, { recursive: true });

    // Decision artifact with task breakdown
    await Deno.writeTextFile(
      join(decisionDir, "03-decision.md"),
      `---
variant: "Variant A: Simple Map Cache"
tasks:
  - desc: "Add cache module with TTL support"
    files: ["cache.ts", "cache_test.ts"]
  - desc: "Integrate cache into processData"
    files: ["processor.ts", "processor_test.ts"]
---

## Justification
Variant A chosen for simplicity. S effort, acceptable risk.

## Task Descriptions
1. Create cache.ts with Map-based cache and setTimeout TTL.
2. Update processData to check cache before computing.

## Summary
Selected Variant A. 2 tasks, blocking order: cache module first, then integration.
`,
    );

    // Existing source files
    await Deno.writeTextFile(
      join(sandboxPath, "processor.ts"),
      `export function processData(input: string): string {
  // Expensive computation
  let result = input;
  for (let i = 0; i < 100; i++) {
    result = result.split("").reverse().join("");
  }
  return result;
}
`,
    );

    await Deno.writeTextFile(
      join(sandboxPath, "processor_test.ts"),
      `import { assertEquals } from "@std/assert";
import { processData } from "./processor.ts";

Deno.test("processData returns string", () => {
  const result = processData("hello");
  assertEquals(typeof result, "string");
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

  userQuery = `You are the Developer agent. Your task:
    - Read flowai-shared-rules and flowai-reflection-protocol from the agents directory
    - Read decision at: .flowai/runs/test/decision/03-decision.md
    - Implement code changes following TDD (tests first, then implementation)
    - Write implementation summary to: .flowai/runs/test/build/iter-1/04-impl-summary.md
    - Node output directory: .flowai/runs/test/build/iter-1/
    - Issue number: 42
    - Iteration: 1
    Follow your agent definition for exact steps.`;

  checklist = [
    {
      id: "cache_module_created",
      description:
        "Did the agent create a cache.ts file with cache functionality?",
      critical: true,
    },
    {
      id: "cache_test_created",
      description:
        "Did the agent create cache_test.ts with tests for the cache module?",
      critical: true,
    },
    {
      id: "processor_updated",
      description: "Did the agent update processor.ts to integrate the cache?",
      critical: true,
    },
    {
      id: "impl_summary_created",
      description:
        "Did the agent create 04-impl-summary.md in .flowai/runs/test/build/iter-1/?",
      critical: true,
    },
    {
      id: "summary_has_files",
      description:
        "Does 04-impl-summary.md contain a Summary section listing files changed?",
      critical: true,
    },
    {
      id: "tests_written_first",
      description:
        "Does the agent log or summary indicate TDD approach (tests before implementation)?",
      critical: false,
    },
  ];
}();
