import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: meta question about why GODS exists, not a request to write a
// task in GODS format.
export const WriteGodsTasksTriggerFalse1 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-write-gods-tasks-trigger-false-1";
  name = "meta question about GODS";
  skill = "flowai-skill-write-gods-tasks";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Why does our team prefer GODS over plain user-story format? Just curious about the reasoning — no need to draft anything.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-write-gods-tasks`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-write-gods-tasks/SKILL.md` or calling the `Skill` tool with `flowai-skill-write-gods-tasks`.",
    critical: true,
  }];
}();
