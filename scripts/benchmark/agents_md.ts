/**
 * AGENTS.md generation for the flowai SWE-bench arm (FR-BENCH-SWE).
 *
 * The flowai arm overlays the framework onto an upstream repo that is NOT a
 * flowai project. The agent must still treat it as one — otherwise the plan
 * skill bails ("this is Django, not flowai; no AGENTS.md/SRS/SDS in the usual
 * format" — observed on django-14792) and skips the task file + variant gate.
 *
 * So we render the REAL framework template (`framework/core/assets/
 * AGENTS.template.md`) into a coherent project doc — every `{{VAR}}` filled with
 * benchmark-appropriate content, never blanked to "(not specified)". The static
 * Documentation Hierarchy (SRS/SDS/Tasks/Index role paths) carries through, so
 * the doc-system roles resolve. Stack is detected with the SAME analyzer the
 * init command uses (`analyzeProject`), so the rendered stack matches what
 * flowai would report.
 */

import { join } from "@std/path";
import { ensureDir } from "@std/fs";
import { analyzeProject } from "../../framework/core/commands/init/scripts/generate_agents.ts";

/**
 * Fill the AGENTS template with benchmark-appropriate values. Pure: no I/O, so
 * it is unit-testable. Every known `{{VAR}}` is replaced; any stray one is
 * blanked as a last resort so no `{{…}}` ever reaches the agent.
 */
export function renderAgentsMd(
  template: string,
  opts: { repo: string; stack: string[] },
): string {
  const stack = opts.stack.length
    ? opts.stack.map((s) => `- ${s}`).join("\n")
    : "- (language autodetected at runtime)";

  const vars: Record<string, string> = {
    PROJECT_RULES: [
      `- This is a flowai-managed sandbox checkout of \`${opts.repo}\` at a fixed base commit. Resolve ONE upstream GitHub issue in the working tree.`,
      `- Do NOT commit or push; leave the fix in the working tree.`,
      `- Fix at the ROOT CAUSE, not a downstream symptom; verify against the repository's OWN existing test suite, not only newly written tests.`,
    ].join("\n"),
    PROJECT_NAME: opts.repo,
    PROJECT_VISION:
      `Resolve a single upstream GitHub issue in the \`${opts.repo}\` working tree under the flowai workflow (plan → implement → review). The doc-system roles below (SRS, SDS, Tasks, Index) are ACTIVE: record the plan as a task file under the Tasks role before implementing.`,
    TOOLING_STACK: stack,
    ARCHITECTURE:
      `Upstream \`${opts.repo}\` repository at a fixed base commit, standard project layout. No flowai-specific architecture is overlaid beyond this doc-system.`,
    KEY_DECISIONS: [
      `- Fix at the root cause identified during planning, not a mirrored symptom elsewhere.`,
      `- Treat the repository's existing test suite as the acceptance oracle.`,
    ].join("\n"),
    DOCUMENTATION_MAP: "(default mapping applies — see fallback below)",
    DEVELOPMENT_COMMANDS:
      `- Use the repository's own test runner (e.g. \`python tests/runtests.py <suite>\` for Django, \`tox\`/\`pytest\` otherwise). Discover it from the repo layout.`,
    COMMAND_SCRIPTS: "(none for this sandbox)",
  };

  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{{${k}}}`, v);
  }
  // Safety net: no unfilled placeholder may reach the agent.
  out = out.replace(/\{\{[A-Z_]+\}\}/g, "");
  return out;
}

/**
 * Minimal STATIC doc-system stubs for the flowai arm (FR-BENCH-SWE).
 *
 * The `plan` skill resolves the `SRS`, `tasks`, and `index` roles from AGENTS.md
 * and bails ("role missing — STOP") when it cannot. Although the skill is
 * designed to self-create the index and treats an FR-less bug fix as a no-op SRS
 * edit, observed runs (django-14792) show the agent CONFLATES "the SRS/index
 * files are absent on disk" with "the roles are unbound" — then declares the
 * repo "not a flowai project" and skips the plan task file entirely.
 *
 * Seeding tiny static stubs removes that misread for zero LLM cost: the files
 * exist, and their prose states plainly that this is a flowai task with no
 * formal FRs. The whole `documents/` tree is excluded from the captured diff
 * (DIFF_EXCLUDES), so none of it reaches the prediction.
 *
 * EVERY role the rendered AGENTS.md resolves needs a stub, not just the ones a
 * past incident named. Seeding SRS + Index but not SDS left `documents/design.md`
 * missing, and the plan skill halted on it in four of eleven logged sessions of
 * the first flowai campaign (2026-07-27) — verbatim: "Planning is blocked: the
 * required SDS role resolves to `documents/design.md`, but that file does not
 * exist." Three of those instances produced no patch at all.
 */
export function renderDocStubs(
  repo: string,
): { requirements: string; design: string; index: string } {
  const requirements = [
    `# SRS — \`${repo}\` (flowai sandbox task)`,
    ``,
    `## 1. Intro`,
    `- **Desc:** flowai-managed sandbox checkout of \`${repo}\`. Goal: resolve ONE upstream GitHub issue in the working tree under plan → implement → review.`,
    `- **Def/Abbr:** SRS — Software Requirements Specification.`,
    ``,
    `## 2. General`,
    `- **Context:** Upstream repository at a fixed base commit. This is NOT a flowai feature project, so it carries no formal FR catalog.`,
    `- **Assumptions/Constraints:** Fix the ROOT CAUSE, not a downstream symptom; verify against the repository's OWN existing test suite, not only newly written tests.`,
    ``,
    `## 3. Functional Reqs`,
    `No formal FR-* requirements: this is an upstream bug fix, not a flowai feature. The implementation is tracked by the plan task file under \`documents/tasks/\` with \`implements: []\`. The doc-system roles (SRS, SDS, Tasks, Index) are ACTIVE and every one of them resolves to a file that exists — treat absent FR sections and thin design prose as expected, not as "roles unbound" and not as a reason to stop.`,
    ``,
  ].join("\n");

  const design = [
    `# SDS — \`${repo}\` (flowai sandbox task)`,
    ``,
    `## 1. Intro`,
    `- **Purpose:** Record the design of the ONE upstream fix this task delivers.`,
    `- **Rel to SRS:** Implements the single task described in \`documents/requirements.md\`; there are no FR-* clauses to trace.`,
    ``,
    `## 2. Arch`,
    `- **Diagram:** None. The architecture is the upstream \`${repo}\` layout at its base commit, unchanged by this task.`,
    `- **Subsystems:** Whatever the issue touches. Identify them during planning and describe the chosen change here.`,
    ``,
    `## 3. Components`,
    `To be filled by the planner with the components the selected variant changes. An empty section is expected before planning — it is not a missing role.`,
    ``,
    `## 7. Constraints`,
    `- **Simplified/Deferred:** Fix the root cause of the reported issue only. No refactors beyond it, no commits, no pushes.`,
    ``,
  ].join("\n");

  const index = [
    `# Documentation Index`,
    ``,
    `## FR`,
    `No FRs — upstream bug-fix task. The active plan lives under \`documents/tasks/\`.`,
    ``,
  ].join("\n");

  return { requirements, design, index };
}

/**
 * Write the doc-system stubs (`documents/requirements.md`, `documents/design.md`,
 * `documents/index.md`) and ensure the Tasks role dir exists. Static — no
 * generation, no I/O beyond the writes.
 */
export async function installDocStubs(
  sandboxDir: string,
  repo: string,
): Promise<void> {
  const docs = join(sandboxDir, "documents");
  await ensureDir(join(docs, "tasks"));
  const { requirements, design, index } = renderDocStubs(repo);
  await Deno.writeTextFile(join(docs, "requirements.md"), requirements);
  await Deno.writeTextFile(join(docs, "design.md"), design);
  await Deno.writeTextFile(join(docs, "index.md"), index);
}

/**
 * Render `framework/core/assets/AGENTS.template.md` for `repo` and write it to
 * `<sandboxDir>/AGENTS.md`. Stack is detected via the init analyzer.
 */
export async function installAgentsMd(
  repoRoot: string,
  sandboxDir: string,
  repo: string,
): Promise<void> {
  const tplPath = join(repoRoot, "framework/core/assets/AGENTS.template.md");
  const template = await Deno.readTextFile(tplPath);
  const { stack } = await analyzeProject(sandboxDir);
  await Deno.writeTextFile(
    join(sandboxDir, "AGENTS.md"),
    renderAgentsMd(template, { repo, stack }),
  );
}
