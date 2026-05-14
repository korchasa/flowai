import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const EngineerHookTriggerPos1 = new class
  extends AcceptanceTestScenario {
  id = "flowai-engineer-hook-trigger-pos-1";
  name = "auto-format on save";
  skill = "flowai-engineer-hook";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Whenever the agent edits a TypeScript file, I want deno fmt to run on it automatically afterward. Help me wire that up.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-engineer-hook` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-engineer-hook`.",
    critical: true,
  }];
}();
