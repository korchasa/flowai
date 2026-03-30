import { BenchmarkSkillScenario } from "@bench/types.ts";
import { join } from "@std/path";

/**
 * Tests that the pipeline engineering guide helps create a custom pipeline.
 * User asks to create a pipeline for a code review workflow.
 * Agent should use the guide to produce an orchestrator skill and subagent definitions.
 */
export const EngineerPipelineBasicBench = new class
  extends BenchmarkSkillScenario {
  id = "flow-skill-engineer-pipeline-basic";
  name = "Create a Custom Review Pipeline Using Guide";
  skill = "flow-skill-engineer-pipeline";
  stepTimeoutMs = 300_000;
  maxSteps = 15;
  agentsTemplateVars = {
    PROJECT_NAME: "ReviewBot",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  interactive = true;
  userPersona =
    "A developer who wants to create a simple 3-step review pipeline: Reviewer -> Fixer -> Verifier. When asked about IDE, answer Claude Code. When asked about scope, say project-level. Keep answers brief and confirm suggestions.";

  override async setup(sandboxPath: string) {
    // Create .claude directory marker
    await Deno.mkdir(join(sandboxPath, ".claude", "skills"), {
      recursive: true,
    });
    await Deno.mkdir(join(sandboxPath, ".claude", "agents"), {
      recursive: true,
    });

    // Simple project structure
    await Deno.writeTextFile(
      join(sandboxPath, "main.ts"),
      `export function review(code: string): string[] {
  const issues: string[] = [];
  if (code.includes("TODO")) issues.push("Unresolved TODO found");
  return issues;
}
`,
    );
  }

  userQuery =
    "/flow-skill-engineer-pipeline I want to create a custom pipeline for automated code review. It should have 3 steps: (1) Reviewer agent finds issues, (2) Fixer agent resolves issues, (3) Verifier agent checks fixes. Help me create the orchestrator skill and agent definitions.";

  checklist = [
    {
      id: "orchestrator_created",
      description:
        "Did the agent create an orchestrator SKILL.md file with pipeline steps defined?",
      critical: true,
    },
    {
      id: "three_steps",
      description:
        "Does the orchestrator define 3 distinct steps (Reviewer, Fixer, Verifier or equivalent)?",
      critical: true,
    },
    {
      id: "resume_logic",
      description:
        "Does the orchestrator include resume logic (checking if artifacts already exist before running each step)?",
      critical: true,
    },
    {
      id: "agent_definitions",
      description:
        "Were agent definition files (.md) created for at least 2 of the 3 roles?",
      critical: true,
    },
    {
      id: "permissions_section",
      description:
        "Do the agent definitions include a Permissions section (bash whitelist, allowed/denied files)?",
      critical: false,
    },
    {
      id: "output_schema",
      description:
        "Do the agent definitions include an Output Schema section (artifact format)?",
      critical: false,
    },
    {
      id: "subagent_dispatch",
      description:
        "Does the orchestrator show how to launch subagents (Agent tool call pattern)?",
      critical: true,
    },
  ];
}();
