import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-setup-agent-code-style-ts-deno (the user's
// project is a Deno project, so the Deno-flavored variant is the correct match).
export const TsStrictStyleTriggerAdj1 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-setup-agent-code-style-ts-strict-trigger-adj-1";
  name = "deno project (adjacent)";
  skill = "flowai-skill-setup-agent-code-style-ts-strict";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "This is a Deno + TypeScript codebase. Capture the standard code-style rules in AGENTS.md so future sessions don't drift.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-setup-agent-code-style-ts-strict`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-setup-agent-code-style-ts-strict/SKILL.md` or calling the `Skill` tool with `flowai-skill-setup-agent-code-style-ts-strict`.",
    critical: true,
  }];
}();
