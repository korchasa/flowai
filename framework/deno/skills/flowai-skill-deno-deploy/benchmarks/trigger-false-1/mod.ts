import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: meta question about the deploy workflow — informational, not a
// concrete deploy action.
export const DenoDeployTriggerFalse1 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-deno-deploy-trigger-false-1";
  name = "meta question about deploy workflow";
  skill = "flowai-skill-deno-deploy";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "What's the difference between the Build, Dev, and Prod contexts on Deno's hosting platform, conceptually? Just curious.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-deno-deploy`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-deno-deploy/SKILL.md` or calling the `Skill` tool with `flowai-skill-deno-deploy`.",
    critical: true,
  }];
}();
