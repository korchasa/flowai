import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: meta question about how the devcontainer skill works — the
// user is researching, not asking us to set one up.
export const SetupAiIdeDevcontainerTriggerFalse2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-setup-ai-ide-devcontainer-trigger-false-2";
  name = "meta question about the workflow";
  skill = "flowai-skill-setup-ai-ide-devcontainer";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "What does flowai's AI-IDE devcontainer setup typically include? I'm just trying to decide if it's worth using.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-setup-ai-ide-devcontainer`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-setup-ai-ide-devcontainer/SKILL.md` or calling the `Skill` tool with `flowai-skill-setup-ai-ide-devcontainer`.",
    critical: true,
  }];
}();
