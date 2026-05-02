import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-deep-research (the user wants research with
// citations and synthesis — that is the research skill, not a tone rewrite).
export const WriteInInformationalStyleTriggerAdj3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-write-in-informational-style-trigger-adj-3";
  name = "researched, cited synthesis (adjacent)";
  skill = "flowai-skill-write-in-informational-style";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Research the current state of WebGPU adoption across browsers and give me a cited synthesis with sources I can verify.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-write-in-informational-style`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-write-in-informational-style/SKILL.md` or calling the `Skill` tool with `flowai-skill-write-in-informational-style`.",
    critical: true,
  }];
}();
