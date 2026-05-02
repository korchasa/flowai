import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: vocabulary match (Dockerfile) but the user wants a production
// container image, not a development AI-IDE devcontainer.
export const SetupAiIdeDevcontainerTriggerFalse1 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-setup-ai-ide-devcontainer-trigger-false-1";
  name = "production dockerfile request";
  skill = "flowai-skill-setup-ai-ide-devcontainer";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Write a small production Dockerfile for our Node.js API server — multi-stage build, non-root user, ready to push to ECR.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-setup-ai-ide-devcontainer`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-setup-ai-ide-devcontainer/SKILL.md` or calling the `Skill` tool with `flowai-skill-setup-ai-ide-devcontainer`.",
    critical: true,
  }];
}();
