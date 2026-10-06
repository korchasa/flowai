import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * Positive trigger: the installed flowai skills are generic; the user asks to
 * tailor them to this project's stack.
 */
export const AdaptTriggerPos1 = new class extends AcceptanceTestScenario {
  id = "adapt-trigger-pos-1";
  name = "adapt installed primitives to the project";
  skill = "adapt";
  agentsTemplateVars = {
    PROJECT_NAME: "Sandbox",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override sandboxState = {
    commits: [],
    expectedOutcome:
      "Agent recognises a primitive-adaptation request and loads the adapt skill",
  };

  userQuery =
    "The flowai skills installed in this repo are generic. Adapt them to this project's specifics — we use Deno and TypeScript.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `adapt` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `adapt`.",
    critical: true,
  }];
}();
