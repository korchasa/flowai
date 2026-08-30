import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

/**
 * Tests that the agent checks project artifacts against templates even when
 * no installed primitive or template file changed in the working tree.
 *
 * Reproduces the real failure: `.claude/assets/` already matches upstream
 * templates, but the project artifact (AGENTS.md) has
 * drifted — it's missing framework-originated content. The agent must
 * still compare templates vs artifacts and detect the gap.
 *
 * Scenario setup:
 * 1. `.claude/assets/AGENTS.template.md` is committed and unchanged
 *    (no git diff)
 * 2. Project `AGENTS.md` is the rendered template with the single
 *    "Proactive Resolution" bullet removed — nothing else differs
 * 3. No other files changed — clean working tree except for the
 *    intentional artifact drift
 * 4. Agent must compare templates vs artifacts unconditionally
 */
export const FlowUpdateAssetDriftNoSyncBench = new class
  extends AcceptanceTestScenario {
  id = "update-asset-drift-no-sync";
  name = "Detects artifact drift even when sync reports no asset changes";
  skill = "update";
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
        ],
      },
    ],
    // No modified files — clean working tree. The drift is in committed state.
    expectedOutcome:
      "Agent compares templates against project artifacts despite clean working tree, finds missing Proactive Resolution rule in AGENTS.md",
  };

  /**
   * The artifact is the RENDERED template with exactly one rule cut out.
   *
   * Until 2026-08-29 this wrote a 25-line hand-made AGENTS.md instead. That
   * stub was accurate when the template was small; the template has since
   * grown past 30 KB, so the drift under test stopped being "one missing rule"
   * and became "most of the file is absent". In the sweep of 2026-08-28 the
   * agent reported the entire leading `Core Project Rules` block missing — 22
   * rules, Proactive Resolution among them — which is the correct reading of
   * that fixture and fails an item asking for one rule by name. Deriving the
   * artifact from the template keeps the single-rule premise true however far
   * the template grows.
   */
  override async setup(sandboxPath: string) {
    const agentsPath = join(sandboxPath, "AGENTS.md");
    const rendered = await Deno.readTextFile(agentsPath);
    const lines = rendered.split("\n");
    const idx = lines.findIndex((l) =>
      l.startsWith("- **Proactive Resolution**:")
    );
    if (idx === -1) {
      throw new Error(
        "asset-drift-no-sync: the template no longer carries a line starting " +
          '"- **Proactive Resolution**:" — the fixture cannot plant its drift. ' +
          "Point the scenario at whichever rule the template does carry.",
      );
    }
    lines.splice(idx, 1);
    await Deno.writeTextFile(agentsPath, lines.join("\n"));

    // Commit everything — the working tree must be clean, so the only drift
    // lives in committed state.
    await runGit(sandboxPath, ["add", "-A"]);
    await runGit(sandboxPath, ["commit", "-m", "Initial sync with all assets"]);
  }

  userQuery =
    "/update Reconcile my project AGENTS.md with the currently installed flowai framework template. The working tree is clean, but I suspect AGENTS.md drifted. Do not run flowai CLI commands.";

  checklist = [
    {
      id: "did_not_run_cli_lifecycle",
      description:
        "Did the agent avoid running `flowai update`, `flowai sync`, or another flowai CLI lifecycle command?",
      critical: true,
    },
    {
      id: "compared_templates_vs_artifacts",
      description:
        "Despite a clean working tree, did the agent compare `.claude/assets/AGENTS.template.md` against `./AGENTS.md` (e.g., via `git diff --no-index` or reading both files)?",
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
      id: "did_not_stop_without_checking_artifact",
      description:
        "Did the agent NOT stop at clean git status without comparing templates against artifacts?",
      critical: true,
    },
  ];
}();
