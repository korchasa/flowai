import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: flowai-write-dep (a Development Enhancement Proposal
// argues for a technical improvement; PRD is for product features).
export const WritePrdTriggerAdj1 = new class extends AcceptanceTestScenario {
  id = "flowai-write-prd-trigger-adj-1";
  name = "technical improvement proposal (adjacent)";
  skill = "flowai-write-prd";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Draft a proposal arguing why we should replace our hand-rolled retry loop with a battle-tested library — internal engineering doc, not user-facing.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-write-prd`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-write-prd/SKILL.md` or calling the `Skill` tool with `flowai-write-prd`.",
    critical: true,
  }];
}();
