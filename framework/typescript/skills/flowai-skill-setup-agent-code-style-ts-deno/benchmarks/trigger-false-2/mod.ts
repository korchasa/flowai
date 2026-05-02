import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: surface vocabulary match ("Deno", "AGENTS.md") but the user wants
// a single-file refactor, not project-wide style rules.
export const TsDenoStyleTriggerFalse2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-setup-agent-code-style-ts-deno-trigger-false-2";
  name = "single-file refactor in deno repo (false-use)";
  skill = "flowai-skill-setup-agent-code-style-ts-deno";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "In our Deno repo, refactor `src/utils/format.ts` to extract the date helpers into their own file. Keep behavior identical.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-setup-agent-code-style-ts-deno`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-setup-agent-code-style-ts-deno/SKILL.md` or calling the `Skill` tool with `flowai-skill-setup-agent-code-style-ts-deno`.",
    critical: true,
  }];
}();
