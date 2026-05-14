import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: flowai-setup-agent-code-style-ts-deno (Deno-specific
// code-style scaffold, not a general rule-authoring task).
export const EngineerRuleTriggerAdj1 = new class
  extends AcceptanceTestScenario {
  id = "flowai-engineer-rule-trigger-adj-1";
  name = "deno code-style scaffold (adjacent)";
  skill = "flowai-engineer-rule";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Set up the standard Deno + TypeScript code-style guidelines in this project so the agent knows our linting and formatting conventions.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-engineer-rule`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-engineer-rule/SKILL.md` or calling the `Skill` tool with `flowai-engineer-rule`.",
    critical: true,
  }];
}();
