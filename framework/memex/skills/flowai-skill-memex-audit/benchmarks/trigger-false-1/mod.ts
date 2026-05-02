import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: meta question about how the memex-audit workflow operates,
// not a request to actually run the audit.
export const MemexAuditTriggerFalse1 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-memex-audit-trigger-false-1";
  name = "meta question about the skill";
  skill = "flowai-skill-memex-audit";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "What checks does the memex audit perform, and which of them are deterministic versus LLM-judged?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-memex-audit`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-memex-audit/SKILL.md` or calling the `Skill` tool with `flowai-skill-memex-audit`.",
    critical: true,
  }];
}();
