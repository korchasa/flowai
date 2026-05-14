import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const ReflectTriggerPos1 = new class extends AcceptanceTestScenario {
  id = "flowai-reflect-trigger-pos-1";
  name = "current-session reflection";
  skill = "flowai-reflect";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Reflect on this session — where did you waste effort, where did you get stuck, what could be improved next time?";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-reflect` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-reflect`.",
    critical: true,
  }];
}();
