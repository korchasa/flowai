import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const InteractiveTeachingMaterialsTriggerPos1 = new class
  extends AcceptanceTestScenario {
  id = "interactive-teaching-materials-trigger-pos-1";
  name = "explorable tutorial request";
  skill = "interactive-teaching-materials";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  /**
   * The query deliberately avoids artifact-shaped phrasing — "build me a page",
   * "open it in the browser", "clickable HTML". The host CLI ships its own
   * artifact skills (`artifact-design`, `web-artifacts-builder`) whose triggers
   * fire on exactly those words and whose subject is page design, not teaching
   * a process. The same collision cost `engineer-prompts-for-reasoning` five
   * runs to `claude-api` before the model name was changed. What is left names
   * the need instead of the medium: a reader stepping through state
   * transitions, which is this skill's subject and nobody else's.
   */
  userQuery =
    "Our on-call runbook explains the TCP handshake in prose and nobody retains it. Turn it into an explorable teaching material where the reader steps through each state transition and sees what changes at each step.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `interactive-teaching-materials` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `interactive-teaching-materials`.",
    critical: true,
  }];
}();
