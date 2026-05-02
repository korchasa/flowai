import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: meta question about what informational style is, not a request
// to write or rewrite anything in it.
export const WriteInInformationalStyleTriggerFalse1 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-write-in-informational-style-trigger-false-1";
  name = "meta question about the style";
  skill = "flowai-skill-write-in-informational-style";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "How would you define informational writing style? What separates it from journalistic or persuasive registers, briefly?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-write-in-informational-style`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-write-in-informational-style/SKILL.md` or calling the `Skill` tool with `flowai-skill-write-in-informational-style`.",
    critical: true,
  }];
}();
