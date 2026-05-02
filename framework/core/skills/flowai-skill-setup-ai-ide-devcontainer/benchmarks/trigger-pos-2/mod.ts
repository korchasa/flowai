import { BenchmarkSkillScenario } from "@bench/types.ts";

export const SetupAiIdeDevcontainerTriggerPos2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-setup-ai-ide-devcontainer-trigger-pos-2";
  name = "generate devcontainer.json + dockerfile";
  skill = "flowai-skill-setup-ai-ide-devcontainer";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Generate a devcontainer.json and a Dockerfile for our Deno project that integrates the OpenCode CLI and the flowai resources properly.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-setup-ai-ide-devcontainer` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-setup-ai-ide-devcontainer`.",
    critical: true,
  }];
}();
