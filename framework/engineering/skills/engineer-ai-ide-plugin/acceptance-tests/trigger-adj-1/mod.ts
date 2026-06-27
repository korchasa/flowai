import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const EngineerAiIdePluginTriggerAdj1 = new class
  extends AcceptanceTestScenario {
  id = "engineer-ai-ide-plugin-trigger-adj-1";
  name = "single skill creation (adjacent)";
  skill = "engineer-ai-ide-plugin";
  // Adjacent skill: engineer-skill (single skill, no plugin packaging), which
  // lives in the `devtools` pack — mount it so the agent can defer to it
  // instead of over-triggering the broader plugin skill.
  extraPacks = ["devtools"];
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Create a project skill for Cursor that teaches database migration naming conventions. It does not need plugin packaging, MCP, hooks, or marketplace installation.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `engineer-ai-ide-plugin`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `engineer-ai-ide-plugin/SKILL.md` or calling the `Skill` tool with `engineer-ai-ide-plugin`.",
    critical: true,
  }];
}();
