import { BenchmarkSkillScenario } from "@bench/types.ts";

export const DenoCliTriggerPos2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-deno-cli-trigger-pos-2";
  name = "add a dependency in deno";
  skill = "flowai-skill-deno-cli";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I need to pull in the std assert module here. What's the right way to add it as a dependency?";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-deno-cli` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-deno-cli`.",
    critical: true,
  }];
}();
