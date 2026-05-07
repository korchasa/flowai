import { BenchmarkSkillScenario } from "@bench/types.ts";

// Verifies FR-DOC-TASK-LINK: flowai-plan-exp-permanent-tasks inserts/extends
// `- **Tasks:** [<slug>](tasks/<path>.md)` directly after `**Description:**`
// in each FR section listed in implements:.
//
// Fixture seeds requirements.md with two FR sections:
//   - FR-CART-ADD     — only **Description:**, no existing **Tasks:** line
//                       → expect new bullet inserted after **Description:**
//   - FR-CART-REMOVE  — has existing **Tasks:** [old-cart-remove-rework](...)
//                       → expect existing line extended with `, [<new>](...)`
//
// User query plans a new task implementing BOTH FRs. Checklist verifies:
// (1) insert-case bullet present, (2) extend-case bullet extended with comma,
// (3) edit scope is limited (other SRS lines byte-identical).
export const PlanExpUpdatesSrsBackPointerBench = new class
  extends BenchmarkSkillScenario {
  id = "flowai-plan-exp-permanent-tasks-updates-srs-task-back-pointer";
  name = "writes **Tasks:** SRS back-pointer (insert + extend)";
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
    "/flowai-plan-exp-permanent-tasks Plan refactoring the cart UI: extract `<CartItem>` and `<CartList>` components, simplify add/remove handlers. Implements FR-CART-ADD and FR-CART-REMOVE.";

  checklist = [
    {
      id: "inserts_tasks_bullet_for_fr_cart_add",
      description:
        "After Step 5c, does `documents/requirements.md`'s `### FR-CART-ADD` section contain a NEW bullet `- **Tasks:** [<slug>](tasks/<YYYY>/<MM>/<DD>/<slug>.md)` placed directly after the existing `- **Description:**` bullet? The slug must match the just-created task file. Before the run, FR-CART-ADD had no `**Tasks:**` line.",
      critical: true,
    },
    {
      id: "extends_tasks_bullet_for_fr_cart_remove",
      description:
        "After Step 5c, does `### FR-CART-REMOVE` section's existing `- **Tasks:** [old-cart-remove-rework](tasks/2026/03/01/old-cart-remove-rework.md)` bullet now have `, [<new-slug>](tasks/<YYYY>/<MM>/<DD>/<new-slug>.md)` appended to the same line (i.e. the existing link is preserved, not replaced; new link added as a comma-separated continuation, NOT as a duplicate `- **Tasks:**` bullet)?",
      critical: true,
    },
    {
      id: "srs_edit_scope_limited",
      description:
        "Compare the post-run `documents/requirements.md` with the fixture version. Only the two `**Tasks:**` lines should change (one inserted in FR-CART-ADD, one extended in FR-CART-REMOVE). Every other line — `# SRS`, `## 1. Intro`, `## 3. Functional Reqs`, the `**Description:**` bullets, `**Acceptance:**` and `**Status:**` lines, the section headings — must be BYTE-IDENTICAL to the fixture. Whitespace, blank lines, line ordering all unchanged.",
      critical: true,
    },
    {
      id: "task_file_at_new_path",
      description:
        "Did the agent create the new task file at `documents/tasks/<YYYY>/<MM>/<DD>/<slug>.md` (date hierarchy directories, slug without date prefix)?",
      critical: true,
    },
  ];
}();
