import { BenchmarkSkillScenario } from "@bench/types.ts";
import { join } from "@std/path";

/**
 * Tests that the compact SDLC pipeline correctly initializes from a user-provided task:
 * - Generates run_id (timestamp format)
 * - Creates run directory structure under .flowai/runs/
 * - Creates subdirectories for each pipeline phase (specification, design, review)
 * - Writes specification from user-provided task (no GitHub)
 */
export const PipelineCompactInitBench = new class
  extends BenchmarkSkillScenario {
  id = "flowai-pipeline-sdlc-compact-init-structure";
  name = "Compact Pipeline Creates Run Directory and Spec from User Task";
  skill = "flowai-pipeline-sdlc-compact";
  stepTimeoutMs = 180_000;
  totalTimeoutMs = 300_000;
  maxSteps = 10;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  mocks = {
    "gh": "echo 'error: gh is not used in this pipeline' >&2 && exit 1",
  };

  override async setup(sandboxPath: string) {
    await Deno.writeTextFile(
      join(sandboxPath, "main.ts"),
      "export function processData(input: string): string {\n  return input.toUpperCase();\n}\n",
    );
  }

  userQuery =
    `/flowai-pipeline-sdlc-compact The task: "Add caching layer for processData function". ` +
    `processData is called frequently and is slow. Add an in-memory cache with 5-minute expiration. ` +
    `Initialize the pipeline, write the specification (Step 1), and stop. Do not proceed to Step 2.`;

  checklist = [
    {
      id: "run_dir_created",
      description:
        "Did the agent create a run directory under .flowai/runs/ with a timestamp-based name (YYYYMMDDTHHMMSS format)?",
      critical: true,
    },
    {
      id: "spec_dir_created",
      description:
        "Did the agent create a 'specification' subdirectory inside the run directory?",
      critical: true,
    },
    {
      id: "design_dir_created",
      description:
        "Did the agent create a 'design' subdirectory inside the run directory?",
      critical: true,
    },
    {
      id: "review_dir_created",
      description:
        "Did the agent create a 'review' subdirectory inside the run directory?",
      critical: true,
    },
    {
      id: "no_decision_dir",
      description:
        "Did the agent NOT create a 'decision' or 'tech-lead-review' directory (compact pipeline uses 'design' and 'review' instead)?",
      critical: true,
    },
    {
      id: "spec_created",
      description:
        "Did the agent create 01-spec.md in the specification/ subdirectory of the run directory?",
      critical: true,
    },
    {
      id: "spec_has_scope",
      description:
        "Does 01-spec.md have YAML frontmatter with a 'scope' field?",
      critical: true,
    },
    {
      id: "spec_has_summary",
      description: "Does 01-spec.md contain a '## Summary' section?",
      critical: true,
    },
    {
      id: "no_gh_commands",
      description:
        "Did the agent avoid using any gh CLI commands (no GitHub integration)?",
      critical: true,
    },
  ];
}();
