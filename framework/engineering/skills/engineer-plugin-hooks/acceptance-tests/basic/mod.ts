import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const EngineerPluginHooksBasic = new class
  extends AcceptanceTestScenario {
  id = "engineer-plugin-hooks-basic";
  name = "Create AI IDE Plugin Hook Adapters";
  skill = "engineer-plugin-hooks";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "PluginKit",
    TOOLING_STACK: "- Shell\n- TypeScript",
  };

  userQuery =
    "Design plugin hook adapters that block shell commands containing DEPLOY_PROD in Claude Code and Codex, while sharing one policy implementation.";

  checklist = [
    {
      id: "official_docs_first",
      description:
        "Did the agent consult or explicitly require current official hook documentation links for each target host before fixing hook event names, matcher fields, block outputs, or validation commands?",
      critical: true,
    },
    {
      id: "shared_policy",
      description:
        "Did the agent separate shared policy logic from host-specific hook wrappers?",
      critical: true,
    },
    {
      id: "claude_semantics",
      description:
        "Did the agent tie Claude Code hook event, matcher, and blocking semantics to the current official Claude Code hooks docs instead of treating cached schema details as authoritative?",
      critical: true,
    },
    {
      id: "codex_semantics",
      description:
        "Did the agent tie Codex hook event, matcher, and blocking semantics to the current official Codex hooks docs instead of treating cached schema details as authoritative?",
      critical: true,
    },
    {
      id: "interactive_caveat",
      description:
        "Did the agent mention that Codex interactive hook validation differs from codex exec behavior?",
      critical: false,
    },
  ];
}();
