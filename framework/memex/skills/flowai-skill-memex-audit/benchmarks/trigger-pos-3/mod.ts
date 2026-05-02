import { BenchmarkSkillScenario } from "@bench/types.ts";

export const MemexAuditTriggerPos3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-memex-audit-trigger-pos-3";
  name = "verify index drift in the memex";
  skill = "flowai-skill-memex-audit";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "The memex index feels stale — can you verify it against the actual pages, find any contradictions, and report back what's broken?";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-memex-audit` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-memex-audit`.",
    critical: true,
  }];
}();
