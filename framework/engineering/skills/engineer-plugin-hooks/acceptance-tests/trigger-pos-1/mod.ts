import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const EngineerPluginHooksTriggerPos1 = new class
  extends AcceptanceTestScenario {
  id = "engineer-plugin-hooks-trigger-pos-1";
  name = "universal hook adapters";
  skill = "engineer-plugin-hooks";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Create plugin hook adapters for Claude Code and Codex that share policy code and block risky Bash commands.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `engineer-plugin-hooks` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `engineer-plugin-hooks`.",
    critical: true,
  }];
}();
