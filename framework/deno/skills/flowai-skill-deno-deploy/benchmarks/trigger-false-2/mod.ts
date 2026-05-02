import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: surface vocabulary match ("deploy", "rollback") but the user is
// asking about a non-Deno PaaS (Vercel/Netlify/Fly), not Deno's hosted platform.
export const DenoDeployTriggerFalse2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-deno-deploy-trigger-false-2";
  name = "deploy on non-deno platform (false-use)";
  skill = "flowai-skill-deno-deploy";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Our app on Fly.io got a bad release out and we need to roll back to the previous revision. Walk me through it.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-deno-deploy`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-deno-deploy/SKILL.md` or calling the `Skill` tool with `flowai-skill-deno-deploy`.",
    critical: true,
  }];
}();
