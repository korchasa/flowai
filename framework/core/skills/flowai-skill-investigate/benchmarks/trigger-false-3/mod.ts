import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: meta question about how the investigate workflow runs, not a
// request to perform an investigation.
export const InvestigateTriggerFalse3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-investigate-trigger-false-3";
  name = "meta question about the workflow";
  skill = "flowai-skill-investigate";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "When would the flowai investigation workflow be a better fit than just reading the stack trace? I want to understand it conceptually.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-investigate`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-investigate/SKILL.md` or calling the `Skill` tool with `flowai-skill-investigate`.",
    critical: true,
  }];
}();
