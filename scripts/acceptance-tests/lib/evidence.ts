/**
 * Assembly of the post-run evidence blob handed to the judge.
 *
 * Kept separate from `runner.ts` so the section layout is a pure function that
 * `deno task check` actually exercises — `runner_test.ts` is on the ignore list
 * in `scripts/task-check.ts`, so a test placed there is never run by the gate.
 */

/** Per-section cap for a diff blob before it is elided at the tail. */
export const MAX_DIFF_LEN = 50_000;

export interface JudgeEvidenceParts {
  expectedOutcome: string;
  gitStatus: string;
  gitLog: string;
  /** `git diff <init>..HEAD` — includes commits made by the scenario setup. */
  committedDiff: string;
  /** `git diff HEAD` — the agent's own uncommitted edits. */
  workingTreeDiff: string;
  taskFiles: string;
  generatedFiles: string;
}

export function truncateDiff(diff: string, max = MAX_DIFF_LEN): string {
  return diff.length > max
    ? diff.slice(0, max) + "\n...[DIFF TRUNCATED]..."
    : diff;
}

/**
 * A workflow that edits files and stops to ask before committing leaves its
 * entire product in the working tree. Until 2026-08-25 the evidence carried
 * only `init..HEAD`, so that product was invisible: `adapt-skills-basic` failed
 * `adapted_to_python` in the sweep of 2026-08-24 because the only diff the judge
 * could see was the SETUP commit, which downgrades the framework skill to a
 * generic `deno test` stub. The judge read those `+deno test` lines as the final
 * state and reported that the main agent had reverted the adaptation. The raw
 * session shows the main agent never wrote that file at all, and the adapted
 * file on disk contains `poetry run pytest`.
 */
export function formatJudgeEvidence(parts: JudgeEvidenceParts): string {
  return `
--- EXPECTED OUTCOME ---
${parts.expectedOutcome}

--- FINAL GIT STATUS ---
${parts.gitStatus}

--- GIT LOG ---
${parts.gitLog}

--- GIT DIFF (init..HEAD) ---
${truncateDiff(parts.committedDiff)}

--- GIT DIFF (uncommitted working tree vs HEAD) ---
The agent's own uncommitted edits. A workflow that stops to ask before
committing leaves its whole result here; the committed diff above may consist
entirely of commits made by the scenario setup, not by the agent.
${truncateDiff(parts.workingTreeDiff)}

--- DOCUMENTS/TASKS ---
${parts.taskFiles}

--- GENERATED FILES ---
${parts.generatedFiles}
    `;
}
