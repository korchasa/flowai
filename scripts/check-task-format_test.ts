import { assertEquals } from "@std/assert";
import {
  classifyTaskPath,
  deriveStatusFromDoD,
  validateLegacyTask,
  validateNewShapeTask,
} from "./check-task-format.ts";

// --- classifyTaskPath ---

Deno.test("classifyTaskPath: new-shape canonical path", () => {
  assertEquals(
    classifyTaskPath("documents/tasks/2026/05/some-slug.md"),
    "new-shape",
  );
});

Deno.test("classifyTaskPath: legacy flat dated path", () => {
  assertEquals(
    classifyTaskPath("documents/tasks/2026-05-07-some-slug.md"),
    "legacy",
  );
});

Deno.test("classifyTaskPath: legacy flat undated path", () => {
  assertEquals(
    classifyTaskPath("documents/tasks/just-a-slug.md"),
    "legacy",
  );
});

Deno.test("classifyTaskPath: README is ignored", () => {
  assertEquals(
    classifyTaskPath("documents/tasks/README.md"),
    "ignored",
  );
});

Deno.test("classifyTaskPath: unrelated path", () => {
  assertEquals(
    classifyTaskPath("scripts/check-task-format.ts"),
    "ignored",
  );
});

Deno.test("classifyTaskPath: partial date hierarchy is treated as legacy (warn-only)", () => {
  // Anything under documents/tasks/ that doesn't match the canonical
  // <YYYY>/<MM>/<slug>.md falls back to "legacy" so the author gets
  // a deprecation warning rather than silent acceptance.
  assertEquals(
    classifyTaskPath("documents/tasks/2026/slug.md"),
    "legacy",
  );
  // Day-level subfolder (former layout) → no longer matches; legacy now.
  assertEquals(
    classifyTaskPath("documents/tasks/2026/05/07/slug.md"),
    "legacy",
  );
});

// --- deriveStatusFromDoD ---

Deno.test("deriveStatusFromDoD: empty DoD returns null", () => {
  const md = `# Title\n\n## Definition of Done\n\n## Solution\n`;
  assertEquals(deriveStatusFromDoD(md), {
    derived: null,
    total: 0,
    checked: 0,
  });
});

Deno.test("deriveStatusFromDoD: no DoD section returns null", () => {
  const md = `# Title\n\n## Solution\n`;
  assertEquals(deriveStatusFromDoD(md), {
    derived: null,
    total: 0,
    checked: 0,
  });
});

Deno.test("deriveStatusFromDoD: 0/3 → 'to do'", () => {
  const md =
    `## Definition of Done\n\n- [ ] FR-A: foo\n- [ ] FR-B: bar\n- [ ] FR-C: baz\n\n## Solution\n`;
  assertEquals(deriveStatusFromDoD(md), {
    derived: "to do",
    total: 3,
    checked: 0,
  });
});

Deno.test("deriveStatusFromDoD: 1/3 → 'in progress'", () => {
  const md =
    `## Definition of Done\n\n- [x] FR-A: foo\n- [ ] FR-B: bar\n- [ ] FR-C: baz\n`;
  assertEquals(deriveStatusFromDoD(md), {
    derived: "in progress",
    total: 3,
    checked: 1,
  });
});

Deno.test("deriveStatusFromDoD: 3/3 → 'done'", () => {
  const md =
    `## Definition of Done\n\n- [x] FR-A: foo\n- [x] FR-B: bar\n- [x] FR-C: baz\n`;
  assertEquals(deriveStatusFromDoD(md), {
    derived: "done",
    total: 3,
    checked: 3,
  });
});

Deno.test("deriveStatusFromDoD: nested sub-bullets are ignored", () => {
  const md = [
    "## Definition of Done",
    "",
    "- [x] FR-A: top",
    "  - Test: foo_test.ts::a",
    "  - Evidence: bar",
    "- [ ] FR-B: top",
    "  - Test: foo_test.ts::b",
  ].join("\n");
  assertEquals(deriveStatusFromDoD(md), {
    derived: "in progress",
    total: 2,
    checked: 1,
  });
});

Deno.test("deriveStatusFromDoD: stops at next ## heading", () => {
  const md = [
    "## Definition of Done",
    "- [x] FR-A: top",
    "## Solution",
    "- [ ] not a DoD item",
  ].join("\n");
  assertEquals(deriveStatusFromDoD(md), {
    derived: "done",
    total: 1,
    checked: 1,
  });
});

// --- validateNewShapeTask ---

const validFrontmatter = [
  "---",
  "date: 2026-05-07",
  "status: to do",
  "implements:",
  "  - FR-DOC-TASKS",
  "tags: [docs]",
  "related_tasks: []",
  "---",
].join("\n");

const validBody = [
  "# Title",
  "",
  "## Definition of Done",
  "",
  "- [ ] FR-DOC-TASKS: do the thing",
].join("\n");

Deno.test("validateNewShapeTask: minimal valid task → no errors", () => {
  const errs = validateNewShapeTask(
    "documents/tasks/2026/05/x.md",
    validFrontmatter + "\n" + validBody,
  );
  assertEquals(errs, []);
});

Deno.test("validateNewShapeTask: missing frontmatter → error", () => {
  const errs = validateNewShapeTask(
    "documents/tasks/2026/05/x.md",
    "# No frontmatter\n",
  );
  assertEquals(errs.length, 1);
  assertEquals(errs[0].level, "error");
});

Deno.test("validateNewShapeTask: invalid status → error", () => {
  const fm = validFrontmatter.replace("status: to do", "status: pending");
  const errs = validateNewShapeTask(
    "documents/tasks/2026/05/x.md",
    fm + "\n" + validBody,
  );
  const statusErr = errs.find((e) => e.message.includes("'status'"));
  assertEquals(statusErr?.level, "error");
});

Deno.test("validateNewShapeTask: bad date format → error", () => {
  const fm = validFrontmatter.replace("date: 2026-05-07", 'date: "may 7th"');
  const errs = validateNewShapeTask(
    "documents/tasks/2026/05/x.md",
    fm + "\n" + validBody,
  );
  const dateErr = errs.find((e) => e.message.includes("'date'"));
  assertEquals(dateErr?.level, "error");
});

Deno.test("validateNewShapeTask: implements omitted → no error (internal task)", () => {
  const fm = [
    "---",
    "date: 2026-05-07",
    "status: to do",
    "---",
  ].join("\n");
  const errs = validateNewShapeTask(
    "documents/tasks/2026/05/x.md",
    fm + "\n" + validBody,
  );
  const implErr = errs.find((e) =>
    e.level === "error" && e.message.includes("'implements'")
  );
  assertEquals(implErr, undefined);
});

Deno.test("validateNewShapeTask: invalid FR-ID → error", () => {
  const fm = [
    "---",
    "date: 2026-05-07",
    "status: to do",
    "implements:",
    "  - notAnFrId",
    "---",
  ].join("\n");
  const errs = validateNewShapeTask(
    "documents/tasks/2026/05/x.md",
    fm + "\n" + validBody,
  );
  const idErr = errs.find((e) => e.message.includes("invalid FR-ID"));
  assertEquals(idErr?.level, "error");
});

Deno.test("validateNewShapeTask: status mismatch with DoD → error", () => {
  const body = [
    "# Title",
    "",
    "## Definition of Done",
    "",
    "- [x] FR-DOC-TASKS: completed",
  ].join("\n");
  // frontmatter says "to do" but DoD is fully checked → derive "done"
  const errs = validateNewShapeTask(
    "documents/tasks/2026/05/x.md",
    validFrontmatter + "\n" + body,
  );
  const mismatchErr = errs.find((e) => e.message.includes("Status mismatch"));
  assertEquals(mismatchErr?.level, "error");
});

Deno.test("validateNewShapeTask: no DoD → warning, not error", () => {
  const body = "# Title\n\nNo DoD here.\n";
  const errs = validateNewShapeTask(
    "documents/tasks/2026/05/x.md",
    validFrontmatter + "\n" + body,
  );
  const dodWarn = errs.find((e) => e.message.includes("Definition of Done"));
  assertEquals(dodWarn?.level, "warning");
  // No errors, only the warning.
  assertEquals(errs.filter((e) => e.level === "error"), []);
});

// --- validateLegacyTask ---

Deno.test("validateLegacyTask: emits one warning", () => {
  const errs = validateLegacyTask("documents/tasks/old-task.md");
  assertEquals(errs.length, 1);
  assertEquals(errs[0].level, "warning");
});
