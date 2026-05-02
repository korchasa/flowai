import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-engineer-hook (creating event hooks for agent
// behavior) — different concern from setting up the container itself.
export const SetupAiIdeDevcontainerTriggerAdj2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-setup-ai-ide-devcontainer-trigger-adj-2";
  name = "create a Claude Code hook (adjacent)";
  skill = "flowai-skill-setup-ai-ide-devcontainer";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I want a pre-tool-use hook that blocks the agent from running `rm -rf` anywhere outside the workspace. Help me create it.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-setup-ai-ide-devcontainer`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-setup-ai-ide-devcontainer/SKILL.md` or calling the `Skill` tool with `flowai-skill-setup-ai-ide-devcontainer`.",
    critical: true,
  }];
}();
