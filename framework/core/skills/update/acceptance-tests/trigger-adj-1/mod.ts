import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: adapt — the user leaves AGENTS.md alone and asks to tailor
// the installed skills and agents to the project.
export const UpdateTriggerAdj1 = new class extends AcceptanceTestScenario {
  id = "update-trigger-adj-1";
  name = "tailor installed skills (adjacent)";
  skill = "update";
  agentsTemplateVars = {
    PROJECT_NAME: "Sandbox",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  userQuery =
    "Leave AGENTS.md alone. Tailor the installed flowai skills and agents to our conventions: Deno, and `deno task check` is our only gate.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `update`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `update/SKILL.md` or calling the `Skill` tool with `update`.",
    critical: true,
  }];
}();
