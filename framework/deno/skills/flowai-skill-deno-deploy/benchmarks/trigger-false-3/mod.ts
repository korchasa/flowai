import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: business/comms question about a launch that "deploy" appears in,
// not anything to do with the deploy platform.
export const DenoDeployTriggerFalse3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-deno-deploy-trigger-false-3";
  name = "launch comms wording (false-use)";
  skill = "flowai-skill-deno-deploy";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "We're about to deploy the new pricing page next Tuesday. Help me draft a short Slack announcement for the team.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-deno-deploy`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-deno-deploy/SKILL.md` or calling the `Skill` tool with `flowai-skill-deno-deploy`.",
    critical: true,
  }];
}();
