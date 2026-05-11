import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: audit-style request, but target is repo Markdown, not the
// memex knowledge bank.
export const MemexAuditTriggerFalse1 = new class
  extends AcceptanceTestScenario {
  id = "flowai-skill-memex-audit-trigger-false-1";
  name = "markdown lint of repo README";
  skill = "flowai-skill-memex-audit";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Run a markdown lint on README.md and fix the heading-level mistakes you find.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-memex-audit`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-memex-audit/SKILL.md` or calling the `Skill` tool with `flowai-skill-memex-audit`.",
    critical: true,
  }];
}();
