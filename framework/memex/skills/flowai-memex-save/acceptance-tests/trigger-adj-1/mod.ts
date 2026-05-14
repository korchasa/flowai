import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: flowai-memex-ask — user is querying the memex, not
// providing a new source to persist.
export const MemexSaveTriggerAdj1 = new class extends AcceptanceTestScenario {
  id = "flowai-memex-save-trigger-adj-1";
  name = "ask-from-memex query (adjacent)";
  skill = "flowai-memex-save";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Check the project knowledge bank and tell me what we know about the on-call rotation policy — quote the source pages.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-memex-save`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-memex-save/SKILL.md` or calling the `Skill` tool with `flowai-memex-save`.",
    critical: true,
  }];
}();
