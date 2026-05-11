import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const DenoDeployTriggerPos1 = new class extends AcceptanceTestScenario {
  id = "flowai-skill-deno-deploy-trigger-pos-1";
  name = "ship to deno deploy production";
  skill = "flowai-skill-deno-deploy";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Ship the current branch to production on Deno's hosted platform. Promote it from preview once the build is green.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-deno-deploy` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-deno-deploy`.",
    critical: true,
  }];
}();
