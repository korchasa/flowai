import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: configure-deno-commands (the project's check, test and dev
// tasks) — setting up task commands is a different concern from a devcontainer.
// It lives in core, which the runner always mounts.
export const SetupAiIdeDevcontainerTriggerAdj1 = new class
  extends AcceptanceTestScenario {
  id = "setup-ai-ide-devcontainer-trigger-adj-1";
  name = "deno task commands (adjacent)";
  skill = "setup-ai-ide-devcontainer";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Set up the standard check, test and dev commands in deno.json for this project, with the scripts they call.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `setup-ai-ide-devcontainer`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `setup-ai-ide-devcontainer/SKILL.md` or calling the `Skill` tool with `setup-ai-ide-devcontainer`.",
    critical: true,
  }];
}();
