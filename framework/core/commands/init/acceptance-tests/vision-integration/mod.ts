import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { copyRecursive } from "@acceptance-tests/utils.ts";

export const InitVisionIntegrationBench = new class
  extends AcceptanceTestScenario {
  id = "init-vision-integration";
  name = "Init Project with Vision Integration (No vision.md)";
  skill = "init";
  stepTimeoutMs = 600_000;
  // The runner renders a root AGENTS.md from these vars BEFORE the agent
  // starts. They must agree with interview_data.json below: on 2026-09-02 a
  // template name of "InitTestProject" against "SuperApp" in the interview
  // data was a genuine contradiction, the agent stopped to ask which name is
  // canonical, and this non-interactive scenario ended on that question.
  agentsTemplateVars = {
    PROJECT_NAME: "SuperApp",
    TOOLING_STACK: "- Deno\n- TypeScript",
  };

  override async setup(sandboxPath: string) {
    // 1. Copy the init skill files (scripts, assets) to the sandbox
    const sourceInitDir = join(
      Deno.cwd(),
      "framework/core/commands/init",
    );
    const destInitDir = join(sandboxPath, ".cursor/skills/init");

    await Deno.mkdir(destInitDir, { recursive: true });
    await copyRecursive(sourceInitDir, destInitDir);

    // 2. Pre-create interview_data.json to simulate a completed interview
    const interviewData = {
      project_name: "SuperApp",
      vision_statement: "A super app for everything.",
      target_audience: "Everyone.",
      problem_statement: "Too many apps.",
      solution_differentiators: "One app.",
      risks_assumptions: "None.",
      stack: ["Deno", "TypeScript"],
      architecture: "Monolith",
      key_decisions: "Use Deno",
      preferences: ["tdd"],
      // Both booleans are part of the interview schema the skill documents;
      // leaving them out is a missing input the agent is right to ask about.
      use_deno_tooling: true,
      use_devcontainer: false,
    };

    await Deno.writeTextFile(
      join(sandboxPath, "interview_data.json"),
      JSON.stringify(interviewData, null, 2),
    );
  }

  userQuery =
    "/init. I have already prepared 'interview_data.json'. Please skip the interview and proceed directly to generating the assets.";

  // The harness places a root AGENTS.md before the agent starts, so the skill's
  // per-file diff confirmation applies to it and the agent ends its turn on the
  // question. Without an emulated user that question ends the run with nothing
  // written (observed 2026-09-02 on codex). The persona only approves.
  interactive = true;
  userPersona =
    `You are a developer who has already filled in interview_data.json and wants the assets generated from it.
When shown a diff or proposal for AGENTS.md or any other file, approve it (say 'yes').
When asked for the application entry point (the fixture ships none), say: use src/main.ts and create it.
When asked about a devcontainer, decline it.
When asked anything else, confirm the agent's proposal. Keep answers brief.`;

  checklist = [
    {
      id: "agents_md_created",
      description:
        "Was the root AGENTS.md written with the project's own information from interview_data.json? The benchmark harness places a generic AGENTS.md in the sandbox BEFORE the agent starts, so the file always pre-exists — judge whether the agent filled it from the interview data, not whether it created the file from nothing.",
      critical: true,
    },
    {
      id: "vision_in_agents_md",
      description:
        "Does AGENTS.md contain the Vision section with 'SuperApp' details?",
      critical: true,
    },
    {
      id: "no_vision_md",
      description: "Ensure documents/vision.md does NOT exist.",
      critical: true,
    },
  ];
}();
