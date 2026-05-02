import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: meta question about the epic workflow, not a request to produce one.
export const EpicTriggerFalse2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-epic-trigger-false-2";
  name = "meta question about epics";
  skill = "flowai-skill-epic";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "How does flowai's epic workflow differ from a regular planning task? I'm trying to decide which to use later.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-epic`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-epic/SKILL.md` or calling the `Skill` tool with `flowai-skill-epic`.",
    critical: true,
  }];
}();
