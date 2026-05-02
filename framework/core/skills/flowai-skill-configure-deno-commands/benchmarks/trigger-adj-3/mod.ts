import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-fix-tests (fixing failing test cases, not
// configuring the task pipeline).
export const ConfigureDenoCommandsTriggerAdj3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-configure-deno-commands-trigger-adj-3";
  name = "fix failing deno tests (adjacent)";
  skill = "flowai-skill-configure-deno-commands";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "`deno task test` is red — three tests in payments_test.ts are failing. Please fix them.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-configure-deno-commands`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-configure-deno-commands/SKILL.md` or calling the `Skill` tool with `flowai-skill-configure-deno-commands`.",
    critical: true,
  }];
}();
