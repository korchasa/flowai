/**
 * Same-harness A/B agent driver for the SWE-bench benchmark (FR-BENCH-SWE).
 *
 * Both arms run the SAME harness — one IDE over the ACP transport, Claude Code
 * by default and Codex via `--ide codex` (FR-BENCH-SWE.IDE) — so the only
 * difference within a campaign is flowai:
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
import type { AcpIde } from "@acceptance-tests/acp/registry.ts";
import { createAdapter } from "@acceptance-tests/adapters/mod.ts";
import { copyFrameworkToIdeDir } from "@acceptance-tests/utils.ts";
import { candidateById } from "./instances.ts";
import { type InstanceData, loadInstanceData } from "./dataset.ts";
import { prepareSandbox } from "./prepare_sandbox.ts";
import { externalSandboxRoot, linkIntoRunDir } from "./sandbox_root.ts";
import { installAgentsMd, installDocStubs } from "./agents_md.ts";
import {
  appendPrediction,
  captureDiff,
  initPredictionsFile,
  type Prediction,
  toPrediction,
} from "./predictions.ts";
import {
  baselineTask,
  type CommandPrefix,
  commandPrefixFor,
  planTurn,
} from "./operator.ts";
import {
  BaselineJudgeOperator,
  JudgeGateOperator,
  makeCliAnswerJudge,
  makeCliGateJudge,
} from "./gate.ts";
import { collectBenchHomeMetrics, fmtCost } from "./metrics.ts";
import { collectWebAudit } from "./webaudit.ts";

/** AcpAgent user-emulator contract — both arm operators satisfy it. */
type Operator = {
  getResponse: (
    messages: Array<{ role: string; content: string }>,
  ) => Promise<string | null>;
};

export type Arm = "baseline" | "flowai";

const CORE_PACKS = ["core"];

export interface RunOptions {
  arm: Arm;
  instanceIds: string[];
  model: string;
  /**
   * IDE under test (FR-BENCH-SWE.IDE). Defaults to `claude`. Both arms of one
   * campaign MUST use the same IDE — it is a harness variable, not the thing
   * being measured (flowai is).
   */
  ide?: AcpIde;
  /**
   * Model for the gate/answer judge, which stays on Claude regardless of the
   * IDE under test — one referee keeps campaigns comparable. Defaults to
   * `sonnet` (the historical value, so Claude campaigns are unchanged).
   */
  judgeModel?: string;
  outDir: string;
  /** Per-agent-session timeout (ms). SWE-bench fixes need long autonomous runs. */
  stepTimeoutMs: number;
  /** Repo root (framework/ + template resolved relative to this). */
  repoRoot: string;
  /**
   * Reasoning effort PINNED for the agent AND the judge. MUST be identical in
   * both arms — the same-harness A/B differs only by flowai, never by effort.
   * Defaults to `high` (the realistic Claude Code default for Sonnet 5).
   */
  effort?: string;
}

/**
 * implements [FR-BENCH-SWE.SYMMETRY](../../documents/requirements.md#fr-bench-swe.symmetry-one-judge-for-both-arms-equal-human-availability-ancfrbench-swe-symmetry):
 * Deterministic effort env for a bench session. Claude Code inherits the
 * operator's shell env (Deno.Command does not clear it), so a stray
 * `CLAUDE_EFFORT`/`CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING` from the shell that
 * launched the benchmark would silently set the reasoning effort — and the
 * baseline (run now) and flowai (run later) arms could then differ by effort
 * alone, corrupting the A/B. This pins both keys to the campaign value so the
 * effort is a property of the benchmark, not of whoever's shell ran it.
 */
export function effortEnv(effort: string): Record<string, string> {
  return {
    CLAUDE_EFFORT: effort,
    // Neutralize an inherited disable so effort is the sole reasoning control.
    CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING: "0",
  };
}

/**
 * implements [FR-BENCH-SWE.IDE](../../documents/requirements.md#fr-bench-swe.ide-second-ide-under-test-codex-arm-ancfrbench-swe-ide):
 * Deterministic effort + model env for a Codex bench session. Codex reads its
 * reasoning effort and model from `~/.codex/config.toml`, so an un-pinned run
 * would inherit whatever the maintainer's machine happens to set (this host:
 * `model_reasoning_effort = "ultra"`, `model = "gpt-5.6-sol"`) and two arms run
 * days apart could differ by effort alone — the same corruption `effortEnv`
 * prevents for Claude. `CODEX_CONFIG` is the bridge's documented override: a
 * JSON object merged into the Codex session config, which wins over the file.
 */
export function codexAgentEnv(
  effort: string,
  model: string,
): Record<string, string> {
  return {
    CODEX_CONFIG: JSON.stringify({
      model_reasoning_effort: effort,
      model,
    }),
  };
}

/** Model-id families each IDE can actually serve. */
const IDE_MODEL_PATTERNS: Record<string, RegExp> = {
  claude: /^(sonnet|opus|haiku|claude[-.])/i,
  codex: /^(gpt[-.]|o\d|codex)/i,
};

/**
 * implements [FR-BENCH-SWE.IDE](../../documents/requirements.md#fr-bench-swe.ide-second-ide-under-test-codex-arm-ancfrbench-swe-ide):
 * Fail fast when the campaign's model belongs to a DIFFERENT IDE than the one
 * under test (`--ide codex --model sonnet`). Without this the label reaches a
 * bridge that cannot serve it, and the run either dies deep inside a session
 * that already cost minutes or silently proceeds on the user's configured
 * model — a same-harness A/B corrupted at the root. An unrecognised id passes:
 * pinning a fresh snapshot must not require editing this table.
 */
export function assertModelForIde(ide: string, model: string): void {
  for (const [otherIde, pattern] of Object.entries(IDE_MODEL_PATTERNS)) {
    if (otherIde === ide) continue;
    if (pattern.test(model)) {
      throw new Error(
        `model "${model}" looks like a ${otherIde} model but --ide is ` +
          `"${ide}" — pin a ${ide} model or switch the IDE`,
      );
    }
  }
}

/**
 * Detect the ACP subscription-auth outage that struck rep-1: when the
 * operator's OAuth token expires mid-batch, ACP raises the JSON-RPC error
 * `{ code: -32000, message: 'Authentication required' }` (surfaced as an
 * `[acp-error]`), the model never engages, and the session yields an empty
 * diff. Such a session was NEVER fairly attempted, so — like a `system_health`
 * abort (isHealthAbort) — it must NOT be recorded as a genuine baseline miss;
 * the measurement tier leaves it pending for a resume after re-login/refresh.
 *
 * Requires BOTH the JSON-RPC code AND the message: the `-32000` code is an
 * ACP-internal signal, never application text, so a repo whose OWN source
 * mentions "Authentication required" (e.g. an HTTP 401 handler the agent read
 * or wrote) cannot false-trip the detector into discarding a real attempt.
 */
export function isAuthFailure(logs: string): boolean {
  return logs.includes("-32000") && logs.includes("Authentication required");
}

/**
 * Detect a TRANSIENT sandbox-setup failure — a network/DNS blip during the repo
 * clone (`prepareSandbox` throws `git clone <url> <tmp> failed: …`). Like an
 * auth outage or a health abort, the instance was never fairly attempted, so
 * the measurement tier must leave it PENDING for a retry rather than bank an
 * empty patch as a genuine miss (the opus-probe hit this: a DNS blip made 13 of
 * 26 clones fail, silently scoring 13 valid instances as "Opus can't solve").
 *
 * Deliberately NARROW: requires the clone stage AND a transient network
 * signature. A PERMANENT failure — an unfetchable base ref (`not our ref`,
 * youssofal) — must NOT match, or the driver would retry it forever instead of
 * letting selection exclude it as a genuine dead instance.
 */
export function isTransientSetupFailure(msg: string): boolean {
  if (!/git clone/.test(msg)) return false;
  return /Could not resolve host|unable to access|Connection (timed out|refused|reset)|Couldn'?t connect|Could not connect|429 Too Many|Operation timed out|timed out/i
    .test(msg);
}

/**
 * Build the FIRST turn for an arm.
 * - baseline: the whole task in one neutral prompt; a reviewer (the answer
 *   judge) is reachable for questions in later turns.
 * - flowai: a `/plan` invocation carrying only the issue; the `/implement` and
 *   `/review` steps are delivered later by the operator (see runArm), so the
 *   agent actually runs the skills as separate operator-issued commands
 *   instead of front-loading the workflow as prose.
 */
export function buildPrompt(
  arm: Arm,
  data: InstanceData,
  prefix: CommandPrefix = "/",
): string {
  if (arm === "baseline") return baselineTask(data.repo, data.problemStatement);
  return planTurn(data.repo, data.problemStatement, prefix);
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
  operator?: Operator,
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

/**
 * Run one (instance, arm) pair; return its prediction. Exported so the pool2
 * measurement driver (`pool2_measure.ts`) can drive instances concurrently
 * with an injected {@link InstanceData} instead of the princeton loader.
 */
export async function runArm(
  data: InstanceData,
  opts: RunOptions,
): Promise<
  { prediction: Prediction; code: number; logPath: string; authFailed: boolean }
> {
  // Per-instance parent dir. `prepareAcpClaudeHome` builds the isolated Claude
  // $HOME as a SIBLING of the sandbox (`dirname(sandboxPath)/bench-home`). If
  // all instances shared one parent, they would also share one bench-home and
  // each ACP session's transcript (`.claude/projects/<slug>`) would overwrite
  // the previous one. Giving every instance its own parent makes the bench-home
  // — and thus the saved Claude Code transcript — unique and persistent.
  //
  // The sandbox (and hence bench-home) lives OUTSIDE $HOME: ancestor-directory
  // memory files load regardless of the isolated HOME (sandbox_root.ts), so a
  // sandbox under the repo would inherit the developer's personal agent rules.
  // The run dir keeps `sandbox`/`bench-home` symlinks for post-run analysis;
  // artifacts (transcript log, predictions) stay in the run dir as before.
  const instDir = join(opts.outDir, opts.arm, data.instanceId);
  const extInstDir = join(
    await externalSandboxRoot(opts.outDir),
    opts.arm,
    data.instanceId,
  );
  const sandboxDir = join(extInstDir, "sandbox");
  await ensureDir(instDir);
  await ensureDir(extInstDir);
  const cacheDir = join(opts.outDir, "..", "_repo-cache");

  await prepareSandbox(data, sandboxDir, cacheDir);

  // IDE under test (FR-BENCH-SWE.IDE). The config dir comes from the ACP
  // registry (`.claude` / `.codex` / …), never a literal, so installing the
  // pack lands where THIS IDE discovers skills.
  const ide: AcpIde = opts.ide ?? "claude";
  const adapter = createAdapter(ide);

  if (opts.arm === "flowai") {
    await copyFrameworkToIdeDir(
      join(opts.repoRoot, "framework"),
      join(sandboxDir, adapter.configDir),
      ide,
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

  // ACP transport (FR-ACCEPT.ACP): build the isolated $HOME so sandbox skills
  // win over the user-level snapshot and subscription auth survives. For codex
  // this also yields CODEX_HOME (its own config root).
  const baseEnv = adapter.prepareWorkspace
    ? await adapter.prepareWorkspace(sandboxDir)
    : {};
  // Pin reasoning effort for BOTH the agent and the judge (they share `env`),
  // so it is a property of the campaign, not of the operator's shell. The
  // Claude keys are always present because the judge is always Claude; a codex
  // agent additionally gets its effort+model through CODEX_CONFIG.
  const effort = opts.effort ?? "high";
  const env = {
    ...baseEnv,
    ...effortEnv(effort),
    ...(ide === "codex" ? codexAgentEnv(effort, opts.model) : {}),
  };

  // implements [FR-BENCH-SWE.SYMMETRY](../../documents/requirements.md#fr-bench-swe.symmetry-one-judge-for-both-arms-equal-human-availability-ancfrbench-swe-symmetry):
  // ONE judge persona serves both arms, so the arms differ only by flowai.
  // flowai is operator-driven: turn 1 is `/plan` (buildPrompt); turn 2 is the
  // LLM-JUDGED human gate — the judge reads the issue + the plan output and
  // authorizes a variant (or names missed outcomes); turn 3 is `/review`.
  // baseline gets the SAME judge as an answer-operator: after each agent turn
  // it answers the engineer's question from the issue text only, or ends the
  // session (DONE). Judge turns are stochastic in BOTH arms — a harness
  // property every report must state. Judge failure fails the instance loudly
  // (no fallback). Both judges share the bench's isolated HOME (env) so the
  // developer's personal ~/.claude memory cannot leak into replies.
  // The judge runs on Claude even when the agent under test is codex — it is
  // the referee, not the subject, and one fixed referee keeps campaigns
  // comparable. Its model is therefore pinned separately from `opts.model`
  // (which names the AGENT's model and may be a codex id `claude -p` cannot
  // serve).
  const judgeModel = opts.judgeModel ?? "sonnet";
  // Skill-invocation prefix for THIS ide — `/plan …` is rejected outright by
  // the codex bridge, which needs `$plan …` (FR-BENCH-SWE.IDE).
  const prefix = commandPrefixFor(ide);
  const operator: Operator = opts.arm === "flowai"
    ? new JudgeGateOperator(
      data.problemStatement,
      makeCliGateJudge(judgeModel, env),
      prefix,
    )
    : new BaselineJudgeOperator(
      data.problemStatement,
      makeCliAnswerJudge(judgeModel, env),
    );

  const agent = new AcpAgent({
    ide,
    workspace: sandboxDir,
    model: opts.model,
    prompt: buildPrompt(opts.arm, data, prefix),
    // Equal session shape in both arms (FR-BENCH-SWE.SYMMETRY).
    maxSteps: 3,
    env,
    name: `bench/${opts.arm}/${data.instanceId}`,
  });

  const wallStart = Date.now();
  const result = await runWithTimeout(agent, opts.stepTimeoutMs, operator);
  const wallClockMs = Date.now() - wallStart;
  const logPath = join(instDir, `${data.instanceId}.log`);
  await Deno.writeTextFile(logPath, result.logs);
  await linkIntoRunDir(instDir, extInstDir);

  // implements [FR-BENCH-SWE.COST](../../documents/requirements.md#fr-bench-swe.cost-session-cost-counters-informative-never-a-quality-criterion-ancfrbench-swe-cost):
  // harvest cost counters from the bench-home transcripts
  // NOW — bench-home lives in the OS temp root and is purged within days.
  // Collection failure is loud but never fails the instance: the prediction
  // (a 20-minute LLM session's primary measurement) is not sacrificed to a
  // counter.
  //
  // implements [FR-BENCH-SWE.IDE](../../documents/requirements.md#fr-bench-swe.ide-second-ide-under-test-codex-arm-ancfrbench-swe-ide):
  // BOTH harvests below read Claude Code transcripts, so they describe the
  // agent only when the agent IS Claude. Under codex the sole transcripts in
  // bench-home belong to the JUDGE — harvesting them would render a
  // plausible-looking "session cost" that actually measures the referee. Skip
  // explicitly and say so, rather than publish a number that means something
  // else. Codex's own counters live in CODEX_HOME/sessions/rollout-*.jsonl
  // (`total_token_usage`) and are a deferred port, not a lost measurement.
  const canHarvestTranscripts = ide === "claude";
  if (!canHarvestTranscripts) {
    console.log(
      `  cost: unavailable (${ide} — Claude transcripts describe the judge, not the agent)`,
    );
    console.log(`  web: unavailable (${ide} — same reason)`);
  }

  if (canHarvestTranscripts) {
    try {
      const metrics = await collectBenchHomeMetrics(
        join(extInstDir, "bench-home"),
        wallClockMs,
      );
      await Deno.writeTextFile(
        join(instDir, `${data.instanceId}.metrics.json`),
        JSON.stringify(metrics, null, 2) + "\n",
      );
      console.log(`  cost: ${fmtCost(metrics)}`);
    } catch (e) {
      console.error(
        `  [metrics] FAILED ${data.instanceId}: ${(e as Error).message}`,
      );
    }
  }

  // implements [FR-BENCH-SWE.WEBAUDIT](../../documents/requirements.md#fr-bench-swe.webaudit-per-instance-web-access-audit-flagged-never-banned-ancfrbench-swe-webaudit):
  // audit web accesses from the same soon-to-be-purged transcripts — research
  // is allowed, oracle-adjacent hits are flagged for the report, never banned.
  // Loud on failure, never fails the instance (same exception as metrics).
  if (canHarvestTranscripts) {
    try {
      const audit = await collectWebAudit(
        join(extInstDir, "bench-home"),
        data.repo,
        data.instanceId,
      );
      await Deno.writeTextFile(
        join(instDir, `${data.instanceId}.webaudit.json`),
        JSON.stringify(audit, null, 2) + "\n",
      );
      console.log(
        `  web: ${audit.accesses.length} access(es), ${audit.flaggedCount} flagged`,
      );
    } catch (e) {
      console.error(
        `  [webaudit] FAILED ${data.instanceId}: ${(e as Error).message}`,
      );
    }
  }

  const diff = await captureDiff(sandboxDir);
  const prediction = toPrediction(data.instanceId, opts.arm, diff);
  // An ACP auth outage (token expiry) means the model never engaged — flag it
  // so the resumable measurement tier leaves the instance pending instead of
  // banking an empty patch as a real miss (see isAuthFailure / runBaselineBatch).
  const authFailed = isAuthFailure(result.logs);
  return { prediction, code: result.code, logPath, authFailed };
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
