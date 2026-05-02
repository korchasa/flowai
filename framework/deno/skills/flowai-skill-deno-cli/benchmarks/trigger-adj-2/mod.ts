import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-configure-deno-commands (sets up the canonical
// check/test/dev/prod tasks in deno.json — not ad-hoc CLI invocation).
export const DenoCliTriggerAdj2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-deno-cli-trigger-adj-2";
  name = "configure standard deno tasks (adjacent)";
  skill = "flowai-skill-deno-cli";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Set up the standard `check`, `test`, and `dev` task entries in deno.json so the whole team uses the same commands.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-deno-cli`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-deno-cli/SKILL.md` or calling the `Skill` tool with `flowai-skill-deno-cli`.",
    critical: true,
  }];
}();
