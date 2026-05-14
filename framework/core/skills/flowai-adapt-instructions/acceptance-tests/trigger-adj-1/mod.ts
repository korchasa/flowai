import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: flowai-engineer-rule (authoring/editing AGENTS.md rules content,
// not realigning structure with the upstream template).
export const AdaptInstructionsTriggerAdj1 = new class
  extends AcceptanceTestScenario {
  id = "flowai-adapt-instructions-trigger-adj-1";
  name = "add a new rule to AGENTS.md (adjacent)";
  skill = "flowai-adapt-instructions";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Please add a new code-style rule to AGENTS.md saying that all log messages must be in English.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-adapt-instructions`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-adapt-instructions/SKILL.md` or calling the `Skill` tool with `flowai-adapt-instructions`.",
    critical: true,
  }];
}();
