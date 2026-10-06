import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: update — the project already carries a flowai AGENTS.md and
// the user wants it reconciled with the newer templates, not a first-time setup.
export const InitTriggerAdj1 = new class extends AcceptanceTestScenario {
  id = "init-trigger-adj-1";
  name = "refresh an existing AGENTS.md (adjacent)";
  skill = "init";
  agentsTemplateVars = {
    PROJECT_NAME: "Sandbox",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  userQuery =
    "Our AGENTS.md came from an older flowai release. Reconcile it with the current flowai templates and keep our own rules.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `init`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `init/SKILL.md` or calling the `Skill` tool with `init`.",
    critical: true,
  }];
}();
