import { BenchmarkSkillScenario } from "@bench/types.ts";

export const SetupAiIdeDevcontainerTriggerPos1 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-setup-ai-ide-devcontainer-trigger-pos-1";
  name = "set up devcontainer for ai ide";
  skill = "flowai-skill-setup-ai-ide-devcontainer";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Set up a .devcontainer for this project so I can use Claude Code in a sandbox with our skills mounted and security hardening applied.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-setup-ai-ide-devcontainer` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-setup-ai-ide-devcontainer`.",
    critical: true,
  }];
}();
