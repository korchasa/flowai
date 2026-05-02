import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: source-code question about the live session, not a memex recall.
export const MemexAskTriggerFalse2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-memex-ask-trigger-false-2";
  name = "source-code question (out of scope)";
  skill = "flowai-skill-memex-ask";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Open `src/queue/worker.ts` and tell me what the `drain()` method does line by line.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-memex-ask`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-memex-ask/SKILL.md` or calling the `Skill` tool with `flowai-skill-memex-ask`.",
    critical: true,
  }];
}();
