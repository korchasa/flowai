import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: flowai-reflect-by-history (review of PAST sessions
// from IDE transcripts, not the current conversation).
export const ReflectTriggerAdj1 = new class extends AcceptanceTestScenario {
  id = "flowai-reflect-trigger-adj-1";
  name = "historical multi-session review (adjacent)";
  skill = "flowai-reflect";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Look across the last two weeks of my Claude Code transcripts and find recurring patterns I should fix in our skills or rules.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-reflect`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-reflect/SKILL.md` or calling the `Skill` tool with `flowai-reflect`.",
    critical: true,
  }];
}();
