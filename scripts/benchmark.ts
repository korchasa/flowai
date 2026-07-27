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
import { stripTestHunks } from "./benchmark/patch.ts";
import {
  ARM64_DENY,
  POOL,
  poolIds,
  SONNET_RESOLVED,
} from "./benchmark/instances.ts";
import { dumpAllMeta } from "./benchmark/dataset.ts";
import { selectCandidates } from "./benchmark/select.ts";
import { type Arm, assertModelForIde, runBenchmark } from "./benchmark/run.ts";
import type { AcpIde } from "@acceptance-tests/acp/registry.ts";
import { SUPPORTED_IDES } from "@acceptance-tests/adapters/mod.ts";
import { aggregateAB, renderMarkdownAB } from "./benchmark/report.ts";
import { renderRetroMarkdown, scanRun } from "./benchmark/retro.ts";
import { loadRunMetrics, sumCost } from "./benchmark/metrics.ts";
import { loadRunWebAudits } from "./benchmark/webaudit.ts";
import {
  ensureRebenchSetup,
  FORK_PINNED_COMMIT,
  REBENCH_DATASET,
} from "./benchmark/rebench.ts";
import {
  fetchAllCandidates,
  httpRowsFetcher,
  POOL2_CANDIDATES_PATH,
  POOL2_SPLITS,
  type Pool2Candidate,
} from "./benchmark/pool2_fetch.ts";
import {
  loadProvenance,
  POOL2_PROVENANCE_PATH,
  runGoldGate,
  saveProvenance,
  stampCampaign,
  upsertGate,
} from "./benchmark/pool2_gate.ts";
import { loadPool2InstanceData } from "./benchmark/pool2_dataset.ts";
import {
  bridgeVersionFor,
  cellId,
  type CellKey,
  type CellRep,
  CELLS_ROOT,
  currentCommit,
  frameworkFingerprint,
  promptHashFor,
  readCell,
  readCellEnv,
  taskSetChecksum,
  writeHeader,
} from "./benchmark/cells.ts";
import {
  applyVerdicts,
  importCampaign,
  summariseCells,
} from "./benchmark/cells_import.ts";
import { buildSelection, loadFrozenPool } from "./benchmark/cell_select.ts";
import {
  campaignMismatch,
  campaignRunId,
  gradePool2Predictions,
  type RepCampaign,
  runArmBatch,
} from "./benchmark/pool2_measure.ts";
import {
  assembleSonnetReps,
  buildHeadroom,
  buildHeadroomRecord,
  filterToWanted,
  selectPool2,
  verdictSummary,
  zeroRepIds,
  zeroRepsMissingOpus,
} from "./benchmark/pool2_select.ts";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const CANDIDATES_PATH = "scripts/benchmark/candidates.json";

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

/**
 * Normalize a predictions file for grading: strip every test-file hunk from each
 * record's `model_patch` (see `stripTestHunks`) and write the result to a sibling
 * `<path>.graded.jsonl`, returning that path. The agent's self-authored tests are
 * never the oracle; leaving them in collides with the injected gold `test_patch`
 * and atomically fails an otherwise-correct production fix (FR-BENCH-SWE). The
 * original predictions file is preserved untouched; stripped paths are logged.
 */
async function writeGradablePredictions(
  predictionsPath: string,
): Promise<string> {
  const text = await Deno.readTextFile(predictionsPath);
  const out: string[] = [];
  let strippedTotal = 0;
  for (const line of text.split("\n")) {
    if (line.trim() === "") continue;
    const rec = JSON.parse(line) as {
      instance_id: string;
      model_patch: string;
    };
    const { patch, stripped } = stripTestHunks(rec.model_patch ?? "");
    if (stripped.length > 0) {
      strippedTotal += stripped.length;
      console.log(
        `[strip-tests] ${rec.instance_id}: dropped ${stripped.length} test hunk(s): ${
          stripped.join(", ")
        }`,
      );
    }
    out.push(JSON.stringify({ ...rec, model_patch: patch }));
  }
  const gradedPath = `${predictionsPath}.graded.jsonl`;
  await Deno.writeTextFile(gradedPath, out.join("\n") + "\n");
  console.log(
    `[strip-tests] ${strippedTotal} test hunk(s) stripped; grading ${gradedPath}`,
  );
  return gradedPath;
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
  .option(
    "--rebench",
    "Also set up the SWE-rebench grading path (fork @ pinned commit + .venv-rebench)",
  )
  .action(async (opts) => {
    await ensureSetup();
    if (opts.rebench) await ensureRebenchSetup();
  })
  // ---- pool2-fetch ----
  .command(
    "pool2-fetch",
    "Fetch fresh SWE-rebench leaderboard candidates (FR-BENCH-SWE.POOL2)",
  )
  .action(async () => {
    const cands = await fetchAllCandidates(POOL2_SPLITS, httpRowsFetcher);
    await Deno.writeTextFile(
      POOL2_CANDIDATES_PATH,
      JSON.stringify(cands, null, 2) + "\n",
    );
    console.log(
      `[pool2-fetch] wrote ${cands.length} candidates → ${POOL2_CANDIDATES_PATH}`,
    );
  })
  // ---- pool2-gate ----
  .command(
    "pool2-gate",
    "No-LLM gold gates: k-rep gold stability per candidate, fresh-first (FR-BENCH-SWE.POOL2)",
  )
  .option("--reps <n:number>", "Gold-stability reps per candidate", {
    default: 3,
  })
  .option(
    "--target <n:number>",
    "Stop once this many candidates have passed the gate (counts prior passers)",
  )
  .option("--limit <n:number>", "Gate at most N new candidates this run")
  .option("--instance <id:string>", "Restrict to instance id (repeatable)", {
    collect: true,
  })
  .action(async (opts) => {
    const all = JSON.parse(
      await Deno.readTextFile(POOL2_CANDIDATES_PATH),
    ) as Pool2Candidate[];
    const wanted = opts.instance as string[] | undefined;
    let prov = await loadProvenance(POOL2_PROVENANCE_PATH, opts.reps);
    if (prov.k !== opts.reps) {
      console.error(
        `--reps ${opts.reps} conflicts with existing provenance k=${prov.k}`,
      );
      Deno.exit(1);
    }
    let gated = 0;
    const passers = (): number =>
      Object.values(prov.gates).filter((g) => g.pass).length;
    for (const cand of all) {
      if (wanted && !wanted.includes(cand.instanceId)) continue;
      if (cand.instanceId in prov.gates) continue;
      if (opts.target !== undefined && passers() >= opts.target) break;
      if (opts.limit !== undefined && gated >= opts.limit) break;
      console.log(
        `[pool2-gate] ${cand.instanceId} (${cand.split}, ${cand.createdAt})`,
      );
      const result = await runGoldGate(cand, opts.reps);
      prov = upsertGate(prov, result, new Date().toISOString());
      await saveProvenance(POOL2_PROVENANCE_PATH, prov);
      gated++;
      console.log(
        `  ${result.pass ? "PASS" : "REJECT"} reps=[${result.reps.join(",")}]` +
          (result.note ? ` note=${result.note}` : ""),
      );
    }
    console.log(
      `[pool2-gate] gated ${gated} new candidate(s); total passers ${passers()}` +
        ` of ${Object.keys(prov.gates).length} gated`,
    );
  })
  // ---- pool2-run ----
  .command(
    "pool2-run",
    "Measurement rep of one arm over pool2 instances (FR-BENCH-SWE.POOL2)",
  )
  .option("--rep <n:number>", "Rep number (rep dir = <out>/rep<n>)", {
    default: 1,
  })
  .option("--arm <arm:string>", "Arm under measurement: baseline | flowai", {
    default: "baseline",
  })
  .option(
    "--pool <path:string>",
    "Frozen pool file from cells-select — run its instances instead of every gate-passer",
  )
  .option("--concurrency <n:number>", "Concurrent agent sessions", {
    default: 4,
  })
  .option("--limit <n:number>", "Run only the first N passers (metered slice)")
  .option("--out <dir:string>", "Base output dir (default runs/pool2-<arm>)")
  .option("--model <name:string>", "Agent model", { default: "sonnet" })
  .option("--ide <name:string>", "IDE under test (claude | codex)", {
    default: "claude",
  })
  .option("--judge-model <name:string>", "Judge model (always Claude)", {
    default: "sonnet",
  })
  .option(
    "--effort <level:string>",
    "Reasoning effort pinned for agent + judge (same in both arms)",
    { default: "high" },
  )
  .option("--step-timeout <ms:number>", "Per-session timeout (ms)", {
    default: 1_200_000,
  })
  .option(
    "--instance <id:string>",
    "Restrict to gate-passer id (repeatable) — e.g. the Opus ceiling-probe queue",
    { collect: true },
  )
  .option("--no-grade", "Skip fork grading (predictions only)")
  .option("--cells <path:string>", "Result-cells root (FR-BENCH-SWE.CELLS)", {
    default: CELLS_ROOT,
  })
  .action(async (opts) => {
    const pool2Arm = opts.arm as Arm;
    if (pool2Arm !== "baseline" && pool2Arm !== "flowai") {
      console.error(`--arm must be 'baseline' or 'flowai', got '${opts.arm}'`);
      Deno.exit(1);
    }
    // implements [FR-BENCH-SWE.IDE](../documents/requirements.md#fr-bench-swe.ide-second-ide-under-test-codex-arm-ancfrbench-swe-ide):
    // reject an unknown IDE or a cross-IDE model before any session is spawned.
    const pool2Ide = opts.ide as AcpIde;
    if (!SUPPORTED_IDES.includes(pool2Ide)) {
      console.error(
        `--ide must be one of ${SUPPORTED_IDES.join(", ")}, got '${opts.ide}'`,
      );
      Deno.exit(1);
    }
    try {
      assertModelForIde(pool2Ide, opts.model);
    } catch (e) {
      console.error((e as Error).message);
      Deno.exit(1);
    }
    // Gold-gate k is fixed at 3; provenance already exists (passers come from
    // its gates), so the k arg only matters for the never-hit empty case.
    const prov = await loadProvenance(POOL2_PROVENANCE_PATH, 3);
    let passers = Object.values(prov.gates)
      .filter((g) => g.pass)
      .map((g) => g.instanceId)
      .sort();
    if (passers.length === 0) {
      console.error(
        "[pool2-run] no gate-passers in provenance; run pool2-gate first",
      );
      Deno.exit(1);
    }
    const split = prov.gates[passers[0]]?.split;
    if (!split || !passers.every((id) => prov.gates[id].split === split)) {
      console.error(
        "[pool2-run] passers span multiple splits — grading needs one --split; aborting",
      );
      Deno.exit(1);
    }
    // implements [FR-BENCH-SWE.POOL2](../documents/requirements.md#fr-bench-swe.pool2-fresh-frozen-pool-via-gated-admission-funnel-ancfrbench-swe-pool2):
    // The flowai arm runs the FROZEN pool, not every gate-passer — the freeze is
    // what keeps selection baseline-only. An id in the pool that the provenance
    // never gated has no split and no gold evidence, so it aborts the run rather
    // than being measured on trust.
    if (opts.pool) {
      const frozen = await loadFrozenPool(opts.pool);
      const ungated = frozen.pool.filter((id) => !passers.includes(id));
      if (ungated.length > 0) {
        console.error(
          `[pool2-run] frozen pool has ${ungated.length} instance(s) with no ` +
            `gate evidence (${ungated.slice(0, 3).join(", ")}…); aborting`,
        );
        Deno.exit(1);
      }
      console.log(
        `[pool2-run] frozen pool ${opts.pool}: ${frozen.pool.length} instances` +
          ` (frozen against ${frozen.subjectCellId})`,
      );
      passers = frozen.pool;
    }
    // Optional subset (Opus ceiling probe runs only the 0/3 queue). Applied
    // before --limit so a metered slice takes the first N of the subset.
    passers = filterToWanted(passers, opts.instance as string[] | undefined);
    if (opts.limit !== undefined) passers = passers.slice(0, opts.limit);
    const repoRoot = Deno.cwd();
    // The arm is part of the default dir: aiming a flowai rep at the baseline's
    // campaign dir is caught by campaignMismatch below, but the default should
    // not walk into that guard in the first place.
    const baseOut = opts.out ??
      join(repoRoot, `scripts/benchmark/runs/pool2-${pool2Arm}`);
    const outDir = join(baseOut, `rep${opts.rep}`);
    // implements [FR-BENCH-SWE.CELLS](../documents/requirements.md#fr-bench-swe.cells-one-self-describing-record-per-measurement-cell-ancfrbench-swe-cells):
    // WHICH flowai was installed is half the flowai arm's identity; the bare arm
    // installs nothing, so it has no fingerprint to pin.
    const framework = pool2Arm === "flowai"
      ? await frameworkFingerprint(repoRoot)
      : null;
    console.log(
      `[pool2-run] rep=${opts.rep} arm=${pool2Arm} instances=${passers.length}` +
        ` split=${split} model=${opts.model}` +
        (framework ? ` framework=${framework}` : "") +
        ` out=${outDir}`,
    );
    // implements [FR-BENCH-SWE.IDE](../documents/requirements.md#fr-bench-swe.ide-second-ide-under-test-codex-arm-ancfrbench-swe-ide):
    // A campaign dir belongs to ONE (ide, model, effort). Two guards, both
    // needed:
    //   - the BASE dir (`campaign.json`) holds rep1..rep3, so it is what catches
    //     "rep 1 at medium, rep 2 at high" — the effort blending the provenance
    //     can no longer see now that effort is part of the campaign key;
    //   - the REP dir (`run-meta.json`) catches aiming a second campaign at
    //     another's rep, where resume would report "0 pending" and silently
    //     adopt the first campaign's patches. It also covers campaigns predating
    //     `campaign.json` (the completed claude/sonnet reps).
    await ensureDir(outDir);
    const thisCampaign: RepCampaign = {
      ide: pool2Ide,
      model: opts.model,
      effort: opts.effort,
      arm: pool2Arm,
      framework,
    };
    const readCampaign = async (p: string): Promise<RepCampaign | null> => {
      try {
        return JSON.parse(await Deno.readTextFile(p)) as RepCampaign;
      } catch {
        return null; // fresh dir
      }
    };
    const basePath = join(baseOut, "campaign.json");
    for (
      const [path, scope] of [
        [basePath, "campaign dir"],
        [join(outDir, "run-meta.json"), "rep dir"],
      ] as const
    ) {
      const mismatch = campaignMismatch(await readCampaign(path), thisCampaign);
      if (mismatch) {
        console.error(
          `[pool2-run] ${scope}: ${mismatch}; use a separate --out — aborting`,
        );
        Deno.exit(1);
      }
    }
    await Deno.writeTextFile(
      basePath,
      JSON.stringify(thisCampaign, null, 2) + "\n",
    );
    // Record this campaign's pins in the data of record. Campaigns share the
    // gate results (those are model-independent), never the pins: codex/terra at
    // medium, a sol ceiling probe at high and the original claude/sonnet run all
    // live side by side, keyed by the full triple.
    const stamped = stampCampaign(prov, pool2Ide, opts.model, opts.effort);
    if (stamped !== prov) {
      await saveProvenance(POOL2_PROVENANCE_PATH, stamped);
    }

    const data = await loadPool2InstanceData(passers, split);
    // Record the pinned campaign settings next to the rep so a later flowai
    // arm (and the report) can prove baseline + flowai ran at the SAME effort.
    await Deno.writeTextFile(
      join(outDir, "run-meta.json"),
      JSON.stringify(
        {
          rep: opts.rep,
          ...thisCampaign,
          split,
          stepTimeoutMs: opts.stepTimeout,
          concurrency: opts.concurrency,
        },
        null,
        2,
      ) + "\n",
    );
    // implements [FR-BENCH-SWE.CELLS](../documents/requirements.md#fr-bench-swe.cells-one-self-describing-record-per-measurement-cell-ancfrbench-swe-cells):
    // The cell header goes down BEFORE the batch, so a run killed mid-way still
    // leaves a record that says what it was measuring and with what.
    const cellKey: CellKey = {
      ide: pool2Ide,
      arm: pool2Arm,
      framework,
      model: opts.model,
      effort: opts.effort,
    };
    const cellDir = join(opts.cells, cellId(cellKey));
    const priorReps = (await readCell(cellDir)).header?.reps ?? [];
    const startedAt = new Date().toISOString();
    const writeCellHeader = async (rep: Partial<CellRep> & { rep: number }) => {
      await writeHeader(cellDir, cellKey, {
        taskSet: {
          dataset: REBENCH_DATASET,
          split,
          forkCommit: FORK_PINNED_COMMIT,
          ids: passers,
          checksum: await taskSetChecksum(passers),
        },
        agent: {
          modelSnapshot: null,
          ideVersion: null,
          bridgeVersion: bridgeVersionFor(pool2Ide),
        },
        judge: { model: opts.judgeModel, effort: opts.effort },
        harness: {
          maxSteps: 3,
          stepTimeoutMs: opts.stepTimeout,
          promptHash: await promptHashFor(pool2Ide),
          commit: await currentCommit(),
        },
        env: await readCellEnv(),
        reps: [
          ...priorReps.filter((r) => r.rep !== opts.rep),
          {
            startedAt,
            finishedAt: null,
            concurrency: opts.concurrency,
            healthAborts: 0,
            backoffWaits: 0,
            ...rep,
          },
        ].sort((a, b) => a.rep - b.rep),
      });
    };
    await writeCellHeader({ rep: opts.rep });

    const batch = await runArmBatch({
      data,
      ids: passers,
      arm: pool2Arm,
      outDir,
      repoRoot,
      model: opts.model,
      stepTimeoutMs: opts.stepTimeout,
      concurrency: opts.concurrency,
      effort: opts.effort,
      ide: pool2Ide,
      judgeModel: opts.judgeModel,
      rep: opts.rep,
      cellDir,
    });
    const predPath = batch.predPath;
    await writeCellHeader({
      rep: opts.rep,
      finishedAt: new Date().toISOString(),
      healthAborts: batch.healthAborts,
      backoffWaits: batch.backoffWaits,
    });
    console.log(`[pool2-run] predictions → ${predPath}; cell → ${cellDir}`);
    if (opts.grade === false) return;
    const runId = campaignRunId(thisCampaign, opts.rep);
    const resolved = await gradePool2Predictions(
      predPath,
      split,
      runId,
      repoRoot,
      pool2Arm,
    );
    // The verdict is swebench's own; fold it into the rows already written.
    await applyVerdicts({
      cellDir,
      rep: opts.rep,
      runId,
      evalRoot: join(repoRoot, "logs", "run_evaluation"),
      ids: passers,
      modelName: pool2Arm,
    });
    const solves = Object.fromEntries(
      passers.map((id) => [id, resolved.has(id)]),
    );
    await Deno.writeTextFile(
      join(outDir, "solves.json"),
      JSON.stringify(solves, null, 2) + "\n",
    );
    console.log(
      `[pool2-run] rep${opts.rep}: ${resolved.size}/${passers.length} resolved` +
        ` → ${join(outDir, "solves.json")}`,
    );
  })
  // ---- pool2-select ----
  .command(
    "pool2-select",
    "Assemble the pool2 headroom data-of-record from the 3 Sonnet reps + Opus probe (FR-BENCH-SWE.POOL2)",
  )
  .option("--baseline <dir:string>", "Sonnet rep base dir", {
    default: "scripts/benchmark/runs/pool2-baseline",
  })
  .option("--opus <dir:string>", "Opus ceiling-probe base dir", {
    default: "scripts/benchmark/runs/pool2-opus-probe",
  })
  .option(
    "--exclude <id:string>",
    "Un-gradeable instance id to exclude (repeatable)",
    { collect: true, default: ["youssofal__mtplx-21"] },
  )
  .option("--out <path:string>", "Headroom data-of-record output path", {
    default: "scripts/benchmark/pool2_headroom.json",
  })
  .option(
    "--freeze",
    "Also freeze the keeper pool (cheapest-first) into --pool-out",
  )
  .option("--pool-out <path:string>", "Frozen pool output path", {
    default: "scripts/benchmark/pool2.json",
  })
  .option(
    "--pool-size <n:number>",
    "Max pool size (fewer if fewer keepers qualify)",
    { default: 20 },
  )
  .action(async (opts) => {
    const readSolves = async (
      p: string,
    ): Promise<Record<string, boolean>> => {
      try {
        return JSON.parse(await Deno.readTextFile(p)) as Record<
          string,
          boolean
        >;
      } catch (e) {
        console.error(`[pool2-select] cannot read solves ${p}: ${e}`);
        Deno.exit(1);
      }
    };
    // 3 Sonnet reps → per-instance 0..3 count.
    const reps: Array<Record<string, boolean>> = [];
    for (const r of [1, 2, 3]) {
      reps.push(
        await readSolves(join(opts.baseline, `rep${r}`, "solves.json")),
      );
    }
    const sonnetReps = assembleSonnetReps(reps);
    // Opus ceiling probe (one rep over the 0/3 queue).
    const opus = await readSolves(join(opts.opus, "rep1", "solves.json"));
    const exclude = new Set(opts.exclude as string[]);
    // Gate: every 0/3 instance MUST carry an Opus verdict, else the probe is
    // incomplete and the reject/keep split would be a measurement artefact.
    // Excluded (un-gradeable) ids are exempt — they never entered the probe.
    const missing = zeroRepsMissingOpus(buildHeadroom(sonnetReps, opus))
      .filter((id) => !exclude.has(id));
    if (missing.length > 0) {
      console.error(
        `[pool2-select] Opus probe incomplete — ${missing.length} of the 0/3 ` +
          `queue have no verdict: ${missing.slice(0, 5).join(", ")}` +
          (missing.length > 5 ? " …" : ""),
      );
      Deno.exit(1);
    }
    const record = buildHeadroomRecord(sonnetReps, opus, exclude);
    const summary = verdictSummary(record);

    // Provenance: carry the campaign's data-of-record forward + the funnel.
    const prov = await loadProvenance(POOL2_PROVENANCE_PATH, 3);
    const split = Object.values(prov.gates)[0]?.split ?? "unknown";
    const perRepResolved = Object.fromEntries(
      reps.map((r, i) => [
        `rep${i + 1}`,
        Object.values(r).filter(Boolean).length,
      ]),
    );
    // The real Opus queue is the 0/3 set MINUS excluded ids (they never ran).
    const opusQueue = zeroRepIds(sonnetReps).filter((id) => !exclude.has(id));
    const provenance = {
      dataset: prov.dataset,
      forkCommit: prov.forkCommit,
      split,
      modelSnapshot: prov.modelSnapshot,
      opusCeiling: "claude-opus — 1 probe over the Sonnet-0/3 queue",
      effort: prov.effort,
      trainingCutoff: prov.trainingCutoff,
      vintageCut: prov.vintageCut,
      vintageRule: prov.vintageRule,
      sonnetReps: 3,
      perRepResolved,
      opusProbe: {
        queueSize: opusQueue.length,
        resolved: opusQueue.filter((id) => opus[id]).length,
      },
      excluded: [...exclude],
      summary,
      eligible: Object.keys(record).length - exclude.size,
      generatedFrom: [
        `${opts.baseline}/rep{1,2,3}/solves.json`,
        `${opts.opus}/rep1/solves.json`,
      ],
    };
    // Sort instances by id for a stable, diff-friendly data-of-record.
    const sortedInstances = Object.fromEntries(
      Object.keys(record).sort().map((id) => [id, record[id]]),
    );
    await Deno.writeTextFile(
      opts.out,
      JSON.stringify({ provenance, instances: sortedInstances }, null, 2) +
        "\n",
    );
    console.log(`[pool2-select] wrote headroom data-of-record → ${opts.out}`);
    console.log(
      `  eligible=${provenance.eligible}  ` +
        `keeper=${summary.keeper}  ` +
        `reject_no_headroom=${summary.reject_no_headroom}  ` +
        `reject_no_ceiling=${summary.reject_no_ceiling}  ` +
        `excluded=${summary.excluded}`,
    );
    console.log(
      `  per-rep Sonnet resolved: ${JSON.stringify(perRepResolved)}  ` +
        `Opus ceiling: ${provenance.opusProbe.resolved}/${provenance.opusProbe.queueSize}`,
    );

    if (opts.freeze) {
      // Freeze the keeper pool cheapest-first. selectPool2 re-applies the
      // keep-rule over the SAME headroom, so the frozen pool can never disagree
      // with the data-of-record; it is <= pool-size (8 keepers < 20 here).
      const candidates = JSON.parse(
        await Deno.readTextFile(POOL2_CANDIDATES_PATH),
      ) as Pool2Candidate[];
      const pool = selectPool2(record, candidates, exclude, opts.poolSize);
      await Deno.writeTextFile(
        opts.poolOut,
        JSON.stringify(pool, null, 2) + "\n",
      );
      console.log(
        `[pool2-select] froze ${pool.length} keeper(s) (cap ${opts.poolSize}) → ${opts.poolOut}`,
      );
      if (pool.length < summary.keeper) {
        console.error(
          `  WARNING: ${summary.keeper} keepers but only ${pool.length} have candidate metadata`,
        );
      }
    }
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
      predictionsPath = await writeGradablePredictions(opts.predictions);
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
  .option("--ide <name:string>", "IDE under test (claude | codex)", {
    default: "claude",
  })
  .option("--judge-model <name:string>", "Judge model (always Claude)", {
    default: "sonnet",
  })
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
    // implements [FR-BENCH-SWE.IDE](../documents/requirements.md#fr-bench-swe.ide-second-ide-under-test-codex-arm-ancfrbench-swe-ide):
    // reject a cross-IDE model at the CLI edge, before any session is spawned.
    const ide = opts.ide as AcpIde;
    if (!SUPPORTED_IDES.includes(ide)) {
      console.error(
        `--ide must be one of ${SUPPORTED_IDES.join(", ")}, got '${opts.ide}'`,
      );
      Deno.exit(1);
    }
    try {
      assertModelForIde(ide, opts.model);
    } catch (e) {
      console.error((e as Error).message);
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
      `[run] arm=${arm} ide=${ide} instances=${instanceIds.length} ` +
        `model=${opts.model} judge=${opts.judgeModel}`,
    );
    console.log(`[run] out=${outDir}`);
    await runBenchmark({
      arm,
      instanceIds,
      model: opts.model,
      ide,
      judgeModel: opts.judgeModel,
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
      predictionsPath: await writeGradablePredictions(baselinePreds),
      modelName: "baseline",
      runId: "bench-baseline",
    });

    const flowaiPreds = join(opts.out, "flowai.jsonl");
    let fResolved: string[] = [];
    let fAttempted: string[] = [];
    if (await Deno.stat(flowaiPreds).then(() => true).catch(() => false)) {
      console.log(`[report] grading flowai (${flowaiPreds})`);
      const fRes = await runEvaluation({
        predictionsPath: await writeGradablePredictions(flowaiPreds),
        modelName: "flowai",
        runId: "bench-flowai",
      });
      fResolved = fRes.resolvedIds;
      fAttempted = await readPredIds(flowaiPreds);
    } else {
      console.log(`[report] no flowai predictions yet — baseline-only report`);
    }

    const rep = aggregateAB(POOL, bRes.resolvedIds, fResolved, fAttempted);
    // implements [FR-BENCH-SWE.COST](../documents/requirements.md#fr-bench-swe.cost-session-cost-counters-informative-never-a-quality-criterion-ancfrbench-swe-cost):
    // attach per-arm cost totals when the run captured metrics (older
    // campaigns predate capture — the section is simply absent).
    const byArm = await loadRunMetrics(opts.out);
    const costs = {
      baseline: byArm.baseline ? sumCost(byArm.baseline) : undefined,
      flowai: byArm.flowai ? sumCost(byArm.flowai) : undefined,
    };
    // implements [FR-BENCH-SWE.WEBAUDIT](../documents/requirements.md#fr-bench-swe.webaudit-per-instance-web-access-audit-flagged-never-banned-ancfrbench-swe-webaudit):
    // attach the per-arm web-access audit when the run captured it.
    const audits = await loadRunWebAudits(opts.out);
    const md = renderMarkdownAB(
      rep,
      {
        date: today(),
        model: opts.model,
        dataset: DATASET,
      },
      costs.baseline || costs.flowai ? costs : undefined,
      audits.baseline || audits.flowai ? audits : undefined,
    );
    const reportPath = opts.report ??
      join("documents/benchmarks", `swe-verified-${today()}.md`);
    await ensureDir(join(reportPath, ".."));
    await Deno.writeTextFile(reportPath, md);
    console.log(`\n${md}`);
    console.log(`[report] written → ${reportPath}`);
  })
  // ---- retro ----
  .command(
    "retro",
    "Regression decomposition of already-graded runs (FR-BENCH-SWE.P2P, no LLM)",
  )
  .option("--dir <path:string>", "run_evaluation root", {
    default: "logs/run_evaluation",
  })
  .option(
    "--run <id:string>",
    "Run id under --dir, optionally '<id>:<arm>' to keep one arm (repeatable)",
    { collect: true },
  )
  .option(
    "--glob <pattern:string>",
    "Run-id glob over --dir (repeatable; * and ? wildcards)",
    { collect: true },
  )
  .option("--pool-only", "Keep only instances of the current pool.json")
  .option("--title <text:string>", "Report title", {
    default: "Regression decomposition (retro)",
  })
  .option("--out <path:string>", "Also write the markdown to this path")
  .action(async (opts) => {
    // "<id>" keeps every arm; "<id>:<arm>" keeps one (e.g. `newpool:baseline`
    // — that run also holds an unrelated old flowai arm).
    const armFilter = new Map<string, string>();
    const runIds = new Set<string>();
    for (const spec of opts.run ?? []) {
      const [id, arm] = spec.split(":");
      runIds.add(id);
      if (arm) armFilter.set(id, arm);
    }
    const globs = opts.glob ?? [];
    if (runIds.size === 0 && globs.length === 0) {
      console.error("retro requires at least one --run or --glob");
      Deno.exit(1);
    }
    if (globs.length > 0) {
      const patterns = globs.map((g) =>
        new RegExp(
          "^" +
            g.replaceAll(/[.+^${}()|[\]\\]/g, "\\$&")
              .replaceAll("*", ".*")
              .replaceAll("?", ".") +
            "$",
        )
      );
      const before = runIds.size;
      for await (const e of Deno.readDir(opts.dir)) {
        if (e.isDirectory && patterns.some((p) => p.test(e.name))) {
          runIds.add(e.name);
        }
      }
      if (runIds.size === before) {
        console.error(
          `retro: no run dirs under ${opts.dir} match ${globs.join(", ")}`,
        );
        Deno.exit(1);
      }
    }
    let grades = (await Promise.all(
      [...runIds].sort().map((id) => scanRun(opts.dir, id)),
    )).flat().filter((g) => {
      const arm = armFilter.get(g.runId);
      return arm === undefined || g.arm === arm;
    });
    if (opts.poolOnly) {
      const pool = new Set(poolIds());
      grades = grades.filter((g) => pool.has(g.instanceId));
    }
    if (grades.length === 0) {
      console.error("retro: matched runs contain no graded instances");
      Deno.exit(1);
    }
    const md = renderRetroMarkdown(grades, { title: opts.title });
    console.log(md);
    if (opts.out) {
      await ensureDir(join(opts.out, ".."));
      await Deno.writeTextFile(opts.out, md);
      console.log(`[retro] written → ${opts.out}`);
    }
  })
  // ---- cells-import ----
  .command(
    "cells-import",
    "Import a pre-cell campaign dir into a result cell (FR-BENCH-SWE.CELLS)",
  )
  .option("--from <path:string>", "Campaign base dir holding rep<N>/", {
    required: true,
  })
  .option("--cells <path:string>", "Cells root", { default: CELLS_ROOT })
  .option("--eval-root <path:string>", "swebench run_evaluation root", {
    default: "logs/run_evaluation",
  })
  .option(
    "--exclude <spec:string>",
    "Instance id and reason as '<id>=<reason>' (repeatable)",
    { collect: true },
  )
  .action(async (opts) => {
    const excluded: Record<string, string> = {};
    for (const spec of opts.exclude ?? []) {
      const i = spec.indexOf("=");
      if (i < 0) {
        console.error(`--exclude needs '<id>=<reason>', got: ${spec}`);
        Deno.exit(1);
      }
      excluded[spec.slice(0, i)] = spec.slice(i + 1);
    }
    const dir = await importCampaign({
      campaignDir: opts.from,
      cellsRoot: opts.cells,
      evalRoot: opts.evalRoot,
      harnessCommit: await currentCommit(),
      env: await readCellEnv(),
      excluded,
    });
    console.log(`[cells-import] ${opts.from} → ${dir}`);
  })
  // ---- cells-select ----
  .command(
    "cells-select",
    "Apply the pool keep-rule across a subject cell and a ceiling cell (FR-BENCH-SWE.CELLS)",
  )
  .option("--subject <cellId:string>", "Subject cell id", { required: true })
  .option("--ceiling <cellId:string>", "Ceiling-probe cell id", {
    required: true,
  })
  .option("--cells <path:string>", "Cells root", { default: CELLS_ROOT })
  .option("--subject-reps <list:string>", "Subject reps", { default: "1,2,3" })
  .option("--ceiling-reps <list:string>", "Ceiling reps", { default: "1,2" })
  .option("--freeze <path:string>", "Write the selection to this path")
  .action(async (opts) => {
    const reps = (s: string) => s.split(",").map((n) => Number(n.trim()));
    const sel = buildSelection({
      subject: await readCell(join(opts.cells, opts.subject)),
      ceiling: await readCell(join(opts.cells, opts.ceiling)),
      subjectReps: reps(opts.subjectReps),
      ceilingReps: reps(opts.ceilingReps),
      subjectCellId: opts.subject,
      ceilingCellId: opts.ceiling,
    });
    console.log(`[cells-select] rule: ${sel.rule}`);
    for (const [verdict, n] of Object.entries(sel.counts)) {
      console.log(`  ${verdict}: ${n}`);
    }
    console.log(`[cells-select] pool (${sel.pool.length}):`);
    for (const id of sel.pool) console.log(`  ${id}`);
    if (sel.counts.incomplete > 0 || sel.counts.undecided_no_ceiling_run > 0) {
      console.log(
        `[cells-select] NOT frozen into the pool and NOT rejected: ` +
          `${sel.counts.incomplete} incomplete, ` +
          `${sel.counts.undecided_no_ceiling_run} awaiting a ceiling run`,
      );
    }
    if (opts.freeze) {
      await ensureDir(join(opts.freeze, ".."));
      await Deno.writeTextFile(
        opts.freeze,
        JSON.stringify(
          { frozenAt: new Date().toISOString(), ...sel },
          null,
          2,
        ) +
          "\n",
      );
      console.log(`[cells-select] frozen → ${opts.freeze}`);
    }
  })
  // ---- cells-show ----
  .command("cells-show", "List result cells with per-rep counts")
  .option("--cells <path:string>", "Cells root", { default: CELLS_ROOT })
  .action(async (opts) => {
    const lines = await summariseCells(opts.cells);
    if (lines.length === 0) {
      console.log(`[cells-show] no cells under ${opts.cells}`);
      return;
    }
    for (const l of lines) console.log(l);
  })
  .parse(Deno.args);
