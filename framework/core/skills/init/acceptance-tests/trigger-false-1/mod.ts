import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: asks what AGENTS.md is for; nothing is to be initialised.
export const InitTriggerFalse1 = new class extends AcceptanceTestScenario {
  id = "init-trigger-false-1";
  name = "question about AGENTS.md";
  skill = "init";
  agentsTemplateVars = {
    PROJECT_NAME: "Sandbox",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  userQuery =
    "What is AGENTS.md for, and how is it different from README.md? Just explain, don't change any file.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `init`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `init/SKILL.md` or calling the `Skill` tool with `init`.",
    critical: true,
  }];
}();
