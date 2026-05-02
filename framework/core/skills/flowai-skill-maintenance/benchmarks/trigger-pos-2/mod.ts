import { BenchmarkSkillScenario } from "@bench/types.ts";

export const MaintenanceTriggerPos2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-maintenance-trigger-pos-2";
  name = "lead-engineer scan";
  skill = "flowai-skill-maintenance";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Do a lead-engineer-style sweep of the codebase across all the standard categories — architecture, tests, deps, docs, security — and let's resolve issues together.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-maintenance` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-maintenance`.",
    critical: true,
  }];
}();
