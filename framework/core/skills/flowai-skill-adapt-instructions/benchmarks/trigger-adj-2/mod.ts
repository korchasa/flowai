import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-setup-agent-code-style-ts-deno (initial setup of
// code-style rules in AGENTS.md, not template realignment).
export const AdaptInstructionsTriggerAdj2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-adapt-instructions-trigger-adj-2";
  name = "initial code-style setup (adjacent)";
  skill = "flowai-skill-adapt-instructions";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "We're starting a new Deno project. Set up the standard Deno/TypeScript code-style guidelines in AGENTS.md.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-adapt-instructions`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-adapt-instructions/SKILL.md` or calling the `Skill` tool with `flowai-skill-adapt-instructions`.",
    critical: true,
  }];
}();
