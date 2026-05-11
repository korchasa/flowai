import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: small targeted edit to AGENTS.md — the skill explicitly excludes
// "small edits" and is reserved for structural template realignment.
export const AdaptInstructionsTriggerFalse1 = new class
  extends AcceptanceTestScenario {
  id = "flowai-skill-adapt-instructions-trigger-false-1";
  name = "tiny typo fix in AGENTS.md";
  skill = "flowai-skill-adapt-instructions";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Fix the typo in AGENTS.md where it says 'verfication' instead of 'verification'.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-adapt-instructions`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-adapt-instructions/SKILL.md` or calling the `Skill` tool with `flowai-skill-adapt-instructions`.",
    critical: true,
  }];
}();
