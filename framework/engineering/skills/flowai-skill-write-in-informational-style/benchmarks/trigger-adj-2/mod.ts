import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-write-dep (a Development Enhancement Proposal
// argues for a technical change; that is a document type, not a writing style).
export const WriteInInformationalStyleTriggerAdj2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-write-in-informational-style-trigger-adj-2";
  name = "DEP for technical improvement (adjacent)";
  skill = "flowai-skill-write-in-informational-style";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Draft an engineering enhancement proposal that argues for moving our session store from cookies to opaque tokens, with alternatives considered.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-write-in-informational-style`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-write-in-informational-style/SKILL.md` or calling the `Skill` tool with `flowai-skill-write-in-informational-style`.",
    critical: true,
  }];
}();
