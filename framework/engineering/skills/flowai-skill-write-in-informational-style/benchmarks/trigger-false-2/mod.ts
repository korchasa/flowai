import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: writing the opposite register (persuasive marketing) is not the
// informational style.
export const WriteInInformationalStyleTriggerFalse2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-write-in-informational-style-trigger-false-2";
  name = "persuasive marketing copy (false-use)";
  skill = "flowai-skill-write-in-informational-style";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Write a punchy, persuasive landing-page hero that hooks visitors emotionally and makes them want to sign up immediately.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-write-in-informational-style`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-write-in-informational-style/SKILL.md` or calling the `Skill` tool with `flowai-skill-write-in-informational-style`.",
    critical: true,
  }];
}();
