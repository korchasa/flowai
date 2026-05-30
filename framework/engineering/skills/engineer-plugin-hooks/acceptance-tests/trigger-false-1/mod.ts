import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const EngineerPluginHooksTriggerFalse1 = new class
  extends AcceptanceTestScenario {
  id = "engineer-plugin-hooks-trigger-false-1";
  name = "React hooks explanation";
  skill = "engineer-plugin-hooks";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Explain React hooks like useEffect and useMemo. This is frontend learning, not AI IDE plugin lifecycle hooks.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `engineer-plugin-hooks`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `engineer-plugin-hooks/SKILL.md` or calling the `Skill` tool with `engineer-plugin-hooks`.",
    critical: true,
  }];
}();
