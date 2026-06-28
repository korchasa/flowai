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
 * Limitation (recorded in the report): with no human in the loop the agent
 * self-selects plan variants, so this measures flowai's *autonomous* workflow
 * scaffolding, not its human-in-the-loop decision-gate value.
 */

import { join, resolve } from "@std/path";
import { ensureDir } from "@std/fs";
import { AcpAgent } from "@acceptance-tests/acp/acp_agent.ts";
import { createAdapter } from "@acceptance-tests/adapters/mod.ts";
import { copyFrameworkToIdeDir } from "@acceptance-tests/utils.ts";
import { candidateById } from "./instances.ts";
import { type InstanceData, loadInstanceData } from "./dataset.ts";
import { prepareSandbox } from "./prepare_sandbox.ts";
import {
  appendPrediction,
  captureDiff,
  initPredictionsFile,
  type Prediction,
  toPrediction,
} from "./predictions.ts";

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

/** Build the task prompt. flowai arm additionally steers through the workflow. */
export function buildPrompt(arm: Arm, data: InstanceData): string {
  const base = [
    `You are in a checkout of the ${data.repo} repository at a specific commit.`,
    `Resolve the following GitHub issue by editing the source so the project's tests pass.`,
    `Work fully autonomously: there is no user to consult — make every decision yourself and never stop to ask.`,
    `Do not commit or push; leave your fix in the working tree.`,
    ``,
    `--- ISSUE ---`,
    data.problemStatement,
    `--- END ISSUE ---`,
  ].join("\n");
  if (arm === "baseline") return base;
  return base + "\n\n" + [
    `Follow the flowai engineering workflow end-to-end using your installed skills:`,
    `1. the "plan" skill to plan the fix,`,
    `2. the "implement" skill under TDD (red → green → refactor → check),`,
    `3. the "review" skill to self-review the diff.`,
    `When the plan skill asks you to select an implementation variant, pick the best one yourself and continue — do NOT wait for user input. Do NOT run commit or push.`,
  ].join("\n");
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
): Promise<{ code: number; logs: string }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`session timeout after ${timeoutMs}ms`)),
      timeoutMs,
    );
  });
  try {
    return await Promise.race([agent.run(), timeout]);
  } catch (e) {
    agent.kill();
    return { code: 124, logs: `[TIMEOUT] ${(e as Error).message}` };
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/** Render a generic process-rules AGENTS.md from the framework template. */
async function installAgentsMd(
  repoRoot: string,
  sandboxDir: string,
  repo: string,
): Promise<void> {
  const tplPath = join(repoRoot, "framework/core/assets/AGENTS.template.md");
  let tpl = await Deno.readTextFile(tplPath);
  // Keep the static process rules; blank out flowai-project-specific sections.
  tpl = tpl.replaceAll("{{PROJECT_NAME}}", repo);
  tpl = tpl.replace(
    /\{\{[A-Z_]+\}\}/g,
    "(not specified for this benchmark repository)",
  );
  await Deno.writeTextFile(join(sandboxDir, "AGENTS.md"), tpl);
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
  }

  // ACP transport (FR-ACCEPT.ACP): build the isolated Claude $HOME so sandbox
  // skills win over ~/.claude/skills/ and subscription auth survives.
  const adapter = createAdapter("claude");
  const env = adapter.prepareWorkspace
    ? await adapter.prepareWorkspace(sandboxDir)
    : {};

  const agent = new AcpAgent({
    ide: "claude",
    workspace: sandboxDir,
    model: opts.model,
    prompt: buildPrompt(opts.arm, data),
    maxSteps: 1,
    env,
    name: `bench/${opts.arm}/${data.instanceId}`,
  });

  const result = await runWithTimeout(agent, opts.stepTimeoutMs);
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
