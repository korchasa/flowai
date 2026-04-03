import { BenchmarkAgentScenario } from "@bench/types.ts";
import { join } from "@std/path";

/**
 * Tests that flowai-agent-tech-lead selects a variant from the plan, produces
 * a task breakdown with YAML frontmatter, and creates a feature branch.
 */
export const AgentTechLeadBasicBench = new class
  extends BenchmarkAgentScenario {
  id = "agent-tech-lead-basic";
  name = "Tech Lead Selects Variant and Creates Task Breakdown";
  agent = "flowai-agent-tech-lead";
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override async setup(sandboxPath: string) {
    const specDir = join(sandboxPath, ".flow", "runs", "test", "specification");
    const designDir = join(sandboxPath, ".flow", "runs", "test", "design");
    const decisionDir = join(sandboxPath, ".flow", "runs", "test", "decision");
    await Deno.mkdir(specDir, { recursive: true });
    await Deno.mkdir(designDir, { recursive: true });
    await Deno.mkdir(decisionDir, { recursive: true });

    // Spec
    await Deno.writeTextFile(
      join(specDir, "01-spec.md"),
      `---
issue: 42
scope: engine
---

## Problem Statement
Add in-memory caching for processData function.

## Summary
Issue #42: Add caching layer with 5-minute TTL.
`,
    );

    // Plan with variants
    await Deno.writeTextFile(
      join(designDir, "02-plan.md"),
      `## Variant A: Simple Map Cache
**Description:** Use a Map with setTimeout for TTL expiration.
**Affected files:** \`processor.ts\`, \`processor_test.ts\`
**Effort:** S
**Risks:** Memory leak if cache grows unbounded.

## Variant B: LRU Cache with TTL
**Description:** Implement LRU eviction with TTL using a doubly-linked list.
**Affected files:** \`processor.ts\`, \`cache.ts\`, \`cache_test.ts\`, \`processor_test.ts\`
**Effort:** M
**Risks:** More complex implementation, potential bugs in eviction logic.

## Summary
2 variants proposed. Variant A is simpler (S effort) but risks memory leaks.
Variant B is more robust (M effort) with bounded memory. Recommend Variant A
for initial implementation with a follow-up for LRU if needed.
`,
    );

    // Source files
    await Deno.writeTextFile(
      join(sandboxPath, "processor.ts"),
      `export function processData(input: string): string {
  return input.toUpperCase();
}
`,
    );

    await Deno.writeTextFile(
      join(sandboxPath, "processor_test.ts"),
      `import { processData } from "./processor.ts";
Deno.test("processData works", () => { processData("test"); });
`,
    );
  }

  userQuery = `You are the Tech Lead agent. Your task:
    - Read flowai-shared-rules and flowai-reflection-protocol from the agents directory
    - Read specification at: .flowai/runs/test/specification/01-spec.md
    - Read plan at: .flowai/runs/test/design/02-plan.md
    - Select a variant, produce task breakdown, create branch sdlc/issue-42
    - Write decision artifact to: .flowai/runs/test/decision/03-decision.md
    - Node output directory: .flowai/runs/test/decision/
    - Issue number: 42
    Follow your agent definition for exact steps.`;

  checklist = [
    {
      id: "decision_created",
      description:
        "Did the agent create 03-decision.md in .flowai/runs/test/decision/?",
      critical: true,
    },
    {
      id: "yaml_frontmatter",
      description:
        "Does 03-decision.md have YAML frontmatter with 'variant' and 'tasks' fields?",
      critical: true,
    },
    {
      id: "variant_selected",
      description:
        "Did the agent select one of the proposed variants (A or B) and justify the choice?",
      critical: true,
    },
    {
      id: "tasks_ordered",
      description:
        "Does the 'tasks' array in frontmatter contain ordered tasks with 'desc' and 'files' fields?",
      critical: true,
    },
    {
      id: "branch_created",
      description:
        "Did the agent create a branch named 'sdlc/issue-42' (or attempt to)?",
      critical: true,
    },
    {
      id: "no_source_changes",
      description:
        "Did the agent avoid modifying source code files (decision only)?",
      critical: false,
    },
  ];
}();
