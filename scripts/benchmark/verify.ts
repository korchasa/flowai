/**
 * Thin wrapper over the official Python `swebench` verifier (FR-BENCH-SWE).
 *
 * Grading of model patches against SWE-bench Verified hidden tests is delegated
 * entirely to `swebench.harness.run_evaluation` (runs in Docker). This module
 * only spawns that subprocess inside the project venv and parses its JSON report
 * into a typed result. We never reimplement test grading in TypeScript.
 *
 * `--gold` mode (predictions = "gold") applies the dataset's reference patch
 * instead of a model prediction — a cheap, LLM-free way to prove the arm64
 * verification path works (DoD evidence).
 */

import { join } from "@std/path";

export const DATASET = "princeton-nlp/SWE-bench_Verified";
export const VENV_PYTHON = ".venv-swebench/bin/python";

/** Subset of the swebench report we consume. */
export interface VerifyReport {
  totalInstances: number;
  completedInstances: number;
  resolvedInstances: number;
  errorInstances: number;
  resolvedIds: string[];
}

/**
 * Parse a swebench `run_evaluation` report JSON into a {@link VerifyReport}.
 * Tolerant of missing id arrays (older/newer harness variants).
 */
export function parseReport(json: unknown): VerifyReport {
  if (typeof json !== "object" || json === null) {
    throw new Error("swebench report is not an object");
  }
  const r = json as Record<string, unknown>;
  const num = (k: string): number => {
    const v = r[k];
    if (typeof v !== "number") {
      throw new Error(`swebench report field '${k}' missing or not a number`);
    }
    return v;
  };
  const ids = (k: string): string[] => {
    const v = r[k];
    return Array.isArray(v) ? v.map(String) : [];
  };
  return {
    totalInstances: num("total_instances"),
    completedInstances: num("completed_instances"),
    resolvedInstances: num("resolved_instances"),
    errorInstances: num("error_instances"),
    resolvedIds: ids("resolved_ids"),
  };
}

export interface EvaluationOptions {
  /** "gold" or a path to a predictions JSONL file. */
  predictionsPath: string;
  /** swebench run id (report filename is `<modelName>.<runId>.json`). */
  runId: string;
  /**
   * model_name_or_path used to locate the report file. For `--gold` this is
   * "gold"; for a predictions file it is the `model_name_or_path` in the records.
   */
  modelName: string;
  /** Restrict evaluation to these instance ids. */
  instanceIds?: string[];
  /** Parallel workers (default 1 — sequential, friendliest to a laptop). */
  maxWorkers?: number;
  /** Repo root (defaults to cwd). swebench writes the report here. */
  cwd?: string;
}

/**
 * Run `swebench.harness.run_evaluation` and return the parsed report.
 * Throws if the subprocess fails or the report file is absent.
 */
export async function runEvaluation(
  opts: EvaluationOptions,
): Promise<VerifyReport> {
  const cwd = opts.cwd ?? Deno.cwd();
  const args = [
    "-m",
    "swebench.harness.run_evaluation",
    "--dataset_name",
    DATASET,
    "--predictions_path",
    opts.predictionsPath,
    "--run_id",
    opts.runId,
    "--max_workers",
    String(opts.maxWorkers ?? 1),
  ];
  if (opts.instanceIds && opts.instanceIds.length > 0) {
    args.push("--instance_ids", ...opts.instanceIds);
  }

  const cmd = new Deno.Command(VENV_PYTHON, {
    args,
    cwd,
    stdout: "inherit",
    stderr: "inherit",
  });
  const { code } = await cmd.output();
  if (code !== 0) {
    throw new Error(`swebench run_evaluation exited with code ${code}`);
  }

  const reportPath = join(cwd, `${opts.modelName}.${opts.runId}.json`);
  let raw: string;
  try {
    raw = await Deno.readTextFile(reportPath);
  } catch {
    throw new Error(`swebench report not found at ${reportPath}`);
  }
  return parseReport(JSON.parse(raw));
}
