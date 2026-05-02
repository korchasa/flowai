import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: reviewing an existing proposal is critique, not authoring a new
// DEP document.
export const WriteDepTriggerFalse3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-write-dep-trigger-false-3";
  name = "review an existing proposal (false-use)";
  skill = "flowai-skill-write-dep";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Read the proposal in docs/proposals/cache-rewrite.md and tell me where the argument is weakest — don't rewrite it, just critique it.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-write-dep`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-write-dep/SKILL.md` or calling the `Skill` tool with `flowai-skill-write-dep`.",
    critical: true,
  }];
}();
