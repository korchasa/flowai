import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: plain "what did you do?" recap, explicitly excluded — the user
// wants a status summary, not a structured self-reflection.
export const ReflectTriggerFalse1 = new class extends AcceptanceTestScenario {
  id = "flowai-reflect-trigger-false-1";
  name = "plain recap";
  skill = "flowai-reflect";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Quick recap — what did you change so far in this session? Just bullet points, please.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-reflect`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-reflect/SKILL.md` or calling the `Skill` tool with `flowai-reflect`.",
    critical: true,
  }];
}();
