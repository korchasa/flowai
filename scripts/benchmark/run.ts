/**
 * Same-harness A/B agent driver for the SWE-bench benchmark (FR-BENCH-SWE).
 *
 * Both arms run the SAME harness — Claude Code + Sonnet over the ACP transport
 * — so the only difference is flowai:
 *   - baseline: nothing installed, neutral "fix the bug" prompt.
 *   - flowai:   local `core` pack + process-rules AGENTS.md installed, prompt
 *               steering plan → implement → review.
 * This isolates flowai's contribution (unlike comparing against a published
 * different-scaffold submission).
 *
 * For each (instance, arm):
 *   1. prepare a clean checkout at base_commit;
 *   2. flowai arm: install the local `core` pack + AGENTS.md;
 *   3. drive the IDE agent autonomously on the issue;
 *   4. capture the working-tree diff → swebench prediction.
 *
 * Produces `<out>/<arm>.jsonl` for `verify`/`report`. No commit/push — swebench
 * grades the patch directly.
 *
 * Gate emulation (recorded in every report): the human decision gate after
 * `/plan` is played by an LLM judge (`gate.ts`) that reads ONLY the issue and
 * the plan output — it authorizes a variant and names missed outcomes, like a
 * knowledgeable reviewer. This makes plan quality measurable (the former
 * scripted "Go ahead with your recommended variant" rubber-stamped any plan)
 * at the cost of a stochastic gate turn. It still under-approximates a real
 * human, who carries context the issue text lacks.
 */

import { join, resolve } from "@std/path";
import { ensureDir } from "@std/fs";
import { AcpAgent } from "@acceptance-tests/acp/acp_agent.ts";
import { createAdapter } from "@acceptance-tests/adapters/mod.ts";
import { copyFrameworkToIdeDir } from "@acceptance-tests/utils.ts";
import { candidateById } from "./instances.ts";
import { type InstanceData, loadInstanceData } from "./dataset.ts";
import { prepareSandbox } from "./prepare_sandbox.ts";
import { installAgentsMd, installDocStubs } from "./agents_md.ts";
import {
  appendPrediction,
  captureDiff,
  initPredictionsFile,
  type Prediction,
  toPrediction,
} from "./predictions.ts";
import { baselineTask, planTurn } from "./operator.ts";
import { JudgeGateOperator, makeCliGateJudge } from "./gate.ts";

export type Arm = "baseline" | "flowai";

const CORE_PACKS = ["core"];

export interface RunOptions {
  arm: Arm;
  instanceIds: string[];
  model: string;
  outDir: string;
  /** Per-agent-session timeout (ms). SWE-bench fixes need long autonomous runs. */
  stepTimeoutMs: number;
  /** Repo root (framework/ + template resolved relative to this). */
  repoRoot: string;
}

/**
 * Build the FIRST turn for an arm.
 * - baseline: the whole task in one neutral prompt.
 * - flowai: a `/plan` invocation carrying only the issue; the `/implement` and
 *   `/review` steps are delivered later by the ScriptedOperator (see runArm), so
 *   the agent actually runs the skills as separate operator-issued commands
 *   instead of front-loading the workflow as prose.
 */
export function buildPrompt(arm: Arm, data: InstanceData): string {
  if (arm === "baseline") return baselineTask(data.repo, data.problemStatement);
  return planTurn(data.repo, data.problemStatement);
}

/**
 * Run an ACP agent under a hard per-session timeout. AcpAgent has no built-in
 * turn timeout (the acceptance runner wraps it the same way); on timeout we kill
 * the process tree and report exit 124 so the empty/partial diff is still
 * captured.
 */
async function runWithTimeout(
  agent: AcpAgent,
  timeoutMs: number,
  operator?: JudgeGateOperator,
): Promise<{ code: number; logs: string }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`session timeout after ${timeoutMs}ms`)),
      timeoutMs,
    );
  });
  try {
    return await Promise.race([agent.run(operator), timeout]);
  } catch (e) {
    agent.kill();
    return { code: 124, logs: `[TIMEOUT] ${(e as Error).message}` };
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/** Run one (instance, arm) pair; return its prediction. */
async function runArm(
  data: InstanceData,
  opts: RunOptions,
): Promise<{ prediction: Prediction; code: number; logPath: string }> {
  // Per-instance parent dir. `prepareAcpClaudeHome` builds the isolated Claude
  // $HOME as a SIBLING of the sandbox (`dirname(sandboxPath)/bench-home`). If
  // all instances shared one parent, they would also share one bench-home and
  // each ACP session's transcript (`.claude/projects/<slug>`) would overwrite
  // the previous one. Giving every instance its own parent makes the bench-home
  // — and thus the saved Claude Code transcript — unique and persistent.
  const instDir = join(opts.outDir, opts.arm, data.instanceId);
  const sandboxDir = join(instDir, "sandbox");
  await ensureDir(instDir);
  const cacheDir = join(opts.outDir, "..", "_repo-cache");

  await prepareSandbox(data, sandboxDir, cacheDir);

  if (opts.arm === "flowai") {
    await copyFrameworkToIdeDir(
      join(opts.repoRoot, "framework"),
      join(sandboxDir, ".claude"),
      "claude",
      CORE_PACKS,
    );
    await installAgentsMd(opts.repoRoot, sandboxDir, data.repo);
    // Initialize the flowai doc-system on disk. Seeding ONLY an empty Tasks dir
    // was not enough: on django-14792 the agent saw the SRS/index files absent,
    // conflated that with "roles unbound", declared the repo "not flowai", and
    // skipped the plan task file. installDocStubs writes tiny static SRS + index
    // stubs (and ensures Tasks/) that state plainly this is a flowai task with no
    // formal FRs — removing the misread for zero LLM cost. The whole `documents/`
    // tree is excluded from the captured diff (DIFF_EXCLUDES).
    await installDocStubs(sandboxDir, data.repo);
  }

  // ACP transport (FR-ACCEPT.ACP): build the isolated Claude $HOME so sandbox
  // skills win over ~/.claude/skills/ and subscription auth survives.
  const adapter = createAdapter("claude");
  const env = adapter.prepareWorkspace
    ? await adapter.prepareWorkspace(sandboxDir)
    : {};

  // flowai is operator-driven: turn 1 is `/plan` (buildPrompt); turn 2 is the
  // LLM-JUDGED human gate (FR-BENCH-SWE) — the judge reads the issue + the plan
  // output and authorizes a variant (or names missed outcomes) instead of the
  // former unconditional rubber stamp; turn 3 is `/review`. The gate is
  // therefore stochastic — a harness property every report must state. Judge
  // failure fails the instance loudly (no fallback). baseline is single-turn.
  const operator = opts.arm === "flowai"
    ? new JudgeGateOperator(
      data.problemStatement,
      // The judge shares the bench's isolated HOME (env) so the developer's
      // personal ~/.claude memory cannot leak into the verdict.
      makeCliGateJudge(opts.model, env),
    )
    : undefined;

  const agent = new AcpAgent({
    ide: "claude",
    workspace: sandboxDir,
    model: opts.model,
    prompt: buildPrompt(opts.arm, data),
    maxSteps: operator ? 3 : 1,
    env,
    name: `bench/${opts.arm}/${data.instanceId}`,
  });

  const result = await runWithTimeout(agent, opts.stepTimeoutMs, operator);
  const logPath = join(instDir, `${data.instanceId}.log`);
  await Deno.writeTextFile(logPath, result.logs);

  const diff = await captureDiff(sandboxDir);
  const prediction = toPrediction(data.instanceId, opts.arm, diff);
  return { prediction, code: result.code, logPath };
}

/** Drive one arm over the given instances and write its predictions file. */
export async function runBenchmark(opts: RunOptions): Promise<string> {
  // Absolute outDir: the Claude adapter builds bench-home adjacent to the
  // sandbox resolved against the agent's cwd — a relative outDir would place
  // bench-home INSIDE the sandbox and pollute the captured diff.
  opts = { ...opts, outDir: resolve(opts.outDir) };
  await ensureDir(opts.outDir);
  const data = await loadInstanceData(opts.instanceIds, opts.repoRoot);

  // Truncate the predictions file up front, then append one record per instance
  // so an interruption (e.g. the harness killing this long background task)
  // keeps every completed instance on disk instead of losing the whole batch.
  const preds: Prediction[] = [];
  const path = await initPredictionsFile(opts.outDir, opts.arm);
  for (const id of opts.instanceIds) {
    const cand = candidateById(id);
    const tag = cand ? `${cand.difficulty}, ${cand.patchBytes}b` : "unlisted";
    console.log(`[run] ${opts.arm} ${id} (${tag})`);
    let prediction: Prediction;
    try {
      const res = await runArm(data.get(id)!, opts);
      prediction = res.prediction;
      const patchLines = prediction.model_patch.split("\n").length;
      console.log(
        `  exit=${res.code} patch=${patchLines} lines log=${res.logPath}`,
      );
    } catch (e) {
      console.error(`  FAILED ${opts.arm} ${id}: ${(e as Error).message}`);
      // Empty patch → swebench scores it unresolved, keeps the queue complete.
      prediction = toPrediction(id, opts.arm, "");
    }
    preds.push(prediction);
    await appendPrediction(opts.outDir, opts.arm, prediction);
  }
  console.log(`[run] wrote ${preds.length} ${opts.arm} predictions → ${path}`);
  return opts.outDir;
}
