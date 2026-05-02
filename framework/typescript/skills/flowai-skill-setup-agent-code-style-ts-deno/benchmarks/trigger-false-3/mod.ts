import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: runtime-agnostic style advice (general TypeScript naming) — not
// Deno-specific code-style rules.
export const TsDenoStyleTriggerFalse3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-setup-agent-code-style-ts-deno-trigger-false-3";
  name = "generic TS naming conventions (false-use)";
  skill = "flowai-skill-setup-agent-code-style-ts-deno";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Give me your opinion on naming conventions in TypeScript in general — interfaces vs types, PascalCase vs camelCase, that kind of thing.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-setup-agent-code-style-ts-deno`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-setup-agent-code-style-ts-deno/SKILL.md` or calling the `Skill` tool with `flowai-skill-setup-agent-code-style-ts-deno`.",
    critical: true,
  }];
}();
