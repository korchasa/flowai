import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const EngineerAiIdePluginTriggerPos1 = new class
  extends AcceptanceTestScenario {
  id = "engineer-ai-ide-plugin-trigger-pos-1";
  name = "AI IDE plugin design";
  skill = "engineer-ai-ide-plugin";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Help me design an AI IDE plugin that works in both Claude Code and Codex, with skills, MCP tools, hooks, local marketplace packaging, and official documentation checks.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `engineer-ai-ide-plugin` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `engineer-ai-ide-plugin`.",
    critical: true,
  }];
}();
