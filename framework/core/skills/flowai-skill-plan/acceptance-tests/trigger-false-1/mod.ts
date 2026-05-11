import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: vocabulary match ("plan to ship") but the user is asking about
// timing/scheduling, not requesting a planning artifact in documents/tasks/.
export const PlanTriggerFalse1 = new class extends AcceptanceTestScenario {
  id = "flowai-skill-plan-trigger-false-1";
  name = "scheduling question, not planning artifact";
  skill = "flowai-skill-plan";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "We plan to ship the new dashboard on Friday — given the open issues, do you think that's realistic?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-plan`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-plan/SKILL.md` or calling the `Skill` tool with `flowai-skill-plan`.",
    critical: true,
  }];
}();
