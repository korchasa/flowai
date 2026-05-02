import { BenchmarkSkillScenario } from "@bench/types.ts";

export const MemexAuditTriggerPos2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-memex-audit-trigger-pos-2";
  name = "knowledge-bank consistency check with auto-fix";
  skill = "flowai-skill-memex-audit";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Please check the knowledge bank for missing sections and contradictions, and auto-fix the trivial stuff while you're at it.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-memex-audit` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-memex-audit`.",
    critical: true,
  }];
}();
