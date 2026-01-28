import { join } from "@std/path";
import { BenchmarkResult, BenchmarkScenario, LLMMessage } from "./types.ts";
import { chatCompletion, ModelConfig } from "./llm.ts";
import { evaluateChecklist } from "./judge.ts";
import { TraceLogger } from "./trace.ts";
import { copyRecursive } from "./utils.ts";
import { generateSystemMessage } from "./system-prompt-generator.ts";

export interface RunnerOptions {
  agentConfig: ModelConfig;
  judgeConfig: ModelConfig;
  workDir: string;
  llmClient?: typeof chatCompletion;
  judgeClient?: typeof evaluateChecklist;
}

export async function runScenario(
  scenario: BenchmarkScenario,
  options: RunnerOptions,
): Promise<BenchmarkResult> {
  const llm = options.llmClient || chatCompletion;
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
  const agentPath = scenario.targetAgentPath.startsWith("/")
    ? scenario.targetAgentPath
    : join(Deno.cwd(), scenario.targetAgentPath);

  await tracer.init(
    scenario.name,
    scenario.id,
    options.agentConfig.model,
    scenario.targetAgentPath,
    scenario.userQuery,
  );

  // Log tools if any
  if (scenario.mocks && Object.keys(scenario.mocks).length > 0) {
    const toolsDesc = Object.keys(scenario.mocks).map((t) => `- **${t}**`).join(
      "\n",
    );
    await tracer.logTools(toolsDesc);
  }

  let result: (BenchmarkResult & { evidence: string }) | undefined;

  try {
    // 1.5 Copy fixtures if exist
    const scenarioPathParts = scenario.id.split("-");
    let fixturePath = scenario.fixturePath;

    if (!fixturePath && scenarioPathParts[0] === "af") {
      const skill = scenarioPathParts[1];
      const id = scenarioPathParts.slice(2).join("-");
      // Try with full id first, then fallback to parts if needed
      fixturePath = join(
        Deno.cwd(),
        "scripts/benchmarks/scenarios",
        `af-${skill}`,
        id || scenarioPathParts.slice(2).join("-"),
        "fixture",
      );

      // Special case for af-plan-db which is in af-plan/db-feature
      if (scenario.id === "af-plan-db") {
        fixturePath = join(
          Deno.cwd(),
          "scripts/benchmarks/scenarios/af-plan/db-feature/fixture",
        );
      }
    }

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
            // Still not found
          }
        }
      }
    }

    if (!agentsMarkdown) {
      throw new Error(
        `AGENTS.md is mandatory for scenario ${scenario.id}. Please provide it in agentsMarkdown or in the fixture directory.`,
      );
    }

    if (agentsMarkdown) {
      await Deno.writeTextFile(join(sandboxPath, "AGENTS.md"), agentsMarkdown);
    }

    await scenario.setup(sandboxPath);

    const skillContent = await Deno.readTextFile(agentPath);

    const systemMessage = await generateSystemMessage({
      scenario,
      sandboxPath,
      skillContent,
      agentsMarkdown: agentsMarkdown || "",
      userQuery: scenario.userQuery,
    });

    await tracer.logSystemPrompt(systemMessage);

    // 3. Run Agent (Simulation)
    const messages: LLMMessage[] = [
      { role: "system", content: systemMessage },
    ];

    messages[0].content += `\n\nIMPORTANT FOR BENCHMARK:
You are running in a benchmark mode.
DO NOT use any tools directly.
SKIP the 'todo_write' step. DO NOT output 'todo_write' commands.
Instead, output the shell commands you WANT to run inside a SINGLE markdown code block with the 'bash' language tag.
Example:
\`\`\`bash
git add .
git commit -m "feat: my feature"
\`\`\`
Ensure ALL commands are inside this block.
Write ONE command per line. Do NOT use '&&'.
DO NOT use interactive commands like 'git add -p' or 'git add -i'. Use 'git add <file>' instead.
`;

    const start = performance.now();
    let tokensUsed = 0;
    let totalCost = 0;
    let toolCallsCount = 0;
    let executedCommands = "";
    let fullLog = "";

    // Setup mocks
    const mocksDir = join(scenarioDir, "mocks");
    const mockEnv: Record<string, string> = {};

    if (scenario.mocks && Object.keys(scenario.mocks).length > 0) {
      await Deno.mkdir(mocksDir, { recursive: true });
      for (const [tool, script] of Object.entries(scenario.mocks)) {
        const mockPath = join(mocksDir, tool);
        // Add shebang if missing
        const content = script.startsWith("#!")
          ? script
          : `#!/bin/sh\n${script}`;
        await Deno.writeTextFile(mockPath, content);
        await Deno.chmod(mockPath, 0o755);
      }
      // Prepend to PATH
      const currentPath = Deno.env.get("PATH") || "";
      mockEnv["PATH"] = `${mocksDir}:${currentPath}`;
    }

    await tracer.logExecutionSection();

    const MAX_STEPS = scenario.maxSteps || 10;
    let step = 0;
    let userReplyIndex = 0;
    let maxStepsReached = false;

    while (step < MAX_STEPS) {
      step++;
      console.log(`  Step ${step}/${MAX_STEPS}...`);

      const stepSignal = scenario.stepTimeoutMs
        ? AbortSignal.timeout(scenario.stepTimeoutMs)
        : undefined;

      try {
        const response = await llm(
          messages,
          options.agentConfig,
          undefined,
          stepSignal,
        );
        tokensUsed += response.usage?.total_tokens || 0;
        totalCost += response.usage?.cost || 0;
        const agentOutput = response.content;
        fullLog += `\n\n--- Step ${step} ---\nAgent: ${agentOutput}`;

        await tracer.logLLMInteraction(messages, agentOutput, {
          step,
          source: "agent",
          model: options.agentConfig.model,
        });
        messages.push({ role: "assistant", content: agentOutput });

        // Parse commands
        const bashRegex = /```bash\n([\s\S]*?)\n```/g;
        let match;
        let stepCommands = "";
        let foundCommands = false;

        while ((match = bashRegex.exec(agentOutput)) !== null) {
          foundCommands = true;
          const script = match[1];
          // Execute the entire block as a single script
          // This supports heredocs, loops, and multi-line commands correctly
          toolCallsCount++;
          executedCommands += `> [Script Block]\n${script}\n`;
          stepCommands += `> [Script Block]\n${script}\n`;

          try {
            const scriptPath = join(sandboxPath, `step_${step}_script.sh`);
            await Deno.writeTextFile(scriptPath, script);
            await Deno.chmod(scriptPath, 0o755);

            const command = new Deno.Command("sh", {
              args: [scriptPath],
              cwd: sandboxPath,
              stdout: "piped",
              stderr: "piped",
              env: mockEnv,
              signal: stepSignal,
            });
            const output = await command.output();
            const stdout = new TextDecoder().decode(output.stdout);
            const stderr = new TextDecoder().decode(output.stderr);

            executedCommands += `STDOUT: ${stdout}\n`;
            stepCommands += `STDOUT: ${stdout}\n`;
            if (stderr) {
              executedCommands += `STDERR: ${stderr}\n`;
              stepCommands += `STDERR: ${stderr}\n`;
            }

            // Cleanup the script file immediately after execution
            try {
              await Deno.remove(scriptPath);
            } catch (e) {
              console.warn(
                `  Warning: Failed to cleanup script at ${scriptPath}: ${e}`,
              );
            }

            await tracer.logCommand(
              "script_block",
              output.code,
              stdout,
              stderr,
              { step, script },
            );
          } catch (e) {
            const errorMsg = e instanceof Error && e.name === "AbortError"
              ? "Step timeout exceeded during command execution"
              : String(e);
            executedCommands += `ERROR: ${errorMsg}\n`;
            stepCommands += `ERROR: ${errorMsg}\n`;
            await tracer.logCommand("script_block", -1, "", errorMsg, { step });
            if (e instanceof Error && e.name === "AbortError") break;
          }
          if (stepSignal?.aborted) break;
        }

        if (!foundCommands) {
          if (
            scenario.userReplies &&
            userReplyIndex < scenario.userReplies.length
          ) {
            const reply = scenario.userReplies[userReplyIndex];
            console.log(`  Sending user reply: "${reply}"`);
            messages.push({
              role: "user",
              content: reply,
            });
            userReplyIndex++;
            continue;
          }

          console.log("  No commands found. Agent finished.");
          break;
        }

        if (step === MAX_STEPS) {
          console.log("  MAX_STEPS reached.");
          maxStepsReached = true;
        }

        // Feed back output
        messages.push({
          role: "user",
          content: `Command Output:\n${stepCommands}`,
        });
      } catch (e) {
        const errorMsg = e instanceof Error && e.name === "AbortError"
          ? "Step timeout exceeded"
          : String(e);
        console.log(`  Error: ${errorMsg}`);
        fullLog += `\n\n--- Step ${step} ERROR ---\n${errorMsg}`;
        break;
      }
    }

    const durationMs = performance.now() - start;
    console.log("  Agent finished. Analyzing output...");

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

    await tracer.logEvidence(statusStr, logStr);

    const evidence = `
--- EXECUTED COMMANDS ---
${executedCommands}

--- FINAL GIT STATUS ---
${statusStr}

--- LAST COMMIT ---
${logStr}
    `;

    // 6. Judge
    console.log("  Judging results...");
    const judgeOutput = await judge(
      scenario.userQuery,
      fullLog, // The conversation log
      evidence, // The file/system state changes
      scenario.checklist,
      options.judgeConfig,
    );
    const checklistResults = judgeOutput.results;
    if (maxStepsReached) {
      checklistResults["max_steps_reached"] = {
        pass: false,
        reason: `Scenario reached MAX_STEPS (${MAX_STEPS}) without finishing.`,
      };
    }

    const checklistToJudge = [...scenario.checklist];
    if (maxStepsReached) {
      checklistToJudge.push({
        id: "max_steps_reached",
        description: "Scenario should finish within MAX_STEPS",
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
      totalCost,
      toolCallsCount,
      checklistResults,
      logs: fullLog,
      model: options.agentConfig.model,
      evidence, // Attach evidence to result for debugging
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
