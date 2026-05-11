import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const MaintenanceToolingRelevanceBench = new class
  extends AcceptanceTestScenario {
  id = "flowai-skill-maintenance-tooling-relevance";
  name = "Tooling Relevance Check (Interactive)";
  skill = "flowai-skill-maintenance";
  stepTimeoutMs = 420_000;
  interactive = true;
  userPersona =
    'You are a developer who wants to review tooling issues. When asked how to proceed, say "Tooling Relevance". When asked about individual fixes, say "Apply fix" for each one.';
  agentsTemplateVars = {
    PROJECT_NAME: "RelevanceTarget",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  userQuery =
    "/flowai-skill-maintenance. Use only standard CLI tools like cat, ls, grep.";

  checklist = [
    {
      id: "numbered_summary",
      description:
        "Did the agent present a numbered summary of findings grouped by category, before asking the user how to proceed?",
      critical: true,
    },
    {
      id: "asks_how_to_proceed",
      description:
        'Did the agent ask the user how to proceed after the summary (offering options like "all", specific numbers, category name, or "done")?',
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
      id: "interactive_resolution",
      description:
        "Did the agent enter an interactive resolution loop for the tooling relevance findings, asking the user about individual findings (apply/skip/edit)?",
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
