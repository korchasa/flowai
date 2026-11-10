import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: engineer-hook (a script that intercepts and rejects a
// command is a hook, not a written rule). It lives in this scenario's own
// pack, so no extra pack is mounted.
export const EngineerRuleTriggerAdj1 = new class
  extends AcceptanceTestScenario {
  id = "engineer-rule-trigger-adj-1";
  name = "block a command with a script (adjacent)";
  skill = "engineer-rule";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Stop the agent from ever running `git push --force` in this project: I want a script that intercepts the command before it runs and rejects it.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `engineer-rule`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `engineer-rule/SKILL.md` or calling the `Skill` tool with `engineer-rule`.",
    critical: true,
  }];
}();
