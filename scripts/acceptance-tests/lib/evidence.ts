/**
 * Assembly of the post-run evidence blob handed to the judge.
 *
 * Kept separate from `runner.ts` so the section layout is a pure function that
 * `deno task check` actually exercises — `runner_test.ts` is on the ignore list
 * in `scripts/task-check.ts`, so a test placed there is never run by the gate.
 */

import { runGit } from "./utils.ts";

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

/**
 * Render one file for the judge, keeping both ends when it does not fit.
 *
 * Head-only truncation is how a present section becomes an absent one. The
 * generated AGENTS.md of an `init` run is ~24 KB against a 10 KB cap, so the
 * judge saw the file end mid-"Documentation Map" and scored
 * `doc_rules_present` as missing on both `init-greenfield` and
 * `init-brownfield` — the section was there, 6 KB further down. The marker says
 * outright that the gap is the harness's doing, because a judge reading a
 * truncated file otherwise treats the silence as proof.
 */
export function renderFileForEvidence(
  relPath: string,
  content: string,
  maxFileSize: number,
): string {
  if (content.length <= maxFileSize) {
    return `--- ${relPath} ---\n${content}`;
  }
  const half = Math.floor(maxFileSize / 2);
  const dropped = content.length - maxFileSize;
  return [
    `--- ${relPath} (${content.length} bytes, middle elided) ---`,
    content.slice(0, half),
    `\n...[HARNESS ELIDED ${dropped} BYTES FROM THE MIDDLE OF THIS FILE. ` +
    `Content missing from this excerpt is NOT evidence that the file lacks ` +
    `it — say so rather than scoring an item as absent.]...\n`,
    content.slice(-half),
  ].join("\n");
}

/**
 * Files an IDE writes for itself during the run, never the agent's work.
 * Only these are hidden inside the IDE config dirs: the installed framework
 * is already excluded by the init commit, and everything else the agent
 * puts there — a new skill under `.cursor/skills/`, a hook, an agent file —
 * is the deliverable of `engineer` and has to reach the judge.
 */
const IDE_RUNTIME_STATE = [".claude/settings.local.json"];

const TEXT_EXTENSIONS = new Set([
  ".json",
  ".jsonc",
  ".yaml",
  ".yml",
  ".toml",
  ".md",
  ".ts",
  ".js",
  ".sh",
  ".py",
  ".go",
  ".rs",
  ".txt",
  ".cfg",
  ".ini",
  ".env",
  ".dockerfile",
]);

function isTextFile(relPath: string): boolean {
  const name = relPath.split("/").pop()!;
  if (name.toLowerCase() === "dockerfile") return true;
  const ext = name.includes(".")
    ? "." + name.split(".").pop()!.toLowerCase()
    : "";
  return TEXT_EXTENSIONS.has(ext);
}

async function gitLines(cwd: string, args: string[]): Promise<string[]> {
  const out = await runGit(cwd, args);
  return new TextDecoder().decode(out.stdout).split("\n").filter((l) =>
    l.length > 0
  );
}

/**
 * Collects the text files the AGENT produced, for the judge to read.
 *
 * "Produced" is answered by git, not by walking the tree: files committed
 * after `initHash`, tracked files with uncommitted edits, and untracked files.
 * Until 2026-09-02 this walked every text file in the sandbox in `readDir`
 * order and cut the section at 100 000 chars, with a skip list written when
 * claude was the only IDE. On codex the installed framework sits in `.codex/`
 * (~578 KB of agents, skills and scripts) and is part of the init commit; it
 * was rendered first and the cap fell before `documents/`, so `init-greenfield`
 * failed `srs_sds_structure` with "the evidence does not show the contents"
 * while the SRS on disk matched the template line for line. Selecting by git
 * means no walk order can push the product out of the section. The IDE dirs
 * are NOT skipped: the same sweep had every `engineer-*` scenario red because
 * its product — a SKILL.md or agent file under `.cursor/` — was hidden by a
 * blanket skip and the judge scored "contents absent from evidence".
 */
export async function collectGeneratedFiles(
  sandboxPath: string,
  initHash: string,
  // 60 000, not 30 000: the AGENTS.md that `init` generates from the template
  // is ~31 000 chars, and at the old cap every one of them reached the judge
  // with its middle elided — `init-greenfield` lost `doc_rules_present` on
  // 2026-09-02 to a hole cut across the very heading the item asks for.
  maxFileSize = 60_000,
): Promise<string> {
  const paths = new Set<string>([
    ...await gitLines(sandboxPath, [
      "diff",
      "--name-only",
      "--diff-filter=d",
      `${initHash}..HEAD`,
    ]),
    ...await gitLines(sandboxPath, [
      "diff",
      "--name-only",
      "--diff-filter=d",
      "HEAD",
    ]),
    ...await gitLines(sandboxPath, [
      "ls-files",
      "--others",
      "--exclude-standard",
    ]),
  ]);

  const parts: string[] = [];
  for (const rel of [...paths].sort()) {
    const top = rel.split("/")[0];
    if (IDE_RUNTIME_STATE.includes(rel) || top === "node_modules") continue;
    if (!isTextFile(rel)) continue;
    try {
      const content = await Deno.readTextFile(`${sandboxPath}/${rel}`);
      parts.push(renderFileForEvidence(rel, content, maxFileSize));
    } catch (_) {
      // deleted or unreadable since the listing — nothing to show
    }
  }
  return parts.join("\n");
}
