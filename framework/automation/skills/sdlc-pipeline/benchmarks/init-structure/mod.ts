import { BenchmarkSkillScenario } from "@bench/types.ts";
import { join } from "@std/path";

/**
 * Tests that the pipeline correctly initializes:
 * - Generates run_id (timestamp format)
 * - Creates run directory structure under .flow/runs/
 * - Creates subdirectories for each pipeline phase
 *
 * This is the simplest pipeline scenario — just initialization.
 * Pipeline will attempt to start but gh commands will fail gracefully.
 */
export const PipelineInitStructureBench = new class
  extends BenchmarkSkillScenario {
  id = "sdlc-pipeline-init-structure";
  name = "Pipeline Creates Correct Run Directory Structure";
  skill = "sdlc-pipeline";
  stepTimeoutMs = 180_000;
  totalTimeoutMs = 300_000;
  maxSteps = 10;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  mocks = {
    // gh fails so pipeline stops after initialization + issue triage attempt
    "gh": "echo 'error: no healthy issues found' >&2 && exit 1",
  };

  override async setup(sandboxPath: string) {
    // Minimal project setup
    await Deno.writeTextFile(
      join(sandboxPath, "main.ts"),
      'console.log("hello");\n',
    );
  }

  userQuery =
    "/sdlc-pipeline Start a new SDLC pipeline run. If issue triage fails, stop and report what was initialized.";

  checklist = [
    {
      id: "run_dir_created",
      description:
        "Did the agent create a run directory under .flow/runs/ with a timestamp-based name (YYYYMMDDTHHMMSS format)?",
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
      id: "decision_dir_created",
      description:
        "Did the agent create a 'decision' subdirectory inside the run directory?",
      critical: true,
    },
    {
      id: "review_dir_created",
      description:
        "Did the agent create a 'tech-lead-review' subdirectory inside the run directory?",
      critical: true,
    },
    {
      id: "timestamp_format",
      description:
        "Is the run_id in the correct UTC timestamp format (YYYYMMDDTHHMMSS)?",
      critical: false,
    },
  ];
}();
