import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-deno-deploy (deploy to Deno Deploy cloud) —
// production deploy is a different concern from a local devcontainer.
export const SetupAiIdeDevcontainerTriggerAdj1 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-setup-ai-ide-devcontainer-trigger-adj-1";
  name = "deno deploy production (adjacent)";
  skill = "flowai-skill-setup-ai-ide-devcontainer";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Help me deploy this app to Deno Deploy with separate Build, Dev, and Prod contexts.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-setup-ai-ide-devcontainer`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-setup-ai-ide-devcontainer/SKILL.md` or calling the `Skill` tool with `flowai-skill-setup-ai-ide-devcontainer`.",
    critical: true,
  }];
}();
