import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: in-domain ("audit" wording) but the intent is general code linting,
// not a memex structural check.
export const MemexAuditTriggerFalse2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-memex-audit-trigger-false-2";
  name = "general code linting (wrong intent)";
  skill = "flowai-skill-memex-audit";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Audit the TypeScript codebase for unused exports, missing return types, and any other lint smells you can find.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-memex-audit`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-memex-audit/SKILL.md` or calling the `Skill` tool with `flowai-skill-memex-audit`.",
    critical: true,
  }];
}();
