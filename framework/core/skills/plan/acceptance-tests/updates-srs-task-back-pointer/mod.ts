import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Verifies FR-DOC-TASK-LINK: `plan` inserts/extends `- **Tasks:**`
// back-pointers directly after `**Description:**` in SRS sections.
export const PlanUpdatesSrsBackPointerBench = new class
  extends AcceptanceTestScenario {
  id = "plan-updates-srs-task-back-pointer";
  name = "writes **Tasks:** SRS back-pointer";
  skill = "plan";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };
  interactive = true;
  userPersona =
    "A pragmatic developer. When asked to choose a variant, pick the first one. Keep answers short.";

  userQuery =
    "/plan Plan refactoring the cart UI: extract `<CartItem>` and `<CartList>` components, simplify add/remove handlers. Implements FR-CART-ADD and FR-CART-REMOVE.";

  checklist = [
    {
      id: "inserts_tasks_bullet_for_fr_cart_add",
      description:
        "After the SRS back-pointer step, does `documents/requirements.md`'s `### FR-CART-ADD` section contain a new bullet using SALP form `- **Tasks:** [REF:task:<YYYY>-<MM>-<slug> | <slug>]` placed directly after the existing `- **Description:**` bullet? The task slug must match the just-created task file. (A GFM-link form `[<slug>](tasks/...)` IS NOT acceptable — SALP is the canonical grammar.)",
      critical: true,
    },
    {
      id: "extends_tasks_bullet_for_fr_cart_remove",
      description:
        "Does `### FR-CART-REMOVE` section's existing `- **Tasks:** [REF:task:2026-03-old-cart-remove-rework | old-cart-remove-rework]` bullet now have `, [REF:task:<YYYY>-<MM>-<new-slug> | <new-slug>]` appended to the same line in SALP form?",
      critical: true,
    },
    {
      id: "srs_edit_scope_limited",
      description:
        "Compare the post-run `documents/requirements.md` with the fixture version. Only the two `**Tasks:**` lines should change. Every other line must be byte-identical to the fixture.",
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
