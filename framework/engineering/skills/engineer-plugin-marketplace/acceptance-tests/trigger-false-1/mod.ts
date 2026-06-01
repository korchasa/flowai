import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const EngineerPluginMarketplaceTriggerFalse1 = new class
  extends AcceptanceTestScenario {
  id = "engineer-plugin-marketplace-trigger-false-1";
  name = "marketplace concept question";
  skill = "engineer-plugin-marketplace";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Explain the difference between an app store marketplace and an open source package registry at a conceptual level. Do not design AI IDE plugins or write an implementation plan.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `engineer-plugin-marketplace`? For this query the skill is not appropriate; the agent should answer conceptually without reading `engineer-plugin-marketplace/SKILL.md` or calling the `Skill` tool with `engineer-plugin-marketplace`.",
    critical: true,
  }];
}();
