import { BenchmarkSkillScenario } from "@bench/types.ts";

export const DenoDeployTriggerPos3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-deno-deploy-trigger-pos-3";
  name = "private npm dep on deploy build";
  skill = "flowai-skill-deno-deploy";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "The build on the cloud platform keeps failing because it can't pull our private npm package. Locally everything works. Sort it out.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-deno-deploy` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-deno-deploy`.",
    critical: true,
  }];
}();
