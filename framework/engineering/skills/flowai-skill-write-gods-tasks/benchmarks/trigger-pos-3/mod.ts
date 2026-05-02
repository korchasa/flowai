import { BenchmarkSkillScenario } from "@bench/types.ts";

export const WriteGodsTasksTriggerPos3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-write-gods-tasks-trigger-pos-3";
  name = "rewrite messy task in GODS";
  skill = "flowai-skill-write-gods-tasks";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I jotted down a sloppy task description in notes.md. Rewrite it cleanly using the GODS task structure with FR-IDs and evidence commands.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-write-gods-tasks` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-write-gods-tasks`.",
    critical: true,
  }];
}();
