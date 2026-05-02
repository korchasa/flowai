import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: vocabulary match (devcontainer) but the user wants debugging
// help with an existing one, not a fresh setup.
export const SetupAiIdeDevcontainerTriggerFalse3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-setup-ai-ide-devcontainer-trigger-false-3";
  name = "debug existing devcontainer";
  skill = "flowai-skill-setup-ai-ide-devcontainer";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "My existing devcontainer fails to start with `error: feature 'common-utils' not found`. What's wrong with my config?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-setup-ai-ide-devcontainer`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-setup-ai-ide-devcontainer/SKILL.md` or calling the `Skill` tool with `flowai-skill-setup-ai-ide-devcontainer`.",
    critical: true,
  }];
}();
