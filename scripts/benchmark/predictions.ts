/**
 * SWE-bench predictions records (FR-BENCH-SWE).
 *
 * Each agent run's working-tree `git diff` becomes one prediction record that
 * the `swebench` harness grades. The record shape is fixed by swebench:
 * `{instance_id, model_name_or_path, model_patch}`. An empty patch is valid —
 * swebench reports it as an empty-patch (unresolved), not an error.
 */

import { join } from "@std/path";

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
  ".claude",
  "AGENTS.md",
  "documents/tasks",
  ".flowai.yaml",
  ".venv-swebench",
  "bench-home",
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
  const pathspec = [".", ...excludes.map((p) => `:(exclude)${p}`)];
  await git(repoDir, ["add", "-A", "--", ...pathspec]);
  return await git(repoDir, [
    "diff",
    "--cached",
    "--no-color",
    "--",
    ...pathspec,
  ]);
}

/** Write predictions to `<dir>/<modelName>.jsonl` and return the path. */
export async function writePredictions(
  dir: string,
  modelName: string,
  preds: Prediction[],
): Promise<string> {
  const path = join(dir, `${modelName}.jsonl`);
  await Deno.writeTextFile(path, toJsonl(preds));
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
