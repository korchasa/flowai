import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: archiving sessions is the topic, but the user asks how it works and does not want this session closed.
export const FinishSessionTriggerFalse1 = new class
  extends AcceptanceTestScenario {
  id = "finish-session-trigger-false-1";
  name = "question about archiving sessions";
  skill = "finish-session";
  agentsTemplateVars = {
    PROJECT_NAME: "Sandbox",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  userQuery =
    "How do AI coding tools usually archive old sessions, and can an archived one be reopened? Just explain, don't close or archive anything.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `finish-session`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `finish-session/SKILL.md` or calling the `Skill` tool with `finish-session`.",
    critical: true,
  }];
}();
