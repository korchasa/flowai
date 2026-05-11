import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: surface vocabulary match ("prompt", "instant") but the user wants
// help drafting a message to a coworker, nothing to do with LLM prompting.
export const EngineerPromptsForInstantTriggerFalse1 = new class
  extends AcceptanceTestScenario {
  id = "flowai-skill-engineer-prompts-for-instant-trigger-false-1";
  name = "human-to-human prompt for feedback";
  skill = "flowai-skill-engineer-prompts-for-instant";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "How do I prompt my coworker for instant feedback on this design without sounding pushy in Slack?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-engineer-prompts-for-instant`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-engineer-prompts-for-instant/SKILL.md` or calling the `Skill` tool with `flowai-skill-engineer-prompts-for-instant`.",
    critical: true,
  }];
}();
