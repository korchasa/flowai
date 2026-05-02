import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-memex-save — user wants to ingest a new source
// into the memex, not audit the existing structure.
export const MemexAuditTriggerAdj3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-memex-audit-trigger-adj-3";
  name = "save-to-memex query (adjacent)";
  skill = "flowai-skill-memex-audit";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Take this whitepaper PDF and add it into our knowledge bank — extract the key entities and link it to whatever is already there.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-memex-audit`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-memex-audit/SKILL.md` or calling the `Skill` tool with `flowai-skill-memex-audit`.",
    critical: true,
  }];
}();
