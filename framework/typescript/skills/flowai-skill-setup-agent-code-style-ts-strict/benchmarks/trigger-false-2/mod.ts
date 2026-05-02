import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: surface vocabulary match ("strict TypeScript", "AGENTS.md") but
// the user is asking us to fix existing strict-mode type errors, not to author
// style rules.
export const TsStrictStyleTriggerFalse2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-setup-agent-code-style-ts-strict-trigger-false-2";
  name = "fix existing strict-mode errors (false-use)";
  skill = "flowai-skill-setup-agent-code-style-ts-strict";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "We just turned on strict mode and now `tsc` is throwing 47 errors across the repo. Walk through them and fix the ones in `src/api/`.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-setup-agent-code-style-ts-strict`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-setup-agent-code-style-ts-strict/SKILL.md` or calling the `Skill` tool with `flowai-skill-setup-agent-code-style-ts-strict`.",
    critical: true,
  }];
}();
