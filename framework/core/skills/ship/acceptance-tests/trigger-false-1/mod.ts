import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: asks what a review idiom means; nothing is to be built or shipped.
export const ShipTriggerFalse1 = new class extends AcceptanceTestScenario {
  id = "ship-trigger-false-1";
  name = "question about the phrase ship it";
  skill = "ship";
  agentsTemplateVars = {
    PROJECT_NAME: "Sandbox",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  userQuery =
    'In code review comments, what does "ship it" mean? Just explain the phrase.';
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `ship`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `ship/SKILL.md` or calling the `Skill` tool with `ship`.",
    critical: true,
  }];
}();
