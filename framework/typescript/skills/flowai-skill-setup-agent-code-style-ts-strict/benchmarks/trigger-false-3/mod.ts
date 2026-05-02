import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: non-strict TS configuration — user explicitly says strict is off,
// so even though they want code-style rules, this skill is the wrong choice.
export const TsStrictStyleTriggerFalse3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-setup-agent-code-style-ts-strict-trigger-false-3";
  name = "non-strict TS configuration (false-use)";
  skill = "flowai-skill-setup-agent-code-style-ts-strict";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Our legacy frontend has `strict: false` and we can't flip it for now. Still, write down some code-style guidance in AGENTS.md so the assistant doesn't make things worse.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-setup-agent-code-style-ts-strict`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-setup-agent-code-style-ts-strict/SKILL.md` or calling the `Skill` tool with `flowai-skill-setup-agent-code-style-ts-strict`.",
    critical: true,
  }];
}();
