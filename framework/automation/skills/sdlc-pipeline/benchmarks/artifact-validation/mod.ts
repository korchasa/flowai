import { BenchmarkSkillScenario } from "@bench/types.ts";
import { join } from "@std/path";

/**
 * Tests that the pipeline validates artifact frontmatter.
 * Pre-condition: An invalid spec artifact exists (missing required 'scope' field).
 * Pipeline should detect the invalid artifact and re-run the PM step.
 */
export const PipelineArtifactValidationBench = new class
  extends BenchmarkSkillScenario {
  id = "sdlc-pipeline-artifact-validation";
  name = "Pipeline Detects Invalid Artifact and Re-runs Step";
  skill = "sdlc-pipeline";
  stepTimeoutMs = 300_000;
  totalTimeoutMs = 600_000;
  maxSteps = 15;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  mocks = {
    // gh fails so pipeline stops after detecting invalid artifact
    "gh": "echo 'error: not available in sandbox' >&2 && exit 1",
  };

  override async setup(sandboxPath: string) {
    // Create a run with an INVALID spec artifact (missing 'scope' field)
    const runId = "20260201T120000";
    const runDir = join(sandboxPath, ".flow", "runs", runId);
    const specDir = join(runDir, "specification");

    await Deno.mkdir(specDir, { recursive: true });

    // Invalid artifact — missing 'scope' field
    await Deno.writeTextFile(
      join(specDir, "01-spec.md"),
      `---
issue: 5
---

## Problem Statement
Fix the login bug.

## Summary
Incomplete spec without scope field.
`,
    );

    // Source file for context
    await Deno.writeTextFile(
      join(sandboxPath, "main.ts"),
      `export function login(user: string): boolean {
  return user.length > 0;
}
`,
    );
  }

  userQuery =
    "/sdlc-pipeline Resume the pipeline from run 20260201T120000. Check existing artifacts. If a subagent or gh command fails, stop gracefully and report what you found.";

  checklist = [
    {
      id: "invalid_spec_detected",
      description:
        "Did the agent detect that the existing 01-spec.md is invalid (missing 'scope' field in frontmatter)?",
      critical: true,
    },
    {
      id: "spec_rerun_or_delete",
      description:
        "Did the agent delete the invalid artifact or re-run the PM/specification step to fix it?",
      critical: true,
    },
    {
      id: "validation_mentioned",
      description:
        "Did the agent mention validating the YAML frontmatter fields (issue, scope) as part of the resume check?",
      critical: false,
    },
  ];
}();
