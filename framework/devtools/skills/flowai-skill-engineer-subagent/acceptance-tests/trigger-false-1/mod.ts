import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: invoke an existing subagent, not author a new one.
export const EngineerSubagentTriggerFalse1 = new class
  extends AcceptanceTestScenario {
  id = "flowai-skill-engineer-subagent-trigger-false-1";
  name = "invoke an existing subagent";
  skill = "flowai-skill-engineer-subagent";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Spawn a code-reviewer subagent right now to look at my last commit and report any issues it finds.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-engineer-subagent`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-engineer-subagent/SKILL.md` or calling the `Skill` tool with `flowai-skill-engineer-subagent`.",
    critical: true,
  }];
}();
