import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-deep-research (multi-agent fan-out for comprehensive
// research, not running an arbitrary prompt through external IDE CLIs).
export const AiIdeRunnerTriggerAdj1 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-ai-ide-runner-trigger-adj-1";
  name = "deep research fan-out (adjacent)";
  skill = "flowai-skill-ai-ide-runner";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I need a thorough cited investigation of the current state of WASM component model adoption — spawn sub-agents and synthesize.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-ai-ide-runner`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-ai-ide-runner/SKILL.md` or calling the `Skill` tool with `flowai-skill-ai-ide-runner`.",
    critical: true,
  }];
}();
