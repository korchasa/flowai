import { BenchmarkSkillScenario } from "@bench/types.ts";
import { join } from "@std/path";

/**
 * Tests pipeline resume logic: when specification artifact already exists,
 * pipeline should skip PM step and proceed to Architect step.
 *
 * Pre-condition: .flowai/runs/<run_id>/specification/01-spec.md exists with valid
 * frontmatter. Pipeline should detect it and skip Step 1 (specification),
 * proceeding directly to Step 2 (Architect).
 *
 * Note: This scenario mocks gh commands since no real GitHub repo is available.
 * The focus is on resume detection, not full pipeline execution.
 */
export const PipelineResumeFromSpecBench = new class
  extends BenchmarkSkillScenario {
  id = "flowai-pipeline-github-sdlc-resume-from-spec";
  name = "Resume Pipeline from Existing Spec";
  skill = "flowai-pipeline-github-sdlc";
  stepTimeoutMs = 300_000;
  totalTimeoutMs = 600_000;
  maxSteps = 15;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  mocks = {
    // gh fails so pipeline stops early (after resume check + architect attempt)
    "gh": "echo 'error: not available in sandbox' >&2 && exit 1",
  };

  override async setup(sandboxPath: string) {
    // Create a pre-existing run with completed spec artifact
    const runId = "20260101T000000";
    const runDir = join(sandboxPath, ".flow", "runs", runId);
    const specDir = join(runDir, "specification");
    const designDir = join(runDir, "design");

    await Deno.mkdir(specDir, { recursive: true });
    await Deno.mkdir(designDir, { recursive: true });

    // Write valid spec artifact
    await Deno.writeTextFile(
      join(specDir, "01-spec.md"),
      `---
issue: 1
scope: engine
---

## Problem Statement
Implement feature X to improve performance.

## Affected Requirements
- REQ-001: Performance optimization

## Scope Boundaries
- Excludes UI changes

## Summary
Selected issue #1. Implementing feature X for engine performance improvement.
`,
    );

    // Create a simple source file for the architect to analyze
    await Deno.writeTextFile(
      join(sandboxPath, "main.ts"),
      `export function processData(input: string): string {
  return input.toUpperCase();
}
`,
    );
  }

  userQuery =
    "/flowai-pipeline-github-sdlc Resume the pipeline. The latest run is 20260101T000000 in .flowai/runs/. " +
    "If a subagent or gh command fails, stop gracefully and report progress.";

  checklist = [
    {
      id: "spec_skip_detected",
      description:
        "Did the agent detect that 01-spec.md already exists and skip the specification step (Step 1)?",
      critical: true,
    },
    {
      id: "issue_extracted",
      description:
        "Did the agent extract issue number (1) from the existing spec frontmatter?",
      critical: true,
    },
    {
      id: "architect_launched",
      description:
        "Did the agent attempt to launch or proceed to the Architect/design step (Step 2)?",
      critical: true,
    },
    {
      id: "run_dir_preserved",
      description:
        "Did the agent use the existing run directory (.flowai/runs/20260101T000000) instead of creating a new one?",
      critical: true,
    },
    {
      id: "spec_not_overwritten",
      description:
        "Was the existing 01-spec.md preserved (not deleted or overwritten)?",
      critical: true,
    },
  ];
}();
