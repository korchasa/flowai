import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-analyze-context (token-usage estimation /
// cost analysis, not introspection of decisions and process).
export const ReflectTriggerAdj2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-reflect-trigger-adj-2";
  name = "estimate token cost (adjacent)";
  skill = "flowai-skill-reflect";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Estimate how many tokens this conversation has consumed so far — system prompt, history, active rules — and what it costs at current pricing.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-reflect`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-reflect/SKILL.md` or calling the `Skill` tool with `flowai-skill-reflect`.",
    critical: true,
  }];
}();
