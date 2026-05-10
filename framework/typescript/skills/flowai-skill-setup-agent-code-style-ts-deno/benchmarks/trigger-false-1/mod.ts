import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: Deno/TS surface match, but the request is a code refactor, not
// adding style rules to AGENTS.md.
export const TsDenoStyleTriggerFalse1 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-setup-agent-code-style-ts-deno-trigger-false-1";
  name = "Deno code refactor";
  skill = "flowai-skill-setup-agent-code-style-ts-deno";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Refactor this Deno function to use async/await instead of `.then()` chains, and add proper type annotations.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-setup-agent-code-style-ts-deno`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-setup-agent-code-style-ts-deno/SKILL.md` or calling the `Skill` tool with `flowai-skill-setup-agent-code-style-ts-deno`.",
    critical: true,
  }];
}();
