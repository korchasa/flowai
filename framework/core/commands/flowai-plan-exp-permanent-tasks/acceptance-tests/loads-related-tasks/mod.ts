import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Verifies that flowai-plan-exp-permanent-tasks Step 2 (Deep Context) loads
// related tasks: tasks whose implements: intersects the planned task's
// implements: should be named in chat as loaded context; tasks that share NO
// FR with the planned task should NOT be loaded.
//
// Fixture seeds two pre-existing tasks:
//   - documents/tasks/2026/04/add-login-form.md   (implements: FR-AUTH-LOGIN)
//   - documents/tasks/2026/04/add-profile-edit.md (implements: FR-PROFILE-EDIT)
// User query plans a new task that touches FR-AUTH-LOGIN — agent must load
// add-login-form (intersection match) and skip add-profile-edit (no match).
export const PlanExpLoadsRelatedTasksBench = new class
  extends AcceptanceTestScenario {
  id = "flowai-plan-exp-permanent-tasks-loads-related-tasks";
  name = "Step 2 loads tasks whose implements intersects";
  skill = "flowai-plan-exp-permanent-tasks";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };
  interactive = true;
  userPersona =
    "A pragmatic developer. When asked to choose a variant, pick the first one. Keep answers short.";

  userQuery =
    "/flowai-plan-exp-permanent-tasks Plan adding password-reset to the login flow. Touches FR-AUTH-LOGIN. Look for any related prior tasks before drafting.";

  checklist = [
    {
      id: "loads_related_login_task",
      description:
        "In Step 2 (Deep Context), did the agent identify and name `add-login-form` (under documents/tasks/2026/04/) as a related task because its `implements:` includes FR-AUTH-LOGIN, which is also in the planned task's implements? The agent must explicitly mention this prior task in chat as loaded context.",
      critical: true,
    },
    {
      id: "skips_unrelated_profile_task",
      description:
        "Did the agent CORRECTLY skip `add-profile-edit` (under documents/tasks/2026/04/) — its `implements:` is FR-PROFILE-EDIT which has no intersection with the planned task's FR-AUTH-LOGIN? The unrelated task must NOT appear as loaded context.",
      critical: true,
    },
    {
      id: "task_file_at_new_path",
      description:
        "Did the agent create the new task file at `documents/tasks/<YYYY>/<MM>/<slug>.md` (date hierarchy directories, slug without date prefix)?",
      critical: true,
    },
  ];
}();
