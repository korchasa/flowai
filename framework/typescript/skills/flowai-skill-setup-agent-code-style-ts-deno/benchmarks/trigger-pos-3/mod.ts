import { BenchmarkSkillScenario } from "@bench/types.ts";

export const TsDenoStyleTriggerPos3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-setup-agent-code-style-ts-deno-trigger-pos-3";
  name = "missing deno-flavored conventions in AGENTS.md";
  skill = "flowai-skill-setup-agent-code-style-ts-deno";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Our AGENTS.md has nothing about how to write idiomatic Deno code. Add the code-style guidelines so future sessions stay consistent.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-setup-agent-code-style-ts-deno` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-setup-agent-code-style-ts-deno`.",
    critical: true,
  }];
}();
