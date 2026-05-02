import { join } from "@std/path";
import type { BenchmarkResult, BenchmarkScenario } from "./types.ts";
import type { cliChatCompletion, ModelConfig } from "./llm.ts";
import { evaluateChecklist } from "./judge.ts";
import { TraceLogger } from "./trace.ts";
import { copyFrameworkToIdeDir, copyRecursive, runGit } from "./utils.ts";
import { formatAgentLogs } from "./format_logs.ts";
import { SpawnedAgent } from "./spawned_agent.ts";
import { UserEmulator } from "./user_emulator.ts";
import type { AgentAdapter } from "./adapters/types.ts";
import { renderAgentsMd } from "./template.ts";

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

/** Initialize the sandbox directory (clean prior run, mkdir). */
async function setupSandbox(workDir: string): Promise<string> {
  const sandboxPath = join(workDir, "sandbox");
  try {
    await Deno.remove(workDir, { recursive: true });
  } catch (e) {
    if (!(e instanceof Deno.errors.NotFound)) throw e;
  }
  await Deno.mkdir(sandboxPath, { recursive: true });
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
    scenario.targetAgentPath || "",
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

  // Determine which packs to include in sandbox
  const scenarioPack = scenario.pack;
  let allowedPacks: string[] | undefined;
  if (scenarioPack) {
    allowedPacks = scenarioPack === "core" ? ["core"] : ["core", scenarioPack];
  }

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
    );
  } catch (e) {
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
  const rootContent = await renderAgentsMd(templateVars);
  await Deno.writeTextFile(join(sandboxPath, "AGENTS.md"), rootContent);

  // Create root CLAUDE.md symlink for Claude Code compatibility
  if (adapter.ide === "claude") {
    const agentsPath = join(sandboxPath, "AGENTS.md");
    const claudePath = join(sandboxPath, "CLAUDE.md");
    try {
      await Deno.stat(agentsPath);
      await Deno.symlink("AGENTS.md", claudePath);
    } catch (_) { /* AGENTS.md doesn't exist — skip */ }
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
  if (scenario.mocks && Object.keys(scenario.mocks).length > 0) {
    await adapter.setupMocks(sandboxPath, scenario.mocks);
    console.log(
      `  Created ${adapter.ide} hooks for: ${
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
  agent: SpawnedAgent;
}

/**
 * Spawn the agent (optionally with a UserEmulator) and run it under a global
 * scenario timeout. On timeout the agent is killed and exit code 124 is
 * returned with a synthetic log. Always resolves with an outcome — never
 * throws.
 */
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
  // tool resolution path — FR-BENCH-ISOLATION).
  const adapterEnv = options.adapter.prepareWorkspace
    ? await options.adapter.prepareWorkspace(sandboxPath)
    : {};

  const agent = new SpawnedAgent({
    workspace: sandboxPath,
    model: options.agentModel,
    prompt: fullPrompt,
    maxSteps: scenario.maxSteps || 10,
    stepTimeout: scenario.stepTimeoutMs || 300000,
    adapter: options.adapter,
    env: adapterEnv,
    name: scenario.skill ? `${scenario.skill}/${scenario.id}` : scenario.id,
  });

  // Global scenario timeout (default 15 min)
  const totalTimeout = scenario.totalTimeoutMs ?? 900_000;
  let agentResult: { code: number; logs: string };
  let globalTimeoutId: number | undefined;
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
    agentResult = { code: 124, logs: `[GLOBAL TIMEOUT] ${err.message}` };
  } finally {
    if (globalTimeoutId !== undefined) clearTimeout(globalTimeoutId);
  }

  const durationMs = performance.now() - start;
  console.log(`  Agent finished with exit code ${agentResult.code}`);

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
  agent: SpawnedAgent,
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
  outputFormat: AgentAdapter["outputFormat"],
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

  const taskFilesContent = await readTaskFiles(sandboxPath);
  const generatedFiles = await collectGeneratedFiles(sandboxPath);

  const formattedLogs = formatAgentLogs(rawLogs, outputFormat);

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

  const evidence = `
--- EXPECTED OUTCOME ---
${scenario.sandboxState.expectedOutcome}

--- FINAL GIT STATUS ---
${statusStr}

--- GIT LOG ---
${logStr}

--- GIT DIFF (init..HEAD) ---
${
    diffStr.length > 50_000
      ? diffStr.slice(0, 50_000) + "\n...[DIFF TRUNCATED]..."
      : diffStr
  }

--- DOCUMENTS/TASKS ---
${taskFilesContent}

--- GENERATED FILES ---
${truncatedFiles}
    `;

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
): Promise<JudgeOutcome> {
  console.log("  Judging results...");
  const judgeOutput = await judge(
    scenario.userQuery,
    truncatedLogs,
    evidence,
    scenario.checklist,
    options.judgeConfig,
    options.workDir,
  );
  const checklistResults = judgeOutput.results;

  // Build full checklist including dynamic exit_code_zero if agent crashed
  const checklistToJudge = [...scenario.checklist];
  if (code !== 0) {
    checklistToJudge.push({
      id: "exit_code_zero",
      description: "Agent should exit successfully",
      critical: true,
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
        adapter.outputFormat,
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
 * Recursively collects text file contents from the sandbox for judge inspection.
 * Skips hidden dirs (.claude, .git), binary files, and oversized files.
 */
async function collectGeneratedFiles(
  sandboxPath: string,
  maxFileSize = 10_000,
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
          const stat = await Deno.stat(join(dir, entry.name));
          if (stat.size > maxFileSize) {
            parts.push(`--- ${entryRel} (${stat.size} bytes, truncated) ---`);
            const content = await Deno.readTextFile(join(dir, entry.name));
            parts.push(content.slice(0, maxFileSize));
          } else {
            parts.push(`--- ${entryRel} ---`);
            parts.push(await Deno.readTextFile(join(dir, entry.name)));
          }
        } catch (_) {
          // skip unreadable files
        }
      }
    }
  }

  await walk(sandboxPath, "");
  return parts.join("\n");
}
