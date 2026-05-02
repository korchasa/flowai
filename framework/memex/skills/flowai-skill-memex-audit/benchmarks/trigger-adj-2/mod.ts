import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-review — user wants a code-change review of
// uncommitted edits, not a structural audit of the knowledge bank.
export const MemexAuditTriggerAdj2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-memex-audit-trigger-adj-2";
  name = "uncommitted code review (adjacent)";
  skill = "flowai-skill-memex-audit";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Review my staged diff before I commit — verdict on quality, missed cleanup, and whether the task is actually done.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-memex-audit`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-memex-audit/SKILL.md` or calling the `Skill` tool with `flowai-skill-memex-audit`.",
    critical: true,
  }];
}();
