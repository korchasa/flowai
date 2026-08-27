import { join } from "@std/path";
import type { BenchmarkResult, BenchmarkScenario } from "./types.ts";
import type { cliChatCompletion, ModelConfig } from "./llm.ts";
import { evaluateChecklist } from "./judge.ts";
import { formatJudgeEvidence } from "./evidence.ts";
import { TraceLogger } from "./trace.ts";
import { copyFrameworkToIdeDir, copyRecursive, runGit } from "./utils.ts";
import { AcpAgent } from "./acp/acp_agent.ts";
import type { CapturedToolCall } from "./acp/client.ts";
import type { AcpIde } from "./acp/registry.ts";
import {
  detectSkillInvocation,
  DETERMINISTIC_SKILL_CHECK_IDS,
} from "./skill_invocation.ts";
import { UserEmulator } from "./user_emulator.ts";
import type { AgentAdapter } from "./adapters/types.ts";
import { renderAgentsMd } from "./template.ts";
import {
  externalSandboxRoot,
  linkIntoRunDir,
} from "../../benchmark/sandbox_root.ts";

export interface RunnerOptions {
  agentModel: string;
  judgeConfig: ModelConfig;
  workDir: string;
  adapter: AgentAdapter;
  tracer?: TraceLogger;
  runIndex?: number;
  llmClient?: typeof cliChatCompletion;
  judgeClient?: typeof evaluateChecklist;
}

/**
 * Resolve which packs to mount in the sandbox: always `core` + the scenario's
 * own pack, plus any `extraPacks` it declares (deduped). Returns `undefined`
 * when the scenario has no pack (discovery did not populate it) → caller copies
 * all packs. Trigger scenarios use `extraPacks` to install a cross-pack adjacent
 * skill so the agent has a correct neighbour to defer to.
 */
export function resolveAllowedPacks(
  scenarioPack: string | undefined,
  extraPacks?: string[],
): string[] | undefined {
  if (!scenarioPack) return undefined;
  const base = scenarioPack === "core" ? ["core"] : ["core", scenarioPack];
  return [...new Set([...base, ...(extraPacks ?? [])])];
}

/** Build the always-pass result for a scenario marked `skip`. */
function buildSkippedResult(
  scenario: BenchmarkScenario,
  agentModel: string,
): BenchmarkResult {
  console.log(`  SKIPPED: ${scenario.skip}`);
  const skippedResults: Record<string, { pass: boolean; reason: string }> = {};
  for (const item of scenario.checklist) {
    skippedResults[item.id] = {
      pass: true,
      reason: `Skipped: ${scenario.skip}`,
    };
  }
  return {
    scenarioId: scenario.id,
    success: true,
    score: 100,
    errorsCount: 0,
    warningsCount: 0,
    durationMs: 0,
    tokensUsed: 0,
    totalCost: 0,
    toolCallsCount: 0,
    model: agentModel,
    checklistResults: skippedResults,
    logs: `Skipped: ${scenario.skip}`,
  };
}

/**
 * Result for a positive trigger declared unreachable (`noPositiveTrigger`).
 *
 * Reported as an accepted decision, not as a pass. It is loud on purpose: a
 * scenario retired this way must stay readable in the sweep output, because the
 * whole point is that somebody chose to stop chasing it and said why.
 */
export function buildNoPositiveTriggerResult(
  scenario: BenchmarkScenario,
  agentModel: string,
): BenchmarkResult {
  const reason = scenario.noPositiveTrigger ?? "";
  console.log(`  NO POSITIVE TRIGGER (accepted decision): ${reason}`);
  const results: Record<string, { pass: boolean; reason: string }> = {};
  for (const item of scenario.checklist) {
    results[item.id] = {
      pass: true,
      reason: `Not run — positive trigger declared unreachable: ${reason}`,
    };
  }
  return {
    scenarioId: scenario.id,
    success: true,
    score: 100,
    errorsCount: 0,
    warningsCount: 0,
    durationMs: 0,
    tokensUsed: 0,
    totalCost: 0,
    toolCallsCount: 0,
    model: agentModel,
    checklistResults: results,
    logs: `NO POSITIVE TRIGGER (accepted decision): ${reason}`,
  };
}

/**
 * Initialize the sandbox directory (clean prior run, mkdir).
 *
 * The sandbox lives in an external root, NOT under the run dir (FR-ACCEPT-ISOLATION).
 * Kept under `runs/<ts>/<scenario>/run-N/`, every concurrent run shares a
 * grandparent, and one `ls ..` reaches the neighbours. Observed 2026-08-15: a
 * `reflect` run looking for its own session history walked up from its
 * bench-home, read run-1's and run-2's transcripts and git logs, and reported
 * their outcome in its findings as a recurring pattern of the session under
 * test. The run dir keeps `sandbox`/`bench-home` symlinks, so every post-run
 * analysis path is unchanged.
 */
async function setupSandbox(workDir: string): Promise<string> {
  const extInstDir = await externalSandboxRoot(workDir);
  const sandboxPath = join(extInstDir, "sandbox");
  for (const dir of [workDir, extInstDir]) {
    try {
      await Deno.remove(dir, { recursive: true });
    } catch (e) {
      if (!(e instanceof Deno.errors.NotFound)) throw e;
    }
  }
  await Deno.mkdir(sandboxPath, { recursive: true });
  // bench-home is derived as `dirname(sandboxPath)/bench-home` by
  // prepareAcpClaudeHome, so it follows the sandbox out of the run dir; the
  // link is created ahead of it and resolves once that dir exists.
  await linkIntoRunDir(workDir, extInstDir);
  console.log(`  Sandbox created: ${sandboxPath}`);
  return sandboxPath;
}

/** Init the trace logger (shared from caller, or a local one for tests). */
async function initTracer(
  scenario: BenchmarkScenario,
  options: RunnerOptions,
  runIndex: number,
): Promise<{ tracer: TraceLogger; traceId: string }> {
  const tracer = options.tracer ?? new TraceLogger(options.workDir);
  const traceId = options.tracer
    ? `${scenario.id}/run-${runIndex}`
    : scenario.id;

  await tracer.init(
    scenario.name,
    traceId,
    options.agentModel,
    scenario.targetAgentPath ?? "",
    scenario.userQuery,
    options.tracer ? scenario.id : undefined,
  );

  if (scenario.mocks && Object.keys(scenario.mocks).length > 0) {
    const toolsDesc = Object.keys(scenario.mocks).map((t) => `- **${t}**`).join(
      "\n",
    );
    await tracer.logTools(traceId, toolsDesc);
  }
  return { tracer, traceId };
}

/**
 * Build the sandbox's root instruction file from the rendered template plus
 * whatever instruction file the fixture shipped.
 *
 * A fixture that ships its own root `AGENTS.md` / `CLAUDE.md` is stating the
 * scenario's premise in the only place the agent reads without being told to:
 * a memex schema, a project's documentation rules, a set of planted
 * contradictions. Until 2026-08-21 step 1.8 wrote the rendered template over
 * that file and the premise vanished with no warning — the
 * `maintenance-instruction-coherence` sandbox held two byte-identical
 * 23300-byte files and none of the four contradictions the scenario asserts,
 * so the agent was scored for missing what had been deleted before it ran.
 *
 * The template still comes first: it carries the project rules several
 * scenarios measure directly. The fixture's own text follows it.
 */
export function composeSandboxAgentsMd(
  rendered: string,
  fixtureContent: string | null,
): string {
  const fixture = (fixtureContent ?? "").trim();
  if (!fixture) return rendered;
  if (rendered.includes(fixture)) return rendered;
  return `${rendered.trimEnd()}\n\n---\n\n${fixture}\n`;
}

/** Copy fixtures + framework + sandbox CLAUDE.md note + AGENTS.md template. */
async function prepareSandboxFiles(
  sandboxPath: string,
  scenario: BenchmarkScenario,
  adapter: AgentAdapter,
): Promise<void> {
  // 1.5 Copy fixtures if exist (fixturePath is set by task-bench.ts discovery)
  const fixturePath = scenario.fixturePath;
  if (fixturePath) {
    try {
      const fixtureStat = await Deno.stat(fixturePath);
      if (fixtureStat.isDirectory) {
        console.log(`  Copying fixtures from: ${fixturePath}`);
        await copyRecursive(fixturePath, sandboxPath);
      }
    } catch (e) {
      if (!(e instanceof Deno.errors.NotFound)) {
        console.warn(
          `  Warning: Failed to check fixtures at ${fixturePath}: ${e}`,
        );
      }
    }
  }

  // 1.6 Copy framework to IDE config dir (flatten pack structure)
  const frameworkPath = join(Deno.cwd(), "framework");
  const dotCursorPath = join(sandboxPath, adapter.configDir);

  // Determine which packs to include in sandbox (see resolveAllowedPacks).
  const allowedPacks = resolveAllowedPacks(scenario.pack, scenario.extraPacks);

  try {
    await Deno.mkdir(dotCursorPath, { recursive: true });
    console.log(
      `  Copying framework from ${frameworkPath} to ${dotCursorPath}`,
    );
    await copyFrameworkToIdeDir(
      frameworkPath,
      dotCursorPath,
      adapter.ide,
      allowedPacks,
      scenario.skill,
    );
  } catch (e) {
    // Missing framework dir = fatal precondition; the agent would otherwise
    // run against an empty install and produce a misleading "Unknown skill".
    if (e instanceof Deno.errors.NotFound) {
      throw new Error(
        `Acceptance test framework copy failed: framework path not found at ${frameworkPath}. ` +
          `Run scenarios from the repo root so framework/ is reachable.`,
      );
    }
    console.warn(`  Warning: Failed to copy framework: ${e}`);
  }

  // 1.7 Append sandbox permissions to .claude/CLAUDE.md so the agent
  //     doesn't treat the copied framework as a read-only production dir
  const claudeMdPath = join(dotCursorPath, "CLAUDE.md");
  try {
    const existing = await Deno.readTextFile(claudeMdPath);
    await Deno.writeTextFile(
      claudeMdPath,
      existing +
        "\n\n# Sandbox\n\nThis is a benchmark sandbox. You have full read/write access to all files and directories. Create, modify, and delete files freely without asking for permission.\n",
    );
  } catch (_) {
    // CLAUDE.md may not exist — that's fine
  }

  // 1.8 Generate unified AGENTS.md from template (agentsTemplateVars is required)
  const vars = scenario.agentsTemplateVars;
  const templateVars: Record<string, string> = {
    PROJECT_NAME: vars.PROJECT_NAME,
    PROJECT_RULES: vars.PROJECT_RULES ?? "",
    PROJECT_VISION: vars.PROJECT_VISION ?? "",
    TOOLING_STACK: vars.TOOLING_STACK ?? "",
    ARCHITECTURE: vars.ARCHITECTURE ?? "",
    KEY_DECISIONS: vars.KEY_DECISIONS ?? "",
    DEVELOPMENT_COMMANDS: vars.DEVELOPMENT_COMMANDS ?? "",
    COMMAND_SCRIPTS: vars.COMMAND_SCRIPTS ?? "",
  };
  // The fixture copy at step 1.5 may have placed its own instruction file at
  // the sandbox root. Read it back before writing, so its content survives
  // instead of being overwritten (see composeSandboxAgentsMd).
  let fixtureInstructions: string | null = null;
  for (const name of ["AGENTS.md", "CLAUDE.md"]) {
    try {
      fixtureInstructions = await Deno.readTextFile(join(sandboxPath, name));
      break;
    } catch (_) {
      // Not shipped by this fixture — try the next name.
    }
  }
  if (fixtureInstructions !== null) {
    console.log("  Fixture ships a root instruction file — merging it in");
  }
  const rootContent = composeSandboxAgentsMd(
    await renderAgentsMd(templateVars),
    fixtureInstructions,
  );
  await Deno.writeTextFile(join(sandboxPath, "AGENTS.md"), rootContent);

  // Root CLAUDE.md for Claude Code compatibility — a REAL FILE, not a symlink.
  //
  // Claude Code auto-loads CLAUDE.md from the session cwd; that is how project
  // rules reach the model without anyone reading a file. In sandboxes where it
  // was a symlink the rules never arrived: no transcript of a short scenario
  // contains a line from them, and the ones that do got it from the agent's own
  // Read call (2026-08-13, plan-trigger-pos-1 / review-trigger-pos-1 — both
  // performed their skill's workflow inline while the "prefer the right skill"
  // rule sat unread on disk). Writing the content makes the sandbox behave like
  // a real project checkout, which is the whole point of the sandbox.
  if (adapter.ide === "claude") {
    await Deno.writeTextFile(join(sandboxPath, "CLAUDE.md"), rootContent);
  }
}

/**
 * Wire up mocks (if any), commit the framework + fixture state to a fresh
 * git repo, then run the scenario's `setup()` for any additional state.
 * Returns the init commit hash for later diff. Also verifies the target
 * skill is mounted in the sandbox — catches copyFrameworkToIdeDir
 * regressions that would cause silent false-passes.
 */
async function initSandboxGit(
  sandboxPath: string,
  scenario: BenchmarkScenario,
  adapter: AgentAdapter,
): Promise<string> {
  // Mocks are intercepted in the ACP client (FR-ACCEPT.ACP), not via per-IDE
  // sandbox hooks — nothing to write here.
  if (scenario.mocks && Object.keys(scenario.mocks).length > 0) {
    console.log(
      `  ACP mock interceptor armed for: ${
        Object.keys(scenario.mocks).join(", ")
      }`,
    );
  }

  await runGit(sandboxPath, ["init"]);
  await runGit(sandboxPath, ["config", "user.email", "bench@localhost"]);
  await runGit(sandboxPath, ["config", "user.name", "Benchmark"]);
  await runGit(sandboxPath, ["add", "."]);
  await runGit(sandboxPath, ["commit", "--allow-empty", "-m", "init"]);

  const initHashOut = await runGit(sandboxPath, ["rev-parse", "HEAD"]);
  const initHash = new TextDecoder().decode(initHashOut.stdout).trim();

  await scenario.setup(sandboxPath);

  // Sanity check: verify target skill is actually mounted in sandbox.
  if (scenario.skill) {
    const skillMdPath = join(
      sandboxPath,
      adapter.configDir,
      "skills",
      scenario.skill,
      "SKILL.md",
    );
    try {
      await Deno.stat(skillMdPath);
    } catch {
      throw new Error(
        `Setup failure: skill "${scenario.skill}" not found in sandbox ` +
          `at ${skillMdPath}. Check that copyFrameworkToIdeDir copies ` +
          `the primitive correctly (skills/ AND commands/).`,
      );
    }
  }
  return initHash;
}

interface AgentRunOutcome {
  code: number;
  logs: string;
  durationMs: number;
  agent: AcpAgent;
}

/**
 * Spawn the agent (optionally with a UserEmulator) and run it under a global
 * scenario timeout. On timeout the agent is killed and exit code 124 is
 * returned with a synthetic log. Always resolves with an outcome — never
 * throws.
 */
/**
 * Trace for a run the global timeout killed.
 *
 * Keep what the agent actually did and append the marker. Replacing the trace
 * with the marker alone makes every timed-out run score "0 tool call(s)
 * observed", which reads as "the agent never started" and hides the real
 * cause — measured on `deep-research-trigger-pos-1`, where three timed-out
 * runs were diagnosed as a routing failure on exactly that evidence.
 */
export function composeTimeoutLogs(partial: string, message: string): string {
  const marker = `[GLOBAL TIMEOUT] ${message}`;
  return partial ? `${partial}\n${marker}` : marker;
}

/**
 * Detect a dead agent session — the CLI answered with an authentication error
 * instead of doing the task.
 *
 * This is not a behavioural result and must never be scored as one. On
 * 2026-08-20 an expired subscription session turned twelve trigger scenarios
 * into a uniform 0/3, negatives included, each run exiting 1 after ~12 s with
 * an empty trace. Read off the summary table that looks exactly like "the model
 * answered without reaching for the skill", and three scenarios were marked as
 * unreachable positive triggers on the strength of it.
 *
 * `toolCallCount` is what separates our dead session from a live one. Some
 * scenarios ask the agent to run another IDE's CLI, and that child reports its
 * own `OAuth session expired` through a tool result — a correct observation
 * about the sandbox, not a broken bench. Same day, same hour: this guard fired
 * three runs in a row on `delegate-to-ide-trigger-adj-1`, whose query asks for a
 * prompt to be run in Claude Code, and threw away a measurement that was
 * working. Our own failure leaves NO tool calls at all, because the agent never
 * got as far as its first one.
 */
export const HARNESS_FAULT_PATTERNS: readonly string[] = [
  "OAuth session expired",
  "Failed to authenticate",
  "Invalid API key",
  "Usage credits required",
];

/**
 * The same signal seen in a run that DID make tool calls.
 *
 * Here it cannot be trusted as ours — a scenario that drives another IDE's CLI
 * surfaces that child's billing or auth error the same way — so it warns
 * instead of aborting. `agents-rules-stop-analysis` lost a run to
 * "Usage credits required" mid-session on 2026-08-20 and was scored as an agent
 * that failed to report a blocker.
 */
export function detectHarnessFaultWarning(
  logs: string,
  toolCallCount: number,
): string | null {
  if (toolCallCount === 0) return null;
  const hit = HARNESS_FAULT_PATTERNS.find((p) => logs.includes(p));
  if (!hit) return null;
  return `Trace contains "${hit}" and the run made ${toolCallCount} tool ` +
    `call(s). If that came from THIS session rather than a CLI it drove, the ` +
    `result is a harness fault, not behaviour — check before trusting it.`;
}

export function detectAuthFailure(
  logs: string,
  toolCallCount: number,
): string | null {
  if (toolCallCount > 0) return null;
  const hit = HARNESS_FAULT_PATTERNS.find((p) => logs.includes(p));
  if (!hit) return null;
  return `Agent session is not authenticated (matched: "${hit}"). ` +
    `Nothing measured here is a behavioural result — the CLI never ran the ` +
    `task. Export the repo's OAuth token before the sweep ` +
    `(set -a; . ./.env; set +a) and run again.`;
}

/**
 * Should the run's exit code be scored as a checklist item?
 *
 * For a trigger scenario the whole verdict is the routing decision, and that
 * decision is already in the trace: the deterministic items read it directly.
 * A global timeout on top of it adds nothing — the agent picked its skill (or
 * did not) long before the clock ran out. Measured 2026-08-20 on
 * `ai-ide-runner-trigger-adj-1`: once the adjacent `deep-research` was actually
 * mounted, the agent deferred to it correctly in all three runs and then spent
 * 89–116 tool calls doing the research, hitting the cap every time. The routing
 * item passed 3/3 and the scenario still scored 0/3 on the exit code alone.
 *
 * Narrow on purpose. Only a global timeout (124) is forgiven, only for a
 * checklist that is nothing but skill-invocation items, and only when the agent
 * actually made tool calls — a negative scenario that scores "skill not
 * invoked" out of an empty trace is an infrastructure failure wearing a pass.
 */
/**
 * Is the injected exit-code item a blocker, or only a note?
 *
 * The global timeout is the harness's decision to stop the agent, not a verdict
 * on the work. When the trace shows the agent working, the checklist's own
 * items already decide whether what they ask for happened — a missing artefact
 * fails its own item, with or without this one. Keeping the exit code critical
 * on top of that makes every timed-out behavioural scenario red regardless of
 * evidence: `deep-research-plan` asks six questions about a plan the agent
 * produced in its first two minutes, then spent fifteen executing that plan and
 * was killed, and could not have passed however good the plan was.
 *
 * An empty trace is different and stays a blocker: nothing was measured, so a
 * pass there would be a pass on absence.
 */
export function exitCodeCheckIsCritical(
  code: number,
  toolCallCount: number,
): boolean {
  return !(code === 124 && toolCallCount > 0);
}

export function shouldInjectExitCodeCheck(
  checklist: readonly { id: string }[],
  code: number,
  toolCallCount: number,
): boolean {
  if (code === 0) return false;
  const routingOnly = checklist.length > 0 &&
    checklist.every((i) => DETERMINISTIC_SKILL_CHECK_IDS.has(i.id));
  return !(routingOnly && code === 124 && toolCallCount > 0);
}

async function runAgentWithTimeout(
  scenario: BenchmarkScenario,
  sandboxPath: string,
  options: RunnerOptions,
): Promise<AgentRunOutcome> {
  console.log("  Starting agent interaction...");
  const start = performance.now();
  const fullPrompt = scenario.userQuery;

  const userEmulator = scenario.interactive && scenario.userPersona
    ? new UserEmulator({
      persona: scenario.userPersona,
      config: options.judgeConfig, // Use judge config for simulated user
      llmClient: options.llmClient,
    })
    : null;

  // Adapter-specific sandbox preparation (e.g. isolated $HOME for Claude
  // to avoid `~/.claude/skills/` shadowing sandbox skills via the Skill
  // tool resolution path — FR-ACCEPT-ISOLATION).
  const adapterEnv = options.adapter.prepareWorkspace
    ? await options.adapter.prepareWorkspace(sandboxPath)
    : {};

  const agent = new AcpAgent({
    ide: options.adapter.ide as AcpIde,
    workspace: sandboxPath,
    model: options.agentModel,
    prompt: fullPrompt,
    maxSteps: scenario.maxSteps || 10,
    env: adapterEnv,
    mocks: scenario.mocks,
    name: scenario.skill ? `${scenario.skill}/${scenario.id}` : scenario.id,
  });

  // Global scenario timeout (default 15 min)
  const totalTimeout = scenario.totalTimeoutMs ?? 900_000;
  let agentResult: { code: number; logs: string };
  let globalTimeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    globalTimeoutId = setTimeout(
      () =>
        reject(new Error(`Global scenario timeout after ${totalTimeout}ms`)),
      totalTimeout,
    );
  });

  try {
    agentResult = await Promise.race([
      agent.run(userEmulator || undefined),
      timeoutPromise,
    ]);
  } catch (e) {
    agent.kill();
    const err = e as Error;
    console.warn(`  ${err.message}`);
    agentResult = {
      code: 124,
      logs: composeTimeoutLogs(agent.partialLogs, err.message),
    };
  } finally {
    if (globalTimeoutId !== undefined) clearTimeout(globalTimeoutId);
  }

  const durationMs = performance.now() - start;
  console.log(`  Agent finished with exit code ${agentResult.code}`);

  const authFailure = detectAuthFailure(
    agentResult.logs,
    agent.getToolCalls().length,
  );
  if (authFailure) {
    agent.kill();
    throw new Error(authFailure);
  }
  const faultWarning = detectHarnessFaultWarning(
    agentResult.logs,
    agent.getToolCalls().length,
  );
  if (faultWarning) console.warn(`  WARNING: ${faultWarning}`);

  // Warn on suspiciously short agent output — likely infrastructure issue
  // (skill not mounted, prompt rejected, sandbox misconfigured).
  if (agentResult.logs.length < 200 && agentResult.code === 0) {
    console.warn(
      `  WARNING: Agent output very short (${agentResult.logs.length} chars) with ` +
        `exit 0 — possible infrastructure issue (skill not found, ` +
        `prompt rejected, etc.). Inspect sandbox and agent logs.`,
    );
  }
  return { ...agentResult, durationMs, agent };
}

/** Pull session usage (tokens) from the adapter for the given agent. */
async function collectUsage(
  agent: AcpAgent,
  adapter: AgentAdapter,
): Promise<
  { tokensUsed: number; tokensDetails?: BenchmarkResult["tokensDetails"] }
> {
  const sessionId = agent.getSessionId();
  if (!sessionId) return { tokensUsed: 0 };
  const usage = await adapter.calculateUsage(sessionId);
  if (!usage) return { tokensUsed: 0 };
  const tokensDetails: BenchmarkResult["tokensDetails"] = {
    input: usage.tokens.input,
    output: usage.tokens.output,
    cacheRead: usage.tokens.cacheRead,
    cacheWrite: usage.tokens.cacheWrite,
  };
  console.log(
    `  Usage: ${usage.tokens.total} tokens (Input: ${tokensDetails.input}, Output: ${tokensDetails.output}, Cache Read: ${tokensDetails.cacheRead}, Cache Write: ${tokensDetails.cacheWrite})`,
  );
  return { tokensUsed: usage.tokens.total, tokensDetails };
}

/** Read all .md files under documents/tasks/, falling back to legacy task.md. */
async function readTaskFiles(sandboxPath: string): Promise<string> {
  let taskFilesContent = "";
  try {
    const tasksDir = join(sandboxPath, "documents", "tasks");
    for await (const entry of Deno.readDir(tasksDir)) {
      if (entry.isFile && entry.name.endsWith(".md")) {
        const content = await Deno.readTextFile(join(tasksDir, entry.name));
        taskFilesContent += `\n--- ${entry.name} ---\n${content}\n`;
      }
    }
    if (!taskFilesContent) taskFilesContent = "(no task files found)";
  } catch (_) {
    try {
      taskFilesContent = await Deno.readTextFile(
        join(sandboxPath, "documents", "task.md"),
      );
    } catch (_) {
      taskFilesContent = "(no task files found)";
    }
  }
  return taskFilesContent;
}

/**
 * Snapshot post-run sandbox state for the judge: git status/log/diff,
 * task files, generated text files. Truncates oversized blobs and returns
 * the formatted evidence string + the (possibly truncated) formatted logs.
 */
async function gatherJudgeEvidence(
  scenario: BenchmarkScenario,
  sandboxPath: string,
  initHash: string,
  rawLogs: string,
): Promise<
  { evidence: string; truncatedLogs: string; statusStr: string; logStr: string }
> {
  const statusOut = await runGit(sandboxPath, ["status"]);
  const statusStr = new TextDecoder().decode(statusOut.stdout);

  const logOut = await runGit(sandboxPath, ["log", "-5", "--stat"]);
  const logStr = new TextDecoder().decode(logOut.stdout);

  let diffStr = "";
  try {
    const diffOut = await runGit(sandboxPath, ["diff", `${initHash}..HEAD`]);
    diffStr = new TextDecoder().decode(diffOut.stdout);
  } catch (_) {
    diffStr = "(git diff failed)";
  }

  // The agent's own edits, which for any workflow that asks before committing
  // are never in the diff above. See evidence.ts for the failure this cost.
  let workingTreeDiffStr = "";
  try {
    const wtOut = await runGit(sandboxPath, ["diff", "HEAD"]);
    workingTreeDiffStr = new TextDecoder().decode(wtOut.stdout);
  } catch (_) {
    workingTreeDiffStr = "(git diff HEAD failed)";
  }
  if (workingTreeDiffStr.trim() === "") {
    workingTreeDiffStr = "(no uncommitted changes)";
  }

  const taskFilesContent = await readTaskFiles(sandboxPath);
  const generatedFiles = await collectGeneratedFiles(sandboxPath);

  // ACP transcripts are already human-readable — no NDJSON formatting needed.
  const formattedLogs = rawLogs;

  // Truncate large sections to stay within judge model context limits.
  // Keep start + end of logs (results are usually at the end).
  const maxLogsLen = 150_000;
  let truncatedLogs = formattedLogs;
  if (formattedLogs.length > maxLogsLen) {
    const half = Math.floor(maxLogsLen / 2);
    truncatedLogs = formattedLogs.slice(0, half) +
      "\n...[TRUNCATED " +
      ((formattedLogs.length - maxLogsLen) / 1024).toFixed(0) +
      "KB]...\n" +
      formattedLogs.slice(-half);
  }
  const maxFilesLen = 100_000;
  const truncatedFiles = generatedFiles.length > maxFilesLen
    ? generatedFiles.slice(0, maxFilesLen) + "\n...[TRUNCATED]..."
    : generatedFiles;

  const evidence = formatJudgeEvidence({
    expectedOutcome: scenario.sandboxState.expectedOutcome,
    gitStatus: statusStr,
    gitLog: logStr,
    committedDiff: diffStr,
    workingTreeDiff: workingTreeDiffStr,
    taskFiles: taskFilesContent,
    generatedFiles: truncatedFiles,
  });

  return { evidence, truncatedLogs, statusStr, logStr };
}

/**
 * Tally checklist results into errors/warnings/score. Critical items become
 * errors when failing; non-critical become warnings. Score is the percentage
 * of passing items over total (including the dynamic exit_code_zero entry).
 */
function scoreChecklist(
  checklistToJudge: BenchmarkScenario["checklist"],
  checklistResults: Record<string, { pass: boolean; reason: string }>,
): { score: number; errorsCount: number; warningsCount: number } {
  const totalItems = checklistToJudge.length;
  const passedItems = Object.values(checklistResults).filter((v) => v.pass)
    .length;
  const score = totalItems > 0 ? (passedItems / totalItems) * 100 : 0;

  let errorsCount = 0;
  let warningsCount = 0;
  for (const item of checklistToJudge) {
    const res = checklistResults[item.id];
    if (!res || !res.pass) {
      if (item.critical) errorsCount++;
      else warningsCount++;
    }
  }
  return { score, errorsCount, warningsCount };
}

interface JudgeOutcome {
  score: number;
  errorsCount: number;
  warningsCount: number;
  checklistResults: Record<string, { pass: boolean; reason: string }>;
}

/**
 * Run the LLM judge over the truncated logs + evidence, augment the checklist
 * with the dynamic `exit_code_zero` entry when the agent crashed, log the
 * evaluation to the tracer, and score the result.
 */
async function judgeAndScore(
  scenario: BenchmarkScenario,
  truncatedLogs: string,
  evidence: string,
  options: RunnerOptions,
  judge: typeof evaluateChecklist,
  code: number,
  tracer: TraceLogger,
  traceId: string,
  toolCalls: CapturedToolCall[],
): Promise<JudgeOutcome> {
  // Skill-invocation items (`skill_invoked` / `skill_not_invoked`) are decided
  // deterministically from the captured tool calls — the LLM judge could only
  // infer invocation from prose and was the main source of trigger-scenario
  // flakiness. Everything else still goes to the judge.
  const judgeChecklist = scenario.checklist.filter(
    (i) => !DETERMINISTIC_SKILL_CHECK_IDS.has(i.id),
  );
  console.log(
    `  Judging results...${
      judgeChecklist.length < scenario.checklist.length
        ? ` (${
          scenario.checklist.length - judgeChecklist.length
        } skill-invocation item(s) scored deterministically)`
        : ""
    }`,
  );
  const judgeOutput = judgeChecklist.length > 0
    ? await judge(
      scenario.userQuery,
      truncatedLogs,
      evidence,
      judgeChecklist,
      options.judgeConfig,
      options.workDir,
    )
    : { results: {}, messages: [], response: "(no judge-graded items)" };
  const checklistResults = { ...judgeOutput.results };

  // Deterministic skill-invocation verdicts from the trace.
  const detItems = scenario.checklist.filter((i) =>
    DETERMINISTIC_SKILL_CHECK_IDS.has(i.id)
  );
  if (detItems.length > 0) {
    const equivalents = scenario.equivalentSkills ?? [];
    const invoked = detectSkillInvocation(
      toolCalls,
      scenario.skill ?? "",
      equivalents,
    );
    const n = toolCalls.length;
    // Name the accepted alternatives in the verdict — a pass earned by a host
    // built-in must not read like a pass earned by the skill under test.
    const alt = equivalents.length > 0
      ? ` (or an accepted equivalent: ${equivalents.join(", ")})`
      : "";
    for (const item of detItems) {
      if (item.id === "skill_invoked") {
        checklistResults[item.id] = {
          pass: invoked,
          reason: invoked
            ? `Deterministic: skill "${scenario.skill}"${alt} invoked (Skill tool call found in trace).`
            : `Deterministic: no tool call invoking skill "${scenario.skill}"${alt} found in trace (${n} tool call(s) observed).`,
        };
      } else { // skill_not_invoked
        checklistResults[item.id] = {
          pass: !invoked,
          reason: !invoked
            ? `Deterministic: skill "${scenario.skill}"${alt} not invoked (${n} tool call(s) observed).`
            : `Deterministic: skill "${scenario.skill}"${alt} was invoked but should not have been.`,
        };
      }
    }
  }

  // Build full checklist including dynamic exit_code_zero if agent crashed
  const checklistToJudge = [...scenario.checklist];
  if (shouldInjectExitCodeCheck(scenario.checklist, code, toolCalls.length)) {
    checklistToJudge.push({
      id: "exit_code_zero",
      description: "Agent should exit successfully",
      critical: exitCodeCheckIsCritical(code, toolCalls.length),
    });
    checklistResults["exit_code_zero"] = {
      pass: false,
      reason: `Agent exited with non-zero code: ${code}`,
    };
  }

  await tracer.logEvaluation(traceId, checklistResults, checklistToJudge, {
    messages: judgeOutput.messages,
    response: judgeOutput.response,
  });

  const { score, errorsCount, warningsCount } = scoreChecklist(
    checklistToJudge,
    checklistResults,
  );
  return { score, errorsCount, warningsCount, checklistResults };
}

/**
 * Orchestrates a complete benchmark run for a single scenario:
 * sandbox setup → fixture copy → framework copy → agent execution →
 * evidence gathering (git status/log) → LLM judge evaluation → scoring.
 */
export async function runScenario(
  scenario: BenchmarkScenario,
  options: RunnerOptions,
): Promise<BenchmarkResult> {
  const judge = options.judgeClient || evaluateChecklist;
  const adapter = options.adapter;
  const runIndex = options.runIndex ?? 1;
  console.log(`\nRunning scenario: ${scenario.name} (${scenario.id})...`);

  if (scenario.noPositiveTrigger) {
    return buildNoPositiveTriggerResult(scenario, options.agentModel);
  }

  if (scenario.skip) {
    return buildSkippedResult(scenario, options.agentModel);
  }

  const sandboxPath = await setupSandbox(options.workDir);
  const { tracer, traceId } = await initTracer(scenario, options, runIndex);

  try {
    await prepareSandboxFiles(sandboxPath, scenario, adapter);
    const initHash = await initSandboxGit(sandboxPath, scenario, adapter);

    const { code, logs, durationMs, agent } = await runAgentWithTimeout(
      scenario,
      sandboxPath,
      options,
    );

    const { tokensUsed, tokensDetails } = await collectUsage(agent, adapter);
    await tracer.logExecutionSection();
    await tracer.logLLMInteraction(
      traceId,
      [{ role: "system", content: "Agent Output Log" }],
      logs,
      { step: 1, source: "agent", model: options.agentModel },
    );

    const { evidence, truncatedLogs, statusStr, logStr } =
      await gatherJudgeEvidence(
        scenario,
        sandboxPath,
        initHash,
        logs,
      );
    await tracer.logEvidence(traceId, statusStr, logStr);

    const { score, errorsCount, warningsCount, checklistResults } =
      await judgeAndScore(
        scenario,
        truncatedLogs,
        evidence,
        options,
        judge,
        code,
        tracer,
        traceId,
        agent.getToolCalls(),
      );

    const result: BenchmarkResult & { evidence: string } = {
      scenarioId: scenario.id,
      success: errorsCount === 0,
      score,
      errorsCount,
      warningsCount,
      durationMs,
      tokensUsed,
      tokensDetails,
      totalCost: 0,
      toolCallsCount: 0,
      checklistResults,
      logs,
      model: options.agentModel,
      evidence,
    };

    await tracer.logSummary(traceId, {
      ...result,
      errors: result.errorsCount,
      warnings: result.warningsCount,
    });

    return result;
  } finally {
    // Keep sandbox for inspection
    console.log(`  Sandbox available at: ${sandboxPath}\n`);
  }
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
 * Recursively collects text file contents from the sandbox for judge inspection.
 * Skips hidden dirs (.claude, .git), binary files, and oversized files.
 */
async function collectGeneratedFiles(
  sandboxPath: string,
  maxFileSize = 30_000,
): Promise<string> {
  const parts: string[] = [];
  const skipDirs = new Set([".claude", ".git", "node_modules"]);
  const textExtensions = new Set([
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

  async function walk(dir: string, rel: string) {
    for await (const entry of Deno.readDir(dir)) {
      const entryRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory) {
        if (skipDirs.has(entry.name)) continue;
        await walk(join(dir, entry.name), entryRel);
      } else if (entry.isFile) {
        const ext = entry.name.includes(".")
          ? "." + entry.name.split(".").pop()!.toLowerCase()
          : "";
        const isDockerfile = entry.name.toLowerCase() === "dockerfile";
        if (!textExtensions.has(ext) && !isDockerfile) continue;
        try {
          const content = await Deno.readTextFile(join(dir, entry.name));
          parts.push(renderFileForEvidence(entryRel, content, maxFileSize));
        } catch (_) {
          // skip unreadable files
        }
      }
    }
  }

  await walk(sandboxPath, "");
  return parts.join("\n");
}
