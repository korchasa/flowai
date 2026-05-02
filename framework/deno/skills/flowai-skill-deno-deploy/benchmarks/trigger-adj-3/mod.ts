import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-investigate (root-cause diagnosis of an
// intermittent bug — not cloud-deploy-specific operations).
export const DenoDeployTriggerAdj3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-deno-deploy-trigger-adj-3";
  name = "investigate flaky behavior (adjacent)";
  skill = "flowai-skill-deno-deploy";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Some users intermittently see stale data after refreshing. Walk through hypotheses with me and figure out the actual cause — don't patch anything yet.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-deno-deploy`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-deno-deploy/SKILL.md` or calling the `Skill` tool with `flowai-skill-deno-deploy`.",
    critical: true,
  }];
}();
