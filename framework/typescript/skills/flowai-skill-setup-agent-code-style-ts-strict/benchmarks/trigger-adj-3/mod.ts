import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-adapt-instructions (re-syncing AGENTS.md with the
// installed template — not adding a new code-style section).
export const TsStrictStyleTriggerAdj3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-setup-agent-code-style-ts-strict-trigger-adj-3";
  name = "re-sync AGENTS.md with template (adjacent)";
  skill = "flowai-skill-setup-agent-code-style-ts-strict";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "After upgrading flowai, my AGENTS.md no longer matches the shipped template. Realign it to the new template while keeping our project-specific sections intact.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-setup-agent-code-style-ts-strict`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-setup-agent-code-style-ts-strict/SKILL.md` or calling the `Skill` tool with `flowai-skill-setup-agent-code-style-ts-strict`.",
    critical: true,
  }];
}();
