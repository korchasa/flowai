import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: deep-research (multi-agent fan-out for comprehensive
// research, not running an arbitrary prompt through external IDE CLIs).
//
// deep-research lives in the `engineering` pack while this skill lives in
// `beta`, and the runner mounts only `core` plus the scenario's own pack. Until
// 2026-08-20 the neighbour was therefore absent from the sandbox and the agent
// had nothing to defer to — the scenario asked it not to over-trigger while
// leaving it no alternative (FR-ACCEPT.TRIGGER, cross-pack adjacency).
export const AiIdeRunnerTriggerAdj1 = new class extends AcceptanceTestScenario {
  id = "ai-ide-runner-trigger-adj-1";
  name = "deep research fan-out (adjacent)";
  skill = "ai-ide-runner";
  extraPacks = ["engineering"];
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I need a thorough cited investigation of the current state of WASM component model adoption — spawn sub-agents and synthesize.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `ai-ide-runner`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `ai-ide-runner/SKILL.md` or calling the `Skill` tool with `ai-ide-runner`.",
    critical: true,
  }];
}();
