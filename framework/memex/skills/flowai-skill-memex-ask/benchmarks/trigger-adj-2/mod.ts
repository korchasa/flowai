import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-deep-research — user wants a fresh web investigation,
// not a recall against the local knowledge bank.
export const MemexAskTriggerAdj2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-memex-ask-trigger-adj-2";
  name = "live-web research query (adjacent)";
  skill = "flowai-skill-memex-ask";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Do a deep dive on the current state of WebGPU compute support across browsers in 2026 — I need fresh sources from the web, not what we have on file.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-memex-ask`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-memex-ask/SKILL.md` or calling the `Skill` tool with `flowai-skill-memex-ask`.",
    critical: true,
  }];
}();
