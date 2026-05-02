import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-fix-tests (a Deno test is failing — the user
// wants the test fixed, not generic CLI guidance).
export const DenoCliTriggerAdj3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-deno-cli-trigger-adj-3";
  name = "fix a failing deno test (adjacent)";
  skill = "flowai-skill-deno-cli";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "My `parseFlags` test started failing after I refactored argv handling yesterday. Figure out why and make it green again.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-deno-cli`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-deno-cli/SKILL.md` or calling the `Skill` tool with `flowai-skill-deno-cli`.",
    critical: true,
  }];
}();
