import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-configure-deno-commands (set up the standard
// task interface in deno.json/scripts/) — different from container setup.
export const SetupAiIdeDevcontainerTriggerAdj3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-setup-ai-ide-devcontainer-trigger-adj-3";
  name = "set up deno tasks (adjacent)";
  skill = "flowai-skill-setup-ai-ide-devcontainer";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Set up the standard `check`, `test`, and `dev` deno tasks for this project so my CI can call them.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-setup-ai-ide-devcontainer`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-setup-ai-ide-devcontainer/SKILL.md` or calling the `Skill` tool with `flowai-skill-setup-ai-ide-devcontainer`.",
    critical: true,
  }];
}();
