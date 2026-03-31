import { BenchmarkAgentScenario } from "@bench/types.ts";
import { join } from "@std/path";

/**
 * Tests that flowai-agent-architect produces an implementation plan with 2-3 variants
 * from a specification, including concrete file references and effort estimates.
 */
export const AgentArchitectBasicBench = new class
  extends BenchmarkAgentScenario {
  id = "flowai-agent-architect-basic";
  name = "Architect Produces Plan with Variants";
  agent = "flowai-agent-architect";
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override async setup(sandboxPath: string) {
    const specDir = join(sandboxPath, ".flow", "runs", "test", "specification");
    const designDir = join(sandboxPath, ".flow", "runs", "test", "design");
    await Deno.mkdir(specDir, { recursive: true });
    await Deno.mkdir(designDir, { recursive: true });

    // Create spec artifact for architect to read
    await Deno.writeTextFile(
      join(specDir, "01-spec.md"),
      `---
issue: 42
scope: engine
---

## Problem Statement
The processData function is called frequently and is slow.
We need to add an in-memory cache to speed things up.
Cache should expire after 5 minutes.

## Affected Requirements
- REQ-PERF-001: Response time under 100ms

## Scope Boundaries
- Excludes distributed caching
- Excludes database-level caching

## Summary
Issue #42: Add in-memory caching layer for processData with 5-minute TTL.
`,
    );

    // Create source files for architect to explore
    await Deno.writeTextFile(
      join(sandboxPath, "main.ts"),
      `import { processData } from "./processor.ts";

export function handleRequest(input: string): string {
  return processData(input);
}
`,
    );

    await Deno.writeTextFile(
      join(sandboxPath, "processor.ts"),
      `export function processData(input: string): string {
  // Expensive computation
  let result = input;
  for (let i = 0; i < 1000; i++) {
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

Deno.test("processData reverses input", () => {
  const result = processData("hello");
  assertEquals(typeof result, "string");
});
`,
    );
  }

  userQuery = `You are the Architect agent. Your task:
    - Read flowai-shared-rules and flowai-reflection-protocol from the agents directory
    - Read specification at: .flow/runs/test/specification/01-spec.md
    - Explore the codebase to understand affected areas
    - Write implementation plan with 2-3 variants to: .flow/runs/test/design/02-plan.md
    - Node output directory: .flow/runs/test/design/
    - Issue number: 42
    Follow your agent definition for exact steps.`;

  checklist = [
    {
      id: "plan_created",
      description:
        "Did the agent create 02-plan.md in .flow/runs/test/design/?",
      critical: true,
    },
    {
      id: "multiple_variants",
      description:
        "Does 02-plan.md contain at least 2 variants (headings starting with '## Variant')?",
      critical: true,
    },
    {
      id: "file_references",
      description:
        "Does at least one variant reference concrete file paths from the codebase (e.g., processor.ts, main.ts)?",
      critical: true,
    },
    {
      id: "effort_estimates",
      description: "Does each variant include an effort estimate (S, M, or L)?",
      critical: true,
    },
    {
      id: "risks_listed",
      description: "Does each variant list at least one risk?",
      critical: true,
    },
    {
      id: "summary_section",
      description:
        "Does 02-plan.md end with a '## Summary' section with a recommendation?",
      critical: true,
    },
    {
      id: "no_code_changes",
      description:
        "Did the agent avoid modifying any source files (plan only, no implementation)?",
      critical: false,
    },
  ];
}();
