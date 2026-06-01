import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const EngineerPluginMarketplaceTriggerAdj1 = new class
  extends AcceptanceTestScenario {
  id = "engineer-plugin-marketplace-trigger-adj-1";
  name = "single plugin package design";
  skill = "engineer-plugin-marketplace";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Design one Claude Code and Codex plugin named review-guard. It needs skills, one MCP server, hooks, assets, manifests, and local installation instructions, but I am not creating a multi-plugin marketplace or release sync repository.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `engineer-plugin-marketplace`? For this query the more specific `engineer-ai-ide-plugin` skill is appropriate; the agent should not read `engineer-plugin-marketplace/SKILL.md` or call the `Skill` tool with `engineer-plugin-marketplace`.",
    critical: true,
  }];
}();
