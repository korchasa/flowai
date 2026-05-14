import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: vocabulary collision — "rules of inference" is a logic concept, not
// an AI agent rule.
export const EngineerRuleTriggerFalse1 = new class
  extends AcceptanceTestScenario {
  id = "flowai-engineer-rule-trigger-false-1";
  name = "logic rules question (false-use)";
  skill = "flowai-engineer-rule";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Can you explain the agent rules of inference like modus ponens and hypothetical syllogism with a concrete example?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-engineer-rule`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-engineer-rule/SKILL.md` or calling the `Skill` tool with `flowai-engineer-rule`.",
    critical: true,
  }];
}();
