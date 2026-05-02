import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: vocabulary match ("reflection") but the request is for a code
// reflection-API question, not a session self-review.
export const ReflectTriggerFalse3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-reflect-trigger-false-3";
  name = "code-level reflection api";
  skill = "flowai-skill-reflect";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "How do I use TypeScript's reflect-metadata to read decorator arguments at runtime? Show a small example.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-reflect`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-reflect/SKILL.md` or calling the `Skill` tool with `flowai-skill-reflect`.",
    critical: true,
  }];
}();
