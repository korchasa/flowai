import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: meta question about strict mode itself, not a request to apply
// the skill to AGENTS.md.
export const TsStrictStyleTriggerFalse1 = new class
  extends AcceptanceTestScenario {
  id = "flowai-skill-setup-agent-code-style-ts-strict-trigger-false-1";
  name = "meta question about strict mode";
  skill = "flowai-skill-setup-agent-code-style-ts-strict";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "What does TypeScript's `strict` flag actually turn on under the hood, and which sub-flags matter most in day-to-day code?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-setup-agent-code-style-ts-strict`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-setup-agent-code-style-ts-strict/SKILL.md` or calling the `Skill` tool with `flowai-skill-setup-agent-code-style-ts-strict`.",
    critical: true,
  }];
}();
