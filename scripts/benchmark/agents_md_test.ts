import { assert } from "@std/assert";
import { renderAgentsMd, renderDocStubs } from "./agents_md.ts";

/**
 * Every doc role the rendered AGENTS.md resolves MUST exist on disk, or the plan
 * skill halts before it ever reads the issue. Measured on the first flowai
 * campaign (2026-07-27): the SDS role resolves to `documents/design.md`, the
 * stubs never wrote it, and four of eleven logged sessions ended with
 * "Planning is blocked: the required SDS role resolves to `documents/design.md`,
 * but that file does not exist" — three of them produced no patch at all.
 */
Deno.test("renderDocStubs: writes a stub for EVERY doc role AGENTS.md resolves", async () => {
  const template = await Deno.readTextFile(TEMPLATE_URL);
  const agentsMd = renderAgentsMd(template, {
    repo: "django/django",
    stack: ["Python"],
  });
  const stubs = renderDocStubs("django/django");

  // Role paths the rendered AGENTS.md points the agent at.
  const roles: Array<[string, keyof typeof stubs]> = [
    ["documents/requirements.md", "requirements"],
    ["documents/design.md", "design"],
    ["documents/index.md", "index"],
  ];
  for (const [path, key] of roles) {
    assert(
      agentsMd.includes(path),
      `AGENTS.md still resolves the role at ${path} — the test's role list is stale`,
    );
    assert(
      (stubs[key] ?? "").trim() !== "",
      `no stub is written for ${path}, so the plan skill halts on a missing role`,
    );
  }
});

/** The SDS stub must be a valid SDS the plan skill can read and extend. */
Deno.test("renderDocStubs: the SDS stub is a real SDS, not a placeholder", () => {
  const { design, requirements } = renderDocStubs("django/django");

  assert(design.includes("django/django"), "SDS names the repo");
  assert(/^# SDS/m.test(design), "SDS has an SDS title");
  assert(
    /## 2\. Arch/.test(design),
    "SDS has the Arch section the plan skill resolves",
  );
  assert(
    /ACTIVE/.test(requirements) && /SDS/.test(requirements),
    "the SRS stub lists SDS among the active roles",
  );
});

/**
 * The doc-system stubs must remove the "roles unbound → not flowai" misread that
 * skipped the plan task file on django-14792: both files must be present, name
 * the repo, frame this as a flowai task with no formal FRs, and carry valid
 * SRS/index headings the plan skill can resolve.
 */
Deno.test("renderDocStubs: SRS + index stubs are coherent and FR-less", () => {
  const { requirements, index } = renderDocStubs("django/django");

  // SRS stub.
  assert(requirements.includes("django/django"), "SRS names the repo");
  assert(/^# SRS/m.test(requirements), "SRS has an SRS title");
  assert(
    /## 3\. Functional Reqs/.test(requirements),
    "SRS has the Functional Reqs section the plan skill resolves",
  );
  assert(
    /implements: \[\]/.test(requirements),
    "SRS states the bug fix carries no FRs (implements: [])",
  );
  assert(
    /ACTIVE/.test(requirements),
    "SRS asserts the doc-system roles are active (defeats the 'not flowai' misread)",
  );

  // Index stub.
  assert(/^# Documentation Index/m.test(index), "index has its title");
  assert(
    /## FR/.test(index),
    "index has the FR section the plan skill writes to",
  );
});

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
