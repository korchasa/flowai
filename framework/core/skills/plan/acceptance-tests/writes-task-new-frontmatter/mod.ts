import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Verifies that `plan` writes the task at the committed-task date hierarchy
// path with the required frontmatter shape.
export const PlanWritesTaskBench = new class extends AcceptanceTestScenario {
  id = "plan-writes-task-new-frontmatter";
  name = "writes task at YYYY/MM path with new frontmatter";
  skill = "plan";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- Node.js\n- Express",
  };
  interactive = true;
  userPersona =
    "A pragmatic developer who prefers the simplest approach. When asked to choose a variant, pick variant A (or the first/simplest one). Keep answers short.";

  userQuery =
    "/plan Plan a new feature to add a '/healthz' endpoint that returns 200 OK. The project is a simple Node.js Express server. The server file is index.js. No other constraints.";

  checklist = [
    {
      id: "task_file_at_new_path",
      description:
        "Did the agent create the task file at a path matching `documents/tasks/<YYYY>/<MM>/<slug>.md` (date hierarchy directories, slug without date prefix)? Inspect the agent logs and the GENERATED FILES list.",
      critical: true,
    },
    {
      id: "frontmatter_has_date",
      description:
        "Does the task file's YAML frontmatter contain a `date:` field with a value matching `YYYY-MM-DD` format?",
      critical: true,
    },
    {
      id: "frontmatter_has_status_to_do",
      description:
        "Does the task file's frontmatter contain `status: to do` (the initial value for a freshly-created task with all DoD items unchecked)?",
      critical: true,
    },
    {
      id: "frontmatter_has_implements",
      description:
        "Does the task file's frontmatter contain an `implements:` key (may be empty for purely operational tasks, but the key must be present)?",
      critical: true,
    },
    {
      id: "frontmatter_has_tags_and_related_tasks",
      description:
        "Does the task file's frontmatter contain `tags:` and `related_tasks:` keys (may be empty arrays, but the keys must be present)?",
      critical: true,
    },
    {
      id: "gods_structure",
      description:
        "Does the body follow GODS — sections `## Goal`, `## Overview` (with `### Context`, `### Current State`, `### Constraints`), `## Definition of Done`, and `## Solution`?",
      critical: true,
    },
    {
      id: "no_code_changes",
      description:
        "Did the agent NOT modify any source code files (only created/wrote files under `documents/`)?",
      critical: true,
    },
  ];
}();
