import { BenchmarkSkillScenario } from "@bench/types.ts";

export const SetupAiIdeDevcontainerTriggerPos3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-setup-ai-ide-devcontainer-trigger-pos-3";
  name = "sandbox dev environment for agents";
  skill = "flowai-skill-setup-ai-ide-devcontainer";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I want a containerized dev environment where AI CLIs can run with limited permissions, our skills are mounted in, and the host machine is protected. Help me set it up.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-setup-ai-ide-devcontainer` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-setup-ai-ide-devcontainer`.",
    critical: true,
  }];
}();
