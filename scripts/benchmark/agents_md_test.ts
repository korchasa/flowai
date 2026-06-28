import { assert } from "@std/assert";
import { renderAgentsMd } from "./agents_md.ts";

const TEMPLATE_URL = new URL(
  "../../framework/core/assets/AGENTS.template.md",
  import.meta.url,
);

/**
 * The flowai arm's AGENTS.md must read as a REAL flowai project (the prior crude
 * render blanked every section to "(not specified)", so the plan skill treated
 * the repo as non-flowai and skipped the task file). Render the actual template
 * and assert it is coherent: no placeholders, no blanks, repo + stack present,
 * and the doc-system roles carried through.
 */
Deno.test("renderAgentsMd: fills the real template coherently (no placeholders/blanks, roles intact)", async () => {
  const template = await Deno.readTextFile(TEMPLATE_URL);
  const out = renderAgentsMd(template, {
    repo: "django/django",
    stack: ["Python"],
  });

  assert(!/\{\{[A-Z_]+\}\}/.test(out), "no unfilled {{VAR}} may remain");
  assert(
    !out.includes("not specified for this benchmark repository"),
    "must not blank sections — that reads as a non-flowai project",
  );
  assert(out.includes("django/django"), "names the repo");
  assert(/- Python/.test(out), "renders the detected stack");
  // Doc-system roles must survive so the plan skill can resolve them.
  assert(out.includes("documents/tasks"), "Tasks role path present");
  assert(out.includes("documents/requirements.md"), "SRS role path present");
  // The plan skill keys off an active doc-system — make that explicit.
  assert(/task file/i.test(out), "instructs recording a task file");
});

Deno.test("renderAgentsMd: empty stack still renders without placeholders", () => {
  const out = renderAgentsMd(
    "Name: {{PROJECT_NAME}}\nStack:\n{{TOOLING_STACK}}\n{{PROJECT_VISION}}",
    { repo: "psf/requests", stack: [] },
  );
  assert(!/\{\{/.test(out), "no placeholder remains on empty stack");
  assert(out.includes("psf/requests"));
});
