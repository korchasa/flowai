import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const EngineerAiIdePluginTriggerFalse1 = new class
  extends AcceptanceTestScenario {
  id = "engineer-ai-ide-plugin-trigger-false-1";
  name = "browser extension concept question";
  skill = "engineer-ai-ide-plugin";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Explain the difference between browser extensions and editor plugins conceptually. Do not create any plugin files or implementation plan.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `engineer-ai-ide-plugin`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `engineer-ai-ide-plugin/SKILL.md` or calling the `Skill` tool with `engineer-ai-ide-plugin`.",
    critical: true,
  }];
}();
