import { BenchmarkSkillScenario } from "@bench/types.ts";

export const MemexSaveTriggerPos2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-memex-save-trigger-pos-2";
  name = "ingest meeting notes into the knowledge bank";
  skill = "flowai-skill-memex-save";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Ingest these raw meeting notes into the knowledge bank: pull out the entities, link them properly, and update the activity log.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-memex-save` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-memex-save`.",
    critical: true,
  }];
}();
