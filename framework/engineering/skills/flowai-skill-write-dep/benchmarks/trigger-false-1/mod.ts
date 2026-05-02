import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: meta question about the proposal format, not a request to draft
// one.
export const WriteDepTriggerFalse1 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-write-dep-trigger-false-1";
  name = "meta question about DEP format";
  skill = "flowai-skill-write-dep";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "What sections does a Development Enhancement Proposal usually have, and how is it different from an RFC in your view?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-write-dep`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-write-dep/SKILL.md` or calling the `Skill` tool with `flowai-skill-write-dep`.",
    critical: true,
  }];
}();
