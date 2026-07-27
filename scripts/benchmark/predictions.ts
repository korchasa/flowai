/**
 * SWE-bench predictions records (FR-BENCH-SWE).
 *
 * Each agent run's working-tree `git diff` becomes one prediction record that
 * the `swebench` harness grades. The record shape is fixed by swebench:
 * `{instance_id, model_name_or_path, model_patch}`. An empty patch is valid —
 * swebench reports it as an empty-patch (unresolved), not an error.
 */

import { join } from "@std/path";
import { ACP_AGENTS } from "@acceptance-tests/acp/registry.ts";

export interface Prediction {
  instance_id: string;
  model_name_or_path: string;
  model_patch: string;
}

/** Build a swebench prediction record from a unified diff. */
export function toPrediction(
  instanceId: string,
  modelName: string,
  diff: string,
): Prediction {
  if (instanceId.trim() === "") throw new Error("instanceId must not be blank");
  if (modelName.trim() === "") throw new Error("modelName must not be blank");
  return {
    instance_id: instanceId,
    model_name_or_path: modelName,
    model_patch: diff,
  };
}

/** Serialize predictions as newline-delimited JSON (swebench `--predictions_path`). */
export function toJsonl(preds: Prediction[]): string {
  return preds.map((p) => JSON.stringify(p)).join("\n") + "\n";
}

/**
 * Paths injected by the flowai install or written by its workflow that must
 * NOT appear in the model patch. Excluded from diff capture so only real
 * source changes reach swebench.
 */
export const DIFF_EXCLUDES: readonly string[] = [
  // implements [FR-BENCH-SWE.IDE](../../documents/requirements.md#fr-bench-swe.ide-second-ide-under-test-codex-arm-ancfrbench-swe-ide):
  // EVERY IDE's config dir, taken from the registry rather than written out as
  // `.claude` alone. The flowai arm installs the pack into whichever dir the
  // IDE under test discovers skills in, so a single literal silently privileges
  // one IDE: measured 2026-07-27, the codex arm's first smoke run shipped a
  // 471 KB / 41-file patch that was entirely `.codex/skills/**`.
  ...Object.values(ACP_AGENTS).map((a) => a.configDir),
  "AGENTS.md",
  // Whole flowai doc-system, not just tasks/: a faithful plan run may also write
  // documents/index.md or SRS back-pointers. None of it is the code fix, and no
  // SWE-bench repo keeps source under top-level documents/ (django/sphinx use
  // docs/), so excluding the dir wholesale is safe.
  "documents",
  ".flowai.yaml",
  ".venv-swebench",
  "bench-home",
  // Agent-created Python environments / build artifacts. A faithful run may
  // build a venv inside the sandbox to install deps and run the repo's own
  // tests (observed on pylint-4551: a 10 MB / 1047-file patch that was 99.9%
  // `venv/` binaries). None of it is the fix, and no SWE-bench gold patch
  // touches these paths, so excluding them wholesale is safe.
  "venv",
  ".venv",
  "env",
  "build",
  ".eggs",
  ".tox",
  ".pytest_cache",
  "__pycache__",
  "node_modules",
  // Lock files re-resolved as a side effect of installing dependencies. Same
  // class as `venv/`: environment state, never the fix. Measured 2026-07-27 on
  // `pdm-3759` — a 395 KB patch whose actual change was 937 bytes of
  // `src/pdm/core.py`, the rest a regenerated `uv.lock`.
  "uv.lock",
  "poetry.lock",
  "pdm.lock",
  "Pipfile.lock",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  // Stray pip-redirect artifacts: a botched `pip install "astroid>=2.6.0,..."`
  // leaves a file literally named `=2.6.0,` in the repo root.
  "=*",
];

async function git(repoDir: string, args: string[]): Promise<string> {
  const cmd = new Deno.Command("git", {
    args: ["-C", repoDir, ...args],
    stdout: "piped",
    stderr: "piped",
  });
  const { code, stdout, stderr } = await cmd.output();
  if (code !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed: ${new TextDecoder().decode(stderr)}`,
    );
  }
  return new TextDecoder().decode(stdout);
}

/**
 * Capture the agent's source changes as a unified diff (no commit required —
 * SWE-bench applies the patch directly at base_commit). Stages everything so
 * NEW files are captured too, excluding injected framework artifacts, then
 * emits the staged diff.
 */
export async function captureDiff(
  repoDir: string,
  excludes: readonly string[] = DIFF_EXCLUDES,
): Promise<string> {
  // Each exclude is dropped at the repo root AND at any nesting depth. Three
  // forms are needed because a glob matching a directory entry does NOT recurse
  // into its contents:
  //   `:(exclude)p`             — top-level file or dir (+ its contents)
  //   `:(exclude,glob)**/p`     — nested file, or nested dir entry
  //   `:(exclude,glob)**/p/**`  — contents of a nested dir (e.g. pkg/__pycache__/x.pyc)
  const pathspec = [
    ".",
    ...excludes.flatMap((p) => [
      `:(exclude)${p}`,
      `:(exclude,glob)**/${p}`,
      `:(exclude,glob)**/${p}/**`,
    ]),
  ];
  // Stage with a BROAD pathspec only (no excludes): `git add -A` silently skips
  // .gitignore'd paths, but naming an exclude pathspec that matches an ignored-
  // only path (e.g. `.pytest_cache`) makes `git add` ERROR ("paths are ignored,
  // use -f"). The excludes belong on the diff side, which never errors on
  // ignored paths — any non-ignored junk (e.g. an agent-built `venv/` absent
  // from .gitignore) is staged but then omitted from the emitted diff.
  await git(repoDir, ["add", "-A", "--", "."]);
  return await git(repoDir, [
    "diff",
    "--cached",
    "--no-color",
    "--",
    ...pathspec,
  ]);
}

/**
 * Truncate `<dir>/<modelName>.jsonl` to a genuinely EMPTY file (0 bytes) and
 * return its path. Used at the start of a run before per-instance appends.
 * NOT `writePredictions(dir, m, [])` — that writes a single "\n", leaving a
 * blank first line that swebench's `json.loads(line)` loader rejects.
 */
export async function initPredictionsFile(
  dir: string,
  modelName: string,
): Promise<string> {
  const path = join(dir, `${modelName}.jsonl`);
  await Deno.writeTextFile(path, "");
  return path;
}

/**
 * Durably append ONE prediction to `<dir>/<modelName>.jsonl`, creating the file
 * if absent. Called after each instance so an interrupted run (e.g. the harness
 * killing a long background task) keeps every completed instance on disk instead
 * of losing the whole batch flushed only at the end.
 */
export async function appendPrediction(
  dir: string,
  modelName: string,
  pred: Prediction,
): Promise<string> {
  const path = join(dir, `${modelName}.jsonl`);
  await Deno.writeTextFile(path, JSON.stringify(pred) + "\n", { append: true });
  return path;
}
