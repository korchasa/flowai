import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-engineer-rule (creating a persistent file-scoped
// AI rule, not editing AGENTS.md).
export const TsStrictStyleTriggerAdj2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-setup-agent-code-style-ts-strict-trigger-adj-2";
  name = "create persistent AI rule (adjacent)";
  skill = "flowai-skill-setup-agent-code-style-ts-strict";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Create a persistent rule that scopes to `src/db/**/*.ts` and tells the assistant to always wrap queries in transactions. Set it up the right way for the IDE.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-setup-agent-code-style-ts-strict`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-setup-agent-code-style-ts-strict/SKILL.md` or calling the `Skill` tool with `flowai-skill-setup-agent-code-style-ts-strict`.",
    critical: true,
  }];
}();
