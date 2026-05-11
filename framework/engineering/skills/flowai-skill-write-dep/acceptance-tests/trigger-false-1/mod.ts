import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: technical-writing surface match, but request is release notes,
// not a DEP.
export const WriteDepTriggerFalse1 = new class extends AcceptanceTestScenario {
  id = "flowai-skill-write-dep-trigger-false-1";
  name = "release notes request";
  skill = "flowai-skill-write-dep";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Write a one-pager release note for v2.3 that highlights the auth changes for our users.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-write-dep`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-write-dep/SKILL.md` or calling the `Skill` tool with `flowai-skill-write-dep`.",
    critical: true,
  }];
}();
