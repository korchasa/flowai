import { dirname, fromFileUrl, join } from "@std/path";
import { BenchmarkResult, BenchmarkScenario } from "./types.ts";
import { chatCompletion, ModelConfig } from "./llm.ts";
import { evaluateChecklist } from "./judge.ts";
import { TraceLogger } from "./trace.ts";
import { copyRecursive } from "./utils.ts";
import { SpawnedAgent } from "./spawned_agent.ts";
import { UserEmulator } from "./user_emulator.ts";
import { calculateSessionUsage } from "./usage.ts";

export interface RunnerOptions {
  agentModel: string;
  judgeConfig: ModelConfig;
  workDir: string;
  llmClient?: typeof chatCompletion;
  judgeClient?: typeof evaluateChecklist;
}

export async function runScenario(
  scenario: BenchmarkScenario,
  options: RunnerOptions,
): Promise<BenchmarkResult> {
  const judge = options.judgeClient || evaluateChecklist;
  console.log(`\nRunning scenario: ${scenario.name} (${scenario.id})...`);

  // 1. Setup Sandbox
  const scenarioDir = join(options.workDir, scenario.id);
  const sandboxPath = join(scenarioDir, "sandbox");

  // Clean previous run
  try {
    await Deno.remove(scenarioDir, { recursive: true });
  } catch (e) {
    if (!(e instanceof Deno.errors.NotFound)) {
      throw e;
    }
  }
  await Deno.mkdir(sandboxPath, { recursive: true });

  console.log(`  Sandbox created: ${sandboxPath}`);

  const tracer = new TraceLogger(scenarioDir);

  await tracer.init(
    scenario.name,
    scenario.id,
    options.agentModel,
    scenario.targetAgentPath || "",
    scenario.userQuery,
  );

  // Log tools if any
  if (scenario.mocks && Object.keys(scenario.mocks).length > 0) {
    const toolsDesc = scenario.mocks
      ? Object.keys(scenario.mocks).map((t) => `- **${t}**`).join(
        "\n",
      )
      : "";
    await tracer.logTools(toolsDesc);
  }

  let result: (BenchmarkResult & { evidence: string }) | undefined;

  try {
    // 1.5 Copy fixtures if exist
    let fixturePath = scenario.fixturePath;

    if (!fixturePath) {
      // Try to find fixture relative to the scenario's mod.ts
      // This assumes the scenario is an instance of a class defined in a mod.ts
      try {
        // @ts-ignore: Accessing internal property to find the file path
        const stack = new Error().stack;
        const match = stack?.match(/at\s+(?:new\s+)?.*\((.*mod\.ts):/);
        if (match && match[1]) {
          const modPath = match[1].startsWith("file://")
            ? fromFileUrl(match[1])
            : match[1];
          const candidate = join(dirname(modPath), "fixture");
          const stat = await Deno.stat(candidate);
          if (stat.isDirectory) {
            fixturePath = candidate;
          }
        }
      } catch (_) {
        // Fallback to old heuristic if dynamic detection fails
      }
    }

    if (fixturePath) {
      try {
        const fixtureStat = await Deno.stat(fixturePath);
        if (fixtureStat.isDirectory) {
          console.log(`  Copying fixtures from: ${fixturePath}`);
          await copyRecursive(fixturePath, sandboxPath);

          // Rename AGENTS.md.orig to AGENTS.md if it exists
          try {
            await Deno.rename(
              join(sandboxPath, "AGENTS.md.orig"),
              join(sandboxPath, "AGENTS.md"),
            );
          } catch (e) {
            if (!(e instanceof Deno.errors.NotFound)) {
              throw e;
            }
          }
        }
      } catch (e) {
        if (!(e instanceof Deno.errors.NotFound)) {
          console.warn(
            `  Warning: Failed to check fixtures at ${fixturePath}: ${e}`,
          );
        }
      }
    }

    // 1.6 Copy catalog to .cursor
    const catalogPath = join(Deno.cwd(), "catalog");
    const dotCursorPath = join(sandboxPath, ".cursor");

    try {
      await Deno.mkdir(dotCursorPath, { recursive: true });
      console.log(`  Copying catalog from ${catalogPath} to ${dotCursorPath}`);
      await copyRecursive(catalogPath, dotCursorPath, [
        "benchmarks",
        "runs",
        "tmp",
      ]);
    } catch (e) {
      console.warn(`  Warning: Failed to copy catalog: ${e}`);
    }

    // 2. Load Agent Prompt and AGENTS.md
    let agentsMarkdown = scenario.agentsMarkdown;
    if (!agentsMarkdown) {
      const agentsPath = join(sandboxPath, "AGENTS.md");
      try {
        agentsMarkdown = await Deno.readTextFile(agentsPath);
      } catch (e) {
        if (!(e instanceof Deno.errors.NotFound)) {
          throw e;
        }
        // If not in sandbox after fixture copy, try to find it in the fixture source
        if (fixturePath) {
          try {
            agentsMarkdown = await Deno.readTextFile(
              join(fixturePath, "AGENTS.md"),
            );
          } catch (_) {
            try {
              agentsMarkdown = await Deno.readTextFile(
                join(fixturePath, "AGENTS.md.orig"),
              );
            } catch (__) {
              // Still not found
            }
          }
        }
      }
    }

    // If still no agentsMarkdown, use a minimal default instead of throwing
    if (!agentsMarkdown) {
      console.log(
        `  Warning: AGENTS.md not found for scenario ${scenario.id}. Using minimal default.`,
      );
      agentsMarkdown =
        "# Agent Reference\n\nThis is a minimal AGENTS.md for initialization benchmarks.";
    }

    if (agentsMarkdown) {
      await Deno.writeTextFile(join(sandboxPath, "AGENTS.md"), agentsMarkdown);
    }

    await scenario.setup(sandboxPath);

    // 3. Run Agent (High-Level Lifecycle)
    console.log("  Starting agent interaction...");
    const start = performance.now();

    // Setup mocks using Cursor Hooks mechanism
    if (scenario.mocks && Object.keys(scenario.mocks).length > 0) {
      const hooksDir = join(sandboxPath, ".cursor", "hooks");
      await Deno.mkdir(hooksDir, { recursive: true });

      const hookDefinitions: Array<{ command: string; matcher: string }> = [];

      for (const [tool, mockOutput] of Object.entries(scenario.mocks)) {
        const hookScriptPath = join(hooksDir, `mock-${tool}.sh`);

        // Create hook script that returns deny + agent_message with mock output
        const hookScript = `#!/bin/bash
# Read stdin (JSON with command details)
read -r input

# Return mock response - deny execution and inject mock output
cat <<'MOCK_EOF'
{
  "permission": "deny",
  "agent_message": ${JSON.stringify(mockOutput)}
}
MOCK_EOF
`;
        await Deno.writeTextFile(hookScriptPath, hookScript);
        await Deno.chmod(hookScriptPath, 0o755);

        hookDefinitions.push({
          command: `.cursor/hooks/mock-${tool}.sh`,
          matcher: tool,
        });
      }

      // Create hooks.json
      const hooksConfig = {
        version: 1,
        hooks: {
          beforeShellExecution: hookDefinitions,
        },
      };

      await Deno.writeTextFile(
        join(sandboxPath, ".cursor", "hooks.json"),
        JSON.stringify(hooksConfig, null, 2),
      );

      console.log(
        `  Created Cursor hooks for: ${Object.keys(scenario.mocks).join(", ")}`,
      );
    }

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
      stepTimeout: 60000, // 1 minute timeout per step
    });

    const { code, logs } = await agent.run(userEmulator || undefined);

    const durationMs = performance.now() - start;

    console.log(`  Agent finished with exit code ${code}`);

    // 4. Calculate Usage (Tokens)
    let tokensUsed = 0;
    let tokensDetails: BenchmarkResult["tokensDetails"] = undefined;
    const sessionId = agent.getSessionId();
    if (sessionId) {
      const usage = await calculateSessionUsage(sessionId);
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
      [{ role: "system", content: "Agent Output Log" }],
      logs,
      { step: 1, source: "agent", model: options.agentModel },
    );

    // 5. Gather Evidence for Judge
    // Get git status/diff to show what happened
    const gitStatus = new Deno.Command("git", {
      args: ["status"],
      cwd: sandboxPath,
    });
    const statusOut = await gitStatus.output();

    const gitLog = new Deno.Command("git", {
      args: ["log", "-5", "--stat"],
      cwd: sandboxPath,
    });
    const logOut = await gitLog.output();

    const statusStr = new TextDecoder().decode(statusOut.stdout);
    const logStr = new TextDecoder().decode(logOut.stdout);

    // Read whiteboard.md content if it exists
    let whiteboardContent = "";
    try {
      whiteboardContent = await Deno.readTextFile(
        join(sandboxPath, "documents", "whiteboard.md"),
      );
    } catch (_) {
      whiteboardContent = "(file not found)";
    }

    await tracer.logEvidence(statusStr, logStr);

    const evidence = `
--- AGENT LOGS ---
${logs}

--- RAW PTY LOGS ---
${logs}

--- FINAL GIT STATUS ---
${statusStr}

--- LAST COMMIT ---
${logStr}

--- DOCUMENTS/WHITEBOARD.MD ---
${whiteboardContent}
    `;

    // 6. Judge
    console.log("  Judging results...");
    const judgeOutput = await judge(
      scenario.userQuery,
      logs, // The conversation log (stdout of agent)
      evidence, // The file/system state changes
      scenario.checklist,
      options.judgeConfig,
    );
    const checklistResults = judgeOutput.results;

    if (code !== 0) {
      checklistResults["exit_code_zero"] = {
        pass: false,
        reason: `Agent exited with non-zero code: ${code}`,
      };
    }

    const checklistToJudge = [...scenario.checklist];
    if (code !== 0) {
      checklistToJudge.push({
        id: "exit_code_zero",
        description: "Agent should exit successfully",
        critical: true,
      });
    }

    await tracer.logEvaluation(checklistResults, checklistToJudge, {
      messages: judgeOutput.messages,
      response: judgeOutput.response,
    });

    // 7. Calculate Score and Metrics
    const totalItems = scenario.checklist.length;
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

    await tracer.logSummary({
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
