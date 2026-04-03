import { BenchmarkAgentScenario } from "@bench/types.ts";
import { join } from "@std/path";

/**
 * Tests that flowai-agent-design produces a valid design artifact with:
 * - YAML frontmatter (variant, tasks)
 * - 2-3 implementation variants
 * - Self-critique section
 * - Decision section with justification
 * - Task breakdown
 */
export const AgentDesignBasicBench = new class extends BenchmarkAgentScenario {
  id = "flowai-agent-design-basic";
  name = "Design Agent Produces Variants, Self-Critique, and Decision";
  agent = "flowai-agent-design";
  stepTimeoutMs = 300_000;
  totalTimeoutMs = 600_000;
  maxSteps = 25;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override async setup(sandboxPath: string) {
    const nodeDir = join(sandboxPath, ".flowai", "runs", "test", "design");
    await Deno.mkdir(nodeDir, { recursive: true });

    // Create spec for the agent to read
    const specDir = join(
      sandboxPath,
      ".flowai",
      "runs",
      "test",
      "specification",
    );
    await Deno.mkdir(specDir, { recursive: true });
    await Deno.writeTextFile(
      join(specDir, "01-spec.md"),
      `---
scope: processData function in main.ts
---

## Problem Statement

The processData function is called frequently and is slow. An in-memory
cache with 5-minute expiration is needed to reduce redundant computations.

## Affected Requirements

- Performance: processData must return cached results for repeated inputs.

## Scope Boundaries

- Excluded: persistent (disk/redis) caching, API changes.
- Deferred: cache eviction metrics.

## Summary

Add in-memory caching to processData. Cache expires after 5 minutes.
No external dependencies. No API changes.
`,
    );

    // Create source file for codebase exploration
    await Deno.writeTextFile(
      join(sandboxPath, "main.ts"),
      `export function processData(input: string): string {
  // Simulate slow operation
  return input.toUpperCase();
}

export function handleRequest(req: string): string {
  return processData(req);
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
  }

  userQuery = `You are the Design agent. Your task:
    - Read flowai-shared-rules and flowai-reflection-protocol from the agents directory
    - Read specification at: .flowai/runs/test/specification/01-spec.md
    - Explore the codebase to understand affected areas
    - Write design artifact (variants + critique + decision + tasks) to: .flowai/runs/test/design/02-design.md
    - Node output directory: .flowai/runs/test/design/
    - Branch name: sdlc/add-caching-layer
    Follow your agent definition for exact steps.`;

  checklist = [
    {
      id: "design_created",
      description:
        "Did the agent create 02-design.md in .flowai/runs/test/design/?",
      critical: true,
    },
    {
      id: "yaml_frontmatter",
      description:
        "Does 02-design.md start with YAML frontmatter containing 'variant' and 'tasks' fields?",
      critical: true,
    },
    {
      id: "multiple_variants",
      description:
        "Does 02-design.md contain at least 2 variant sections (## Variant A, ## Variant B, etc.)?",
      critical: true,
    },
    {
      id: "critique_section",
      description:
        "Does 02-design.md contain a '## Critique' section that evaluates each variant adversarially?",
      critical: true,
    },
    {
      id: "decision_section",
      description:
        "Does 02-design.md contain a '## Decision' section that selects a variant with justification?",
      critical: true,
    },
    {
      id: "tasks_section",
      description:
        "Does 02-design.md contain a '## Tasks' section with ordered implementation tasks?",
      critical: true,
    },
    {
      id: "summary_section",
      description: "Does 02-design.md contain a '## Summary' section?",
      critical: true,
    },
    {
      id: "no_code_changes",
      description:
        "Did the agent avoid modifying source code files (main.ts, main_test.ts)?",
      critical: true,
    },
  ];
}();
