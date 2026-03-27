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

  // Handle skipped scenarios
  if (scenario.skip) {
    console.log(`  SKIPPED: ${scenario.skip}`);
    const skippedResults: Record<string, { pass: boolean; reason: string }> =
      {};
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
      model: options.agentModel,
      checklistResults: skippedResults,
      logs: `Skipped: ${scenario.skip}`,
    };
  }

  // 1. Setup Sandbox
  // workDir is already runDir/<scenario-id>/run-N (from task-bench.ts)
  // or a plain temp dir (from tests)
  const sandboxPath = join(options.workDir, "sandbox");

  // Clean previous run
  try {
    await Deno.remove(options.workDir, { recursive: true });
  } catch (e) {
    if (!(e instanceof Deno.errors.NotFound)) {
      throw e;
    }
  }
  await Deno.mkdir(sandboxPath, { recursive: true });

  console.log(`  Sandbox created: ${sandboxPath}`);

  // Use shared tracer from options, or create a local one for standalone/test usage
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

  // Log tools if any
  if (scenario.mocks && Object.keys(scenario.mocks).length > 0) {
    const toolsDesc = scenario.mocks
      ? Object.keys(scenario.mocks).map((t) => `- **${t}**`).join(
        "\n",
      )
      : "";
    await tracer.logTools(traceId, toolsDesc);
  }

  let result: (BenchmarkResult & { evidence: string }) | undefined;

  try {
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
      allowedPacks = scenarioPack === "core"
        ? ["core"]
        : ["core", scenarioPack];
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

    // 2. Load AGENTS.md: scenario override → sandbox (from fixture) → minimal default
    let agentsMarkdown = scenario.agentsMarkdown;
    if (!agentsMarkdown) {
      try {
        agentsMarkdown = await Deno.readTextFile(
          join(sandboxPath, "AGENTS.md"),
        );
      } catch {
        // Not found in sandbox — use minimal default
      }
    }
    if (!agentsMarkdown) {
      console.log(
        `  Warning: AGENTS.md not found for scenario ${scenario.id}. Using minimal default.`,
      );
      agentsMarkdown =
        "# Agent Reference\n\nThis is a minimal AGENTS.md for initialization benchmarks.";
    }
    await Deno.writeTextFile(join(sandboxPath, "AGENTS.md"), agentsMarkdown);

    // Setup mocks using IDE-specific hooks mechanism (before git init so hooks are committed)
    if (scenario.mocks && Object.keys(scenario.mocks).length > 0) {
      await adapter.setupMocks(sandboxPath, scenario.mocks);
      console.log(
        `  Created ${adapter.ide} hooks for: ${
          Object.keys(scenario.mocks).join(", ")
        }`,
      );
    }

    // Initialize an isolated git repo with all framework/fixture/mock files committed.
    // This runs BEFORE setup() so scenarios can create specific git state on top.
    await runGit(sandboxPath, ["init"]);
    await runGit(sandboxPath, ["config", "user.email", "bench@localhost"]);
    await runGit(sandboxPath, ["config", "user.name", "Benchmark"]);
    await runGit(sandboxPath, ["add", "."]);
    await runGit(sandboxPath, [
      "commit",
      "--allow-empty",
      "-m",
      "init",
    ]);

    // Save init commit hash for later diff
    const initHashOut = await runGit(sandboxPath, ["rev-parse", "HEAD"]);
    const initHash = new TextDecoder().decode(initHashOut.stdout).trim();

    // Scenario-specific setup: creates commits, modified/untracked files on top of "init"
    await scenario.setup(sandboxPath);

    // 3. Run Agent (High-Level Lifecycle)
    console.log("  Starting agent interaction...");
    const start = performance.now();

    // Prepare Environment
    const fullPrompt = scenario.userQuery;

    const userEmulator = scenario.interactive && scenario.userPersona
      ? new UserEmulator({
        persona: scenario.userPersona,
        config: options.judgeConfig, // Use judge config for simulated user
        llmClient: options.llmClient,
      })
      : null;

    const agent = new SpawnedAgent({
      workspace: sandboxPath,
      model: options.agentModel,
      prompt: fullPrompt,
      maxSteps: scenario.maxSteps || 10,
      stepTimeout: scenario.stepTimeoutMs || 300000,
      adapter,
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

    const { code, logs } = agentResult;
    const durationMs = performance.now() - start;

    console.log(`  Agent finished with exit code ${code}`);

    // 4. Calculate Usage (Tokens)
    let tokensUsed = 0;
    let tokensDetails: BenchmarkResult["tokensDetails"] = undefined;
    const sessionId = agent.getSessionId();
    if (sessionId) {
      const usage = await adapter.calculateUsage(sessionId);
      if (usage) {
        tokensUsed = usage.tokens.total;
        tokensDetails = {
          input: usage.tokens.input,
          output: usage.tokens.output,
          cacheRead: usage.tokens.cacheRead,
          cacheWrite: usage.tokens.cacheWrite,
        };
        console.log(
          `  Usage: ${tokensUsed} tokens (Input: ${tokensDetails.input}, Output: ${tokensDetails.output}, Cache Read: ${tokensDetails.cacheRead}, Cache Write: ${tokensDetails.cacheWrite})`,
        );
      }
    }

    await tracer.logExecutionSection();
    await tracer.logLLMInteraction(
      traceId,
      [{ role: "system", content: "Agent Output Log" }],
      logs,
      { step: 1, source: "agent", model: options.agentModel },
    );

    // 5. Gather Evidence for Judge
    const statusOut = await runGit(sandboxPath, ["status"]);
    const statusStr = new TextDecoder().decode(statusOut.stdout);

    const logOut = await runGit(sandboxPath, ["log", "-5", "--stat"]);
    const logStr = new TextDecoder().decode(logOut.stdout);

    // Full diff from init to current state (covers all agent commits + working changes)
    let diffStr = "";
    try {
      const diffOut = await runGit(sandboxPath, [
        "diff",
        `${initHash}..HEAD`,
      ]);
      diffStr = new TextDecoder().decode(diffOut.stdout);
    } catch (_) {
      diffStr = "(git diff failed)";
    }

    // Read whiteboards directory content if it exists
    let whiteboardContent = "";
    try {
      const whiteboardsDir = join(sandboxPath, "documents", "whiteboards");
      for await (const entry of Deno.readDir(whiteboardsDir)) {
        if (entry.isFile && entry.name.endsWith(".md")) {
          const content = await Deno.readTextFile(
            join(whiteboardsDir, entry.name),
          );
          whiteboardContent += `\n--- ${entry.name} ---\n${content}\n`;
        }
      }
      if (!whiteboardContent) whiteboardContent = "(no whiteboard files found)";
    } catch (_) {
      // Fallback: try legacy whiteboard.md
      try {
        whiteboardContent = await Deno.readTextFile(
          join(sandboxPath, "documents", "whiteboard.md"),
        );
      } catch (_) {
        whiteboardContent = "(no whiteboards found)";
      }
    }

    // Collect generated file contents (non-fixture files for judge inspection)
    const generatedFiles = await collectGeneratedFiles(sandboxPath);

    await tracer.logEvidence(traceId, statusStr, logStr);

    // Convert raw NDJSON logs to readable conversation for judge
    const formattedLogs = formatAgentLogs(logs, adapter.outputFormat);

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

--- DOCUMENTS/WHITEBOARDS ---
${whiteboardContent}

--- GENERATED FILES ---
${truncatedFiles}
    `;

    // 6. Judge
    console.log("  Judging results...");
    const judgeOutput = await judge(
      scenario.userQuery,
      truncatedLogs, // The conversation log (truncated to fit judge context)
      evidence, // The file/system state changes (also contains truncated logs)
      scenario.checklist,
      options.judgeConfig,
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

    // 7. Calculate Score and Metrics
    // Use checklistToJudge.length (includes dynamic exit_code_zero) for accurate denominator
    const totalItems = checklistToJudge.length;
    const passedItems = Object.values(checklistResults).filter((v) =>
      v.pass
    ).length;
    const score = totalItems > 0 ? (passedItems / totalItems) * 100 : 0;

    let errorsCount = 0;
    let warningsCount = 0;

    for (const item of checklistToJudge) {
      const res = checklistResults[item.id];
      if (!res || !res.pass) {
        if (item.critical) {
          errorsCount++;
        } else {
          warningsCount++;
        }
      }
    }

    const success = errorsCount === 0;

    result = {
      scenarioId: scenario.id,
      success,
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
    } as BenchmarkResult & { evidence: string };

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
