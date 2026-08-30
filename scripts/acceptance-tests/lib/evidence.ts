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

/** Cap on the whole agent trace handed to the judge, in characters. */
export const MAX_TRACE_LEN = 150_000;

/** Head + tail of one blob, with a marker naming what was dropped. */
function headTail(s: string, budget: number): string {
  const half = Math.max(1, Math.floor((budget - 40) / 2));
  if (half * 2 >= s.length) return s;
  const droppedKb = ((s.length - half * 2) / 1024).toFixed(0);
  return s.slice(0, half) +
    `\n...[TRUNCATED ${droppedKb}KB]...\n` +
    s.slice(-half);
}

/**
 * Fits the agent trace into the judge's context WITHOUT dropping a whole turn.
 *
 * The previous rule kept the first and last half of the cap and cut whatever
 * sat between them. For an interactive scenario the middle IS the conversation
 * the checklist asks about. Measured 2026-08-28 on
 * `maintenance-tooling-relevance`: the trace ran 8 KB over the cap, the scan
 * turn filled the head and four trailing turns filled the tail, so turns 2-6
 * vanished — exactly the four `Apply | Skip | Edit` questions the item
 * `interactive_resolution` scores. The judge reported "no evidence of
 * per-finding interactive confirmation" and was right about what it had been
 * shown; the raw session carries all four questions and all four replies.
 *
 * Each turn now gets its own share of the budget: turns that fit keep every
 * byte, and the surplus is redistributed to the long ones, which are clipped
 * head-and-tail individually. A turn can lose its middle; it can no longer
 * disappear.
 */
export function truncateTrace(trace: string, max = MAX_TRACE_LEN): string {
  if (trace.length <= max) return trace;
  const parts = trace.split(/(?=\n\[turn \d+\] > )/);
  if (parts.length < 2) return headTail(trace, max);

  // Two passes settle the budget: short turns keep everything, and what they
  // leave unused goes to the long ones.
  let budget = Math.floor(max / parts.length);
  for (let pass = 0; pass < 3; pass++) {
    const shortLen = parts
      .filter((p) => p.length <= budget)
      .reduce((a, p) => a + p.length, 0);
    const longCount = parts.filter((p) => p.length > budget).length;
    if (longCount === 0) break;
    const next = Math.floor((max - shortLen) / longCount);
    if (next <= budget) break;
    budget = next;
  }

  return parts.map((p) => p.length <= budget ? p : headTail(p, budget)).join(
    "",
  );
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
