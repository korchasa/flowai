import { BenchmarkSkillScenario } from "@bench/types.ts";

export const TsDenoStyleTriggerPos2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-setup-agent-code-style-ts-deno-trigger-pos-2";
  name = "initial setup of fresh deno repo";
  skill = "flowai-skill-setup-agent-code-style-ts-deno";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I'm bootstrapping a new Deno + TypeScript repo. Set up the agent guidelines so it knows our code-style conventions from day one.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-setup-agent-code-style-ts-deno` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-setup-agent-code-style-ts-deno`.",
    critical: true,
  }];
}();
