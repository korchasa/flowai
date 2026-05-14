import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const InvestigateTriggerPos1 = new class extends AcceptanceTestScenario {
  id = "flowai-investigate-trigger-pos-1";
  name = "intermittent failure root cause";
  skill = "flowai-investigate";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Our payment webhook fails maybe 1 out of 20 times with no clear pattern. I need a hypothesis-by-hypothesis investigation to find the root cause — don't fix it yet, just diagnose.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-investigate` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-investigate`.",
    critical: true,
  }];
}();
