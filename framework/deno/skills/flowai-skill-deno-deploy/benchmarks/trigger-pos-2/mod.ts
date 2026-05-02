import { BenchmarkSkillScenario } from "@bench/types.ts";

export const DenoDeployTriggerPos2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-deno-deploy-trigger-pos-2";
  name = "tail logs of cloud deployment";
  skill = "flowai-skill-deno-deploy";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Pull the live request logs from our hosted edge service so I can see what's happening with the 500 errors users are reporting.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-deno-deploy` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-deno-deploy`.",
    critical: true,
  }];
}();
