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
