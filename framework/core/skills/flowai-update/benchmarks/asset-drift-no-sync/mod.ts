import { join } from "@std/path";
import { BenchmarkSkillScenario } from "@bench/types.ts";
import { runGit } from "@bench/utils.ts";

/**
 * Tests that the agent checks project artifacts against templates even when
 * `flowai sync` reports NO asset changes.
 *
 * Reproduces the real failure: `.claude/assets/` already matches upstream
 * templates (sync says "ok"), but the project artifact (AGENTS.md) has
 * drifted — it's missing framework-originated content. The agent must
 * still compare templates vs artifacts and detect the gap.
 *
 * Scenario setup:
 * 1. `.claude/assets/AGENTS.template.md` is committed and unchanged
 *    (no git diff → sync would report "ok")
 * 2. Project `AGENTS.md` is missing the "Proactive Resolution" planning
 *    rule that IS present in the template
 * 3. No other files changed — clean working tree except for the
 *    intentional artifact drift
 * 4. Agent must compare templates vs artifacts unconditionally
 */
export const FlowUpdateAssetDriftNoSyncBench = new class
  extends BenchmarkSkillScenario {
  id = "flowai-update-asset-drift-no-sync";
  name = "Detects artifact drift even when sync reports no asset changes";
  skill = "flowai-update";
  stepTimeoutMs = 300_000;

  maxSteps = 25;

  agentsTemplateVars = {
    PROJECT_NAME: "MyProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  // No mocks needed — we skip sync via userQuery and test step 6 in isolation.

  override sandboxState = {
    commits: [
      {
        message: "Initial sync with all assets",
        files: [
          ".claude/assets/AGENTS.template.md",
          ".claude/assets/AGENTS.documents.template.md",
          ".claude/assets/AGENTS.scripts.template.md",
          "documents/AGENTS.md",
          "scripts/AGENTS.md",
        ],
      },
    ],
    // No modified files — clean working tree. The drift is in committed state.
    expectedOutcome:
      "Agent compares templates against project artifacts despite sync reporting no changes, finds missing Proactive Resolution rule in AGENTS.md",
  };

  override async setup(sandboxPath: string) {
    // --- Write AGENTS.md (project artifact) MISSING "Proactive Resolution" ---
    await Deno.writeTextFile(
      join(sandboxPath, "AGENTS.md"),
      [
        "# MyProject",
        "",
        "## Project tooling Stack",
        "- TypeScript, Deno",
        "",
        "## Planning Rules",
        "",
        "- **Environment Side-Effects**: Changes to infra/DB/external services → plan MUST include migration/sync/deploy steps.",
        "- **Verification Steps**: Plan MUST include specific verification commands.",
        "- **Functionality Preservation**: Refactoring/modifications → run existing tests before/after.",
        "- **Data-First**: Integration with external APIs/processes → inspect protocol & data formats BEFORE planning.",
        "- **Architectural Validation**: Complex logic changes → visualize event sequence.",
        "- **Variant Analysis**: Non-obvious path → propose variants with Pros/Cons/Risks.",
        "- **User Decision Gate**: Do NOT detail implementation plan until user explicitly selects a variant.",
        "- **Plan Persistence**: After variant selection, save the detailed plan to documents/tasks/.",
        "",
        "## TDD Flow",
        "",
        "1. **RED**: Write a failing test.",
        "2. **GREEN**: Write minimal code to pass the test.",
        "3. **REFACTOR**: Improve code and tests without changing behavior.",
        "4. **CHECK**: Run fmt, lint, and full test suite.",
        "",
      ].join("\n"),
    );

    // --- Write documents/AGENTS.md and scripts/AGENTS.md (matching templates) ---
    const docsDir = join(sandboxPath, "documents");
    await Deno.mkdir(docsDir, { recursive: true });
    await Deno.writeTextFile(
      join(docsDir, "AGENTS.md"),
      "# Documentation Rules\n\nMatches template — no migration needed.\n",
    );

    const scriptsDir = join(sandboxPath, "scripts");
    await Deno.mkdir(scriptsDir, { recursive: true });
    await Deno.writeTextFile(
      join(scriptsDir, "AGENTS.md"),
      "# Development Commands\n\nMatches template — no migration needed.\n",
    );

    // .claude/assets/ already has templates (from framework copy by runner).
    // Commit everything — clean working tree.
    await runGit(sandboxPath, ["add", "-A"]);
    await runGit(sandboxPath, ["commit", "-m", "Initial sync with all assets"]);

    // Working tree is now CLEAN. No git diff.
    // But AGENTS.md is missing "Proactive Resolution" from the template.
  }

  userQuery =
    "/flowai-update I already ran `flowai sync -y --skip-update-check`. It reported: '>>> NO ACTIONS REQUIRED — All skills, agents, assets, and hooks are up to date.' Skip CLI update and sync steps. Proceed directly to step 6 (verify and migrate asset artifacts).";

  checklist = [
    {
      id: "skipped_sync_correctly",
      description:
        "Did the agent skip the sync step as instructed (not run `flowai sync`) and proceed to artifact verification?",
      critical: true,
    },
    {
      id: "compared_templates_vs_artifacts",
      description:
        "Despite sync reporting no changes, did the agent compare `.claude/assets/AGENTS.template.md` against `./AGENTS.md` (e.g., via `git diff --no-index` or reading both files)?",
      critical: true,
    },
    {
      id: "found_missing_proactive_resolution",
      description:
        'Did the agent identify that `AGENTS.md` is missing the "Proactive Resolution" planning rule present in the template?',
      critical: true,
    },
    {
      id: "proposed_adding_rule",
      description:
        'Did the agent propose adding the "Proactive Resolution" rule to the project AGENTS.md?',
      critical: true,
    },
    {
      id: "did_not_stop_without_checking",
      description:
        'Did the agent NOT stop at "no actions required" without comparing templates against artifacts?',
      critical: true,
    },
    {
      id: "checked_other_artifacts",
      description:
        "Did the agent also check `documents/AGENTS.md` and `scripts/AGENTS.md` against their templates?",
      critical: false,
    },
  ];
}();
