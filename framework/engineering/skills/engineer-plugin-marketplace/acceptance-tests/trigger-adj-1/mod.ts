import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const EngineerPluginMarketplaceTriggerAdj1 = new class
  extends AcceptanceTestScenario {
  id = "engineer-plugin-marketplace-trigger-adj-1";
  name = "single skill creation (adjacent)";
  skill = "engineer-plugin-marketplace";
  // Adjacent skill: engineer-skill (one skill, no marketplace), which lives in
  // the `devtools` pack — mount it so the agent can defer to it instead of
  // over-triggering the marketplace skill.
  extraPacks = ["devtools"];
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Create a project skill for Cursor that teaches database migration naming conventions. I am not publishing it anywhere: no plugin marketplace, no catalog and no release sync.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `engineer-plugin-marketplace`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `engineer-plugin-marketplace/SKILL.md` or calling the `Skill` tool with `engineer-plugin-marketplace`.",
    critical: true,
  }];
}();
