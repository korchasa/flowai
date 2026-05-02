import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: code-comment writing is technical commentary, not informational
// prose authoring.
export const WriteInInformationalStyleTriggerFalse3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-write-in-informational-style-trigger-false-3";
  name = "add JSDoc comments (false-use)";
  skill = "flowai-skill-write-in-informational-style";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Add JSDoc comments to every exported function in src/billing.ts explaining the why and the parameters, but keep them terse.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-write-in-informational-style`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-write-in-informational-style/SKILL.md` or calling the `Skill` tool with `flowai-skill-write-in-informational-style`.",
    critical: true,
  }];
}();
