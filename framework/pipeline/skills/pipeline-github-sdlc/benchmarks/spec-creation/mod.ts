import { BenchmarkSkillScenario } from "@bench/types.ts";
import { join } from "@std/path";

/**
 * Tests that the orchestrator (Step 1) produces a valid specification artifact
 * directly (without PM subagent), following the required structure:
 * YAML frontmatter (issue, scope) + Problem Statement + Affected Requirements
 * + Scope Boundaries + Summary.
 *
 * Setup: pre-creates a run directory with no spec artifact and provides issue
 * data in a local file (since gh mock is static and cannot serve multi-step
 * triage). The userQuery tells the orchestrator to use the provided issue data
 * and skip gh triage.
 */
export const PipelineSpecCreationBench = new class
  extends BenchmarkSkillScenario {
  id = "pipeline-github-sdlc-spec-creation";
  name = "Orchestrator Produces Valid Specification in Step 1";
  skill = "pipeline-github-sdlc";
  stepTimeoutMs = 300_000;
  totalTimeoutMs = 600_000;
  maxSteps = 15;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  mocks = {
    // All gh calls blocked — triage is bypassed via userQuery
    "gh": "error: not available in sandbox",
  };

  override async setup(sandboxPath: string) {
    // Pre-create run directory (as if Initialization already happened)
    const runId = "20260301T100000";
    const runDir = join(sandboxPath, ".flow", "runs", runId);
    await Deno.mkdir(join(runDir, "specification"), { recursive: true });
    await Deno.mkdir(join(runDir, "design"), { recursive: true });
    await Deno.mkdir(join(runDir, "decision"), { recursive: true });
    await Deno.mkdir(join(runDir, "tech-lead-review"), { recursive: true });

    // Source file for context
    await Deno.writeTextFile(
      join(sandboxPath, "main.ts"),
      `export function processData(input: string): string {
  return input.toUpperCase();
}
`,
    );
  }

  userQuery =
    `/pipeline-github-sdlc Resume the pipeline from run 20260301T100000. ` +
    `The issue to work on is already known (skip gh triage): ` +
    `Issue #42 "Add caching layer for processData function". ` +
    `Body: "The processData function is called frequently and is slow. ` +
    `We need to add an in-memory cache to speed things up. Cache should expire after 5 minutes." ` +
    `Labels: enhancement, priority: high. ` +
    `Write the specification (Step 1) and stop. Do not proceed to Step 2.`;

  checklist = [
    {
      id: "spec_created",
      description:
        "Did the orchestrator create 01-spec.md in .flow/runs/20260301T100000/specification/?",
      critical: true,
    },
    {
      id: "yaml_frontmatter_issue",
      description:
        "Does 01-spec.md start with YAML frontmatter containing 'issue: 42'?",
      critical: true,
    },
    {
      id: "yaml_frontmatter_scope",
      description:
        "Does the YAML frontmatter contain a 'scope' field with a valid value (engine, sdlc, or engine+sdlc)?",
      critical: true,
    },
    {
      id: "problem_statement",
      description: "Does 01-spec.md contain a '## Problem Statement' section?",
      critical: true,
    },
    {
      id: "scope_boundaries",
      description: "Does 01-spec.md contain a '## Scope Boundaries' section?",
      critical: true,
    },
    {
      id: "summary_section",
      description: "Does 01-spec.md contain a '## Summary' section?",
      critical: true,
    },
    {
      id: "no_implementation_details",
      description:
        "Does the spec avoid implementation details (no code, no data structures, no API definitions)?",
      critical: false,
    },
  ];
}();
