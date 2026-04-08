import { BenchmarkSkillScenario } from "@bench/types.ts";

export const MaintenanceToolingRelevanceBench = new class
  extends BenchmarkSkillScenario {
  id = "flowai-maintenance-tooling-relevance";
  name = "Tooling Relevance Check";
  skill = "flowai-maintenance";
  stepTimeoutMs = 420_000;
  agentsTemplateVars = {
    PROJECT_NAME: "RelevanceTarget",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  userQuery =
    "/flowai-maintenance. Use only standard CLI tools like cat, ls, grep.";

  checklist = [
    {
      id: "whiteboard_report",
      description:
        "Did the agent create a maintenance report in 'documents/whiteboards/'?",
      critical: true,
    },
    {
      id: "irrelevant_skill_detected",
      description:
        "Did the report flag 'django-migrations' skill as irrelevant for a TypeScript/Deno project (no Python, no Django)?",
      critical: true,
    },
    {
      id: "irrelevant_agent_detected",
      description:
        "Did the report flag 'kubernetes-deployer' agent as irrelevant (no Kubernetes config or manifests in the project)?",
      critical: true,
    },
    {
      id: "irrelevant_hook_detected",
      description:
        "Did the report flag the Python linting hook (flake8/black) as irrelevant for a TypeScript/Deno project?",
      critical: true,
    },
    {
      id: "relevance_section",
      description:
        "Does the report have a dedicated section for tooling relevance (skills, agents, hooks alignment with the project stack)?",
      critical: true,
    },
    {
      id: "constructive_fixes",
      description:
        "Does every relevance issue have a proposed fix (remove, replace, or justify)?",
      critical: false,
    },
  ];
}();
