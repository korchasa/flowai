/**
 * SWE-bench Verified benchmark CLI for flowai-core (FR-BENCH-SWE).
 *
 * Same-harness A/B: both arms are Claude Code + Sonnet over ACP; the only
 * difference is flowai. We run our OWN baseline (no flowai) over a
 * high-confidence pool (instances a stronger Claude Code config AND tools-Sonnet
 * both failed), then run flowai over the baseline's actual failures. The signal
 * is baseline-fail → flowai-pass.
 *
 * Subcommands:
 *   setup       — create venv, install swebench, warm dataset cache.
 *   select      — regenerate candidates.json (cheapest sonnet-unsolved).
 *   select-pool — regenerate pool.json (CC-fail ∩ tools-Sonnet-unsolved, buildable).
 *   verify      — grade predictions (or `--gold`) via the Python swebench harness.
 *   run         — drive one arm (baseline|flowai) over the pool, emit predictions.
 *   report      — grade both arms and render the A/B markdown report.
 *
 * Orchestration is Deno/TS; grading is delegated to Python `swebench`.
 */

import { Command } from "@cliffy/command";
import { join } from "@std/path";
import { ensureDir } from "@std/fs";
import { ensureSetup } from "./benchmark/setup.ts";
import { DATASET, runEvaluation } from "./benchmark/verify.ts";
import {
  ARM64_DENY,
  CC_OPUS_FAILURES,
  POOL,
  poolIds,
  SONNET_RESOLVED,
} from "./benchmark/instances.ts";
import { dumpAllMeta } from "./benchmark/dataset.ts";
import { selectCandidates, selectPool } from "./benchmark/select.ts";
import { type Arm, runBenchmark } from "./benchmark/run.ts";
import { aggregateAB, renderMarkdownAB } from "./benchmark/report.ts";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const CANDIDATES_PATH = "scripts/benchmark/candidates.json";
const POOL_PATH = "scripts/benchmark/pool.json";

/** Read instance ids out of a predictions JSONL file (empty if absent). */
async function readPredIds(path: string): Promise<string[]> {
  try {
    return (await Deno.readTextFile(path))
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l).instance_id as string);
  } catch {
    return [];
  }
}

await new Command()
  .name("benchmark")
  .description(
    "SWE-bench Verified A/B benchmark for flowai-core (FR-BENCH-SWE)",
  )
  .action(function () {
    this.showHelp();
  })
  // ---- setup ----
  .command("setup", "Create venv, install swebench, warm dataset cache")
  .action(async () => {
    await ensureSetup();
  })
  // ---- select ----
  .command("select", "Regenerate candidates.json (cheapest sonnet-unsolved)")
  .action(async () => {
    const meta = await dumpAllMeta(Deno.cwd());
    const out = selectCandidates(meta, SONNET_RESOLVED, new Set(ARM64_DENY));
    await Deno.writeTextFile(
      CANDIDATES_PATH,
      JSON.stringify(out, null, 2) + "\n",
    );
    console.log(`[select] wrote ${out.length} candidates → ${CANDIDATES_PATH}`);
  })
  // ---- select-pool ----
  .command(
    "select-pool",
    "Regenerate pool.json (CC-fail ∩ tools-Sonnet-unsolved, buildable)",
  )
  .action(async () => {
    const meta = await dumpAllMeta(Deno.cwd());
    const out = selectPool(
      meta,
      new Set(CC_OPUS_FAILURES.failed),
      SONNET_RESOLVED,
      new Set(ARM64_DENY),
    );
    await Deno.writeTextFile(POOL_PATH, JSON.stringify(out, null, 2) + "\n");
    console.log(
      `[select-pool] wrote ${out.length} pool instances → ${POOL_PATH}`,
    );
    console.log(`[select-pool] ${out.map((c) => c.instanceId).join(", ")}`);
  })
  // ---- verify ----
  .command("verify", "Grade predictions (or --gold) via the swebench harness")
  .option("--gold", "Apply dataset reference patches instead of predictions")
  .option("--predictions <path:string>", "Path to a predictions JSONL file")
  .option(
    "--model <name:string>",
    "model_name_or_path used to locate the report",
  )
  .option("--instance <id:string>", "Restrict to instance id (repeatable)", {
    collect: true,
  })
  .option("--run-id <id:string>", "swebench run id", { default: "verify" })
  .action(async (opts) => {
    const instanceIds = (opts.instance as string[] | undefined) ?? [];
    let predictionsPath: string;
    let modelName: string;
    if (opts.gold) {
      predictionsPath = "gold";
      modelName = "gold";
    } else {
      if (!opts.predictions || !opts.model) {
        console.error(
          "verify requires --gold, or both --predictions and --model",
        );
        Deno.exit(1);
      }
      predictionsPath = opts.predictions;
      modelName = opts.model;
    }
    const report = await runEvaluation({
      predictionsPath,
      modelName,
      runId: opts.runId,
      instanceIds,
    });
    console.log(JSON.stringify(report, null, 2));
    if (opts.gold && report.resolvedInstances !== report.completedInstances) {
      console.error(
        `gold verification failed: ${report.resolvedInstances}/${report.completedInstances} resolved`,
      );
      Deno.exit(1);
    }
  })
  // ---- run ----
  .command(
    "run",
    "Drive one arm (baseline|flowai) over the pool, emit predictions",
  )
  .option("--arm <arm:string>", "Arm to run: baseline | flowai", {
    required: true,
  })
  .option("--instance <id:string>", "Restrict to instance id (repeatable)", {
    collect: true,
  })
  .option("--limit <n:number>", "Run only the cheapest N pool instances")
  .option("--model <name:string>", "Agent model", { default: "sonnet" })
  .option("--out <dir:string>", "Output dir for predictions + logs")
  .option("--step-timeout <ms:number>", "Per-session timeout (ms)", {
    default: 1_200_000,
  })
  .action(async (opts) => {
    const arm = opts.arm as Arm;
    if (arm !== "baseline" && arm !== "flowai") {
      console.error(`--arm must be 'baseline' or 'flowai', got '${arm}'`);
      Deno.exit(1);
    }
    let instanceIds = (opts.instance as string[] | undefined) ?? poolIds();
    if (opts.limit !== undefined) {
      instanceIds = instanceIds.slice(0, opts.limit);
    }
    const repoRoot = Deno.cwd();
    const outDir = opts.out ??
      join(repoRoot, "scripts/benchmark/runs", today());
    await ensureDir(outDir);
    console.log(
      `[run] arm=${arm} instances=${instanceIds.length} model=${opts.model}`,
    );
    console.log(`[run] out=${outDir}`);
    await runBenchmark({
      arm,
      instanceIds,
      model: opts.model,
      outDir,
      stepTimeoutMs: opts.stepTimeout,
      repoRoot,
    });
  })
  // ---- report ----
  .command("report", "Grade both arms and render the A/B markdown report")
  .option(
    "--out <dir:string>",
    "Predictions dir (contains baseline.jsonl/flowai.jsonl)",
    {
      required: true,
    },
  )
  .option("--model <name:string>", "Harness model label", { default: "sonnet" })
  .option("--report <path:string>", "Markdown report output path")
  .action(async (opts) => {
    const baselinePreds = join(opts.out, "baseline.jsonl");
    try {
      await Deno.stat(baselinePreds);
    } catch {
      console.error(`missing baseline predictions: ${baselinePreds}`);
      Deno.exit(1);
    }
    console.log(`[report] grading baseline (${baselinePreds})`);
    const bRes = await runEvaluation({
      predictionsPath: baselinePreds,
      modelName: "baseline",
      runId: "bench-baseline",
    });

    const flowaiPreds = join(opts.out, "flowai.jsonl");
    let fResolved: string[] = [];
    let fAttempted: string[] = [];
    if (await Deno.stat(flowaiPreds).then(() => true).catch(() => false)) {
      console.log(`[report] grading flowai (${flowaiPreds})`);
      const fRes = await runEvaluation({
        predictionsPath: flowaiPreds,
        modelName: "flowai",
        runId: "bench-flowai",
      });
      fResolved = fRes.resolvedIds;
      fAttempted = await readPredIds(flowaiPreds);
    } else {
      console.log(`[report] no flowai predictions yet — baseline-only report`);
    }

    const rep = aggregateAB(POOL, bRes.resolvedIds, fResolved, fAttempted);
    const md = renderMarkdownAB(rep, {
      date: today(),
      model: opts.model,
      dataset: DATASET,
      ccModel: CC_OPUS_FAILURES.model,
    });
    const reportPath = opts.report ??
      join("documents/benchmarks", `swe-verified-${today()}.md`);
    await ensureDir(join(reportPath, ".."));
    await Deno.writeTextFile(reportPath, md);
    console.log(`\n${md}`);
    console.log(`[report] written → ${reportPath}`);
  })
  .parse(Deno.args);
