import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * Positive trigger: the framework was upgraded and the user asks to bring the
 * project's AGENTS.md in line with the current flowai templates.
 */
export const UpdateTriggerPos1 = new class extends AcceptanceTestScenario {
  id = "update-trigger-pos-1";
  name = "reconcile AGENTS.md with new templates";
  skill = "update";
  agentsTemplateVars = {
    PROJECT_NAME: "Sandbox",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override sandboxState = {
    commits: [],
    expectedOutcome:
      "Agent recognises a template-reconciliation request and loads the update skill",
  };

  userQuery =
    "We just upgraded the flowai framework. Bring our AGENTS.md in line with the current flowai templates.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `update` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `update`.",
    critical: true,
  }];
}();
