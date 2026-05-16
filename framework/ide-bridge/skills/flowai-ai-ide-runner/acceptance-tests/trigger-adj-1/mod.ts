import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: flowai-deep-research (multi-agent fan-out for comprehensive
// research, not running an arbitrary prompt through external IDE CLIs).
export const AiIdeRunnerTriggerAdj1 = new class extends AcceptanceTestScenario {
  id = "flowai-ai-ide-runner-trigger-adj-1";
  name = "deep research fan-out (adjacent)";
  skill = "flowai-ai-ide-runner";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I need a thorough cited investigation of the current state of WASM component model adoption — spawn sub-agents and synthesize.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-ai-ide-runner`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-ai-ide-runner/SKILL.md` or calling the `Skill` tool with `flowai-ai-ide-runner`.",
    critical: true,
  }];
}();
