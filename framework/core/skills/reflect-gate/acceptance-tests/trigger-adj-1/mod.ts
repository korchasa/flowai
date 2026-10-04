import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: reflect — analysis only; the user forbids file changes, so the
// edit-and-commit gate should stand down.
export const ReflectGateTriggerAdj1 = new class extends AcceptanceTestScenario {
  id = "reflect-gate-trigger-adj-1";
  name = "analysis-only reflection (adjacent)";
  skill = "reflect-gate";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };

  userQuery =
    "Reflect on this session — where did you waste effort and what could be improved? Just report, don't change any files.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `reflect-gate`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `reflect-gate/SKILL.md` or calling the `Skill` tool with `reflect-gate`.",
    critical: true,
  }];
}();
