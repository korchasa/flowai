import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-epic (multi-phase epic plan for executing a
// large change — not a proposal document arguing why to do it).
export const WriteDepTriggerAdj3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-write-dep-trigger-adj-3";
  name = "execution epic plan (adjacent)";
  skill = "flowai-skill-write-dep";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Lay out a multi-phase plan to actually execute the migration to event sourcing — phases, dependencies, atomic tasks per phase.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-write-dep`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-write-dep/SKILL.md` or calling the `Skill` tool with `flowai-skill-write-dep`.",
    critical: true,
  }];
}();
