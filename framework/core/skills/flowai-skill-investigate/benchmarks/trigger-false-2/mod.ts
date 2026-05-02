import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: obvious bug — user already pinpointed the cause; explicitly
// excluded by the description ("fix this bug" when the cause is obvious).
export const InvestigateTriggerFalse2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-investigate-trigger-false-2";
  name = "obvious bug, just fix it";
  skill = "flowai-skill-investigate";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I forgot to await the fetch call in handlers/users.ts line 42 — that's why the response is empty. Fix it.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-investigate`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-investigate/SKILL.md` or calling the `Skill` tool with `flowai-skill-investigate`.",
    critical: true,
  }];
}();
