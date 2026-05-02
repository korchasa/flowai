import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-engineer-rule (creating a persistent rule file
// for a coding standard, not editing AGENTS.md).
export const TsDenoStyleTriggerAdj2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-setup-agent-code-style-ts-deno-trigger-adj-2";
  name = "create persistent AI rule (adjacent)";
  skill = "flowai-skill-setup-agent-code-style-ts-deno";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I want a persistent rule file that tells the assistant to always use named exports in our `src/api/**/*.ts` files. Set it up properly.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-setup-agent-code-style-ts-deno`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-setup-agent-code-style-ts-deno/SKILL.md` or calling the `Skill` tool with `flowai-skill-setup-agent-code-style-ts-deno`.",
    critical: true,
  }];
}();
