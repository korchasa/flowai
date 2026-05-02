import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-configure-deno-commands (sets canonical task
// entries in deno.json — not deploying anything to the cloud).
export const DenoDeployTriggerAdj2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-deno-deploy-trigger-adj-2";
  name = "set up deno.json tasks (adjacent)";
  skill = "flowai-skill-deno-deploy";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Add a unified `deno task prod` entry that mirrors what we run in production, plus matching `dev` and `check` tasks.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-deno-deploy`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-deno-deploy/SKILL.md` or calling the `Skill` tool with `flowai-skill-deno-deploy`.",
    critical: true,
  }];
}();
