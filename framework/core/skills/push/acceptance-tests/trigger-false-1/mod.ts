import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: asks ABOUT force-push flags; nothing is to be pushed.
export const PushTriggerFalse1 = new class extends AcceptanceTestScenario {
  id = "push-trigger-false-1";
  name = "question about force push flags";
  skill = "push";
  agentsTemplateVars = {
    PROJECT_NAME: "Sandbox",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  userQuery =
    "What is the difference between `git push --force` and `git push --force-with-lease`? Just explain, don't push anything.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `push`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `push/SKILL.md` or calling the `Skill` tool with `push`.",
    critical: true,
  }];
}();
