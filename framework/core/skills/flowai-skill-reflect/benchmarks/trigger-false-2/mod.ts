import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: meta question about how the reflect workflow works, not a
// request to perform reflection on this session.
export const ReflectTriggerFalse2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-reflect-trigger-false-2";
  name = "meta question about the workflow";
  skill = "flowai-skill-reflect";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "What does flowai's session-reflection workflow look like end-to-end? I want to read about it before I run it later.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-reflect`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-reflect/SKILL.md` or calling the `Skill` tool with `flowai-skill-reflect`.",
    critical: true,
  }];
}();
