import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: deploy target is Vercel, not Deno Deploy.
export const DenoDeployTriggerFalse1 = new class
  extends AcceptanceTestScenario {
  id = "flowai-deno-deploy-trigger-false-1";
  name = "deploy to a different platform";
  skill = "flowai-deno-deploy";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Deploy this app to Vercel — set up the project with the right framework preset and environment variables.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-deno-deploy`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-deno-deploy/SKILL.md` or calling the `Skill` tool with `flowai-deno-deploy`.",
    critical: true,
  }];
}();
