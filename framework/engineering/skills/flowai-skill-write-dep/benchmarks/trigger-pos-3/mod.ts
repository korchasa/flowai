import { BenchmarkSkillScenario } from "@bench/types.ts";

export const WriteDepTriggerPos3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-write-dep-trigger-pos-3";
  name = "proposal document for refactor";
  skill = "flowai-skill-write-dep";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I need a written enhancement proposal that argues why we should split the monolith into a worker tier — formal doc, suitable for team review.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-write-dep` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-write-dep`.",
    critical: true,
  }];
}();
