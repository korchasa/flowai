import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: surface vocabulary match ("deno", "run") but the user is asking
// for a Node.js → Deno porting strategy, not local CLI invocation.
export const DenoCliTriggerFalse2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-deno-cli-trigger-false-2";
  name = "node-to-deno porting strategy (false-use)";
  skill = "flowai-skill-deno-cli";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "We have a small Node service and I'm weighing whether to port it to Deno. What does the rewrite usually involve and is it worth it?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-deno-cli`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-deno-cli/SKILL.md` or calling the `Skill` tool with `flowai-skill-deno-cli`.",
    critical: true,
  }];
}();
