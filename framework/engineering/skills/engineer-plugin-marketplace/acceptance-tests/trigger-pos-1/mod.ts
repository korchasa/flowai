import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const EngineerPluginMarketplaceTriggerPos1 = new class
  extends AcceptanceTestScenario {
  id = "engineer-plugin-marketplace-trigger-pos-1";
  name = "plugin marketplace design";
  skill = "engineer-plugin-marketplace";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I need the workflow for designing an AI IDE plugin marketplace for Claude Code and Codex. Do not implement or fetch full docs; briefly confirm the marketplace-level checklist and name related plugin/MCP/hook/skill-authoring skills.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `engineer-plugin-marketplace` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `engineer-plugin-marketplace`.",
    critical: true,
  }];
}();
