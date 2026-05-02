import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: meta question about PRD format, not a request to write one.
export const WritePrdTriggerFalse1 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-write-prd-trigger-false-1";
  name = "meta question about PRDs";
  skill = "flowai-skill-write-prd";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "What sections does a strong product requirements document usually have? Just curious — I'm not writing one yet.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-write-prd`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-write-prd/SKILL.md` or calling the `Skill` tool with `flowai-skill-write-prd`.",
    critical: true,
  }];
}();
