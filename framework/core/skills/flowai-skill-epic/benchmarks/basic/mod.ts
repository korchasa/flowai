import { BenchmarkSkillScenario } from "@bench/types.ts";

export const EpicBasicBench = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-epic-basic";
  name = "Basic Epic Generation";
  skill = "flowai-skill-epic";
  stepTimeoutMs = 420_000;
  agentsTemplateVars = {
    PROJECT_NAME: "flowai",
    TOOLING_STACK: "- TypeScript\n- Deno",
    ARCHITECTURE:
      "- `framework/skills/*/SKILL.md` — Product skills\n- `documents/` — SRS/SDS documentation\n- `scripts/` — Build and verification tooling",
  };

  userQuery =
    "/flowai-skill-epic Create an epic for adding skill versioning to the project. Skills should have semver versions in frontmatter, and the framework should support loading specific versions. The project uses Deno/TypeScript, skills are in framework/skills/*/SKILL.md.";

  interactive = true;
  userPersona =
    "You are a developer who wants skill versioning. When asked for phase approval, approve without changes. When asked about critique, agree to critique. When asked which critique points to address, say 'all'. Keep answers brief.";
  maxSteps = 25;

  checklist = [
    {
      id: "epic_file_created",
      description:
        "Did the agent create an epic file matching 'documents/tasks/epic-*.md'?",
      critical: true,
    },
    {
      id: "goal_section",
      description:
        "Does the epic contain a '## Goal' section with business value?",
      critical: true,
    },
    {
      id: "non_goals_section",
      description:
        "Does the epic contain a '## Non-Goals' section with at least one explicit exclusion?",
      critical: true,
    },
    {
      id: "boundaries_section",
      description:
        "Does the epic contain '## Architecture & Boundaries' with Always/Ask First/Never subsections?",
      critical: true,
    },
    {
      id: "phases_present",
      description:
        "Does the epic contain at least 2 phases with Status, Prerequisites, Goal, Scope, Tasks, and Verification?",
      critical: true,
    },
    {
      id: "phases_in_chat",
      description:
        "Did the agent present phase decomposition in chat BEFORE writing phases to the file?",
      critical: true,
    },
    {
      id: "critique_offered",
      description:
        "Did the agent offer to critique the epic after detailing phases?",
      critical: false,
    },
    {
      id: "definition_of_done",
      description:
        "Does the epic contain a '## Definition of Done' section with measurable criteria?",
      critical: true,
    },
    {
      id: "only_epic_file_modified",
      description:
        "Did the agent ONLY create/modify 'documents/tasks/epic-*.md' and NOT touch any source code files?",
      critical: true,
    },
    {
      id: "phase_size_guard",
      description:
        "Does each phase contain no more than 50 requirements/tasks?",
      critical: false,
    },
    {
      id: "task_file_target",
      description: "Do individual tasks target 5 or fewer files each?",
      critical: false,
    },
    {
      id: "no_switch_mode",
      description: "Did the logs NOT contain 'SwitchMode'?",
      critical: true,
    },
    {
      id: "dependency_ordering",
      description:
        "Do phases have dependency ordering with prerequisites (no circular dependencies)?",
      critical: false,
    },
  ];
}();
