import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: deploy (deploy to Deno Deploy cloud) —
// production deploy is a different concern from a local devcontainer.
export const SetupAiIdeDevcontainerTriggerAdj1 = new class
  extends AcceptanceTestScenario {
  id = "setup-ai-ide-devcontainer-trigger-adj-1";
  name = "deno deploy production (adjacent)";
  skill = "setup-ai-ide-devcontainer";
  // Mount the `deno` pack so the correct adjacent skill (`deploy`) is installed
  // and the agent has a neighbour to defer to instead of over-triggering.
  extraPacks = ["deno"];
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Help me deploy this app to Deno Deploy with separate Build, Dev, and Prod contexts.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `setup-ai-ide-devcontainer`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `setup-ai-ide-devcontainer/SKILL.md` or calling the `Skill` tool with `setup-ai-ide-devcontainer`.",
    critical: true,
  }];
}();
