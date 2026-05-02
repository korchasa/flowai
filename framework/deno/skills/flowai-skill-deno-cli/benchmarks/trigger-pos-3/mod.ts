import { BenchmarkSkillScenario } from "@bench/types.ts";

export const DenoCliTriggerPos3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-deno-cli-trigger-pos-3";
  name = "format and lint local checkout";
  skill = "flowai-skill-deno-cli";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Format the code and run the linter across the repo before I push.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-deno-cli` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-deno-cli`.",
    critical: true,
  }];
}();
