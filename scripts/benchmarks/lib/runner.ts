import { join } from "@std/path";
import { BenchmarkResult, BenchmarkScenario } from "./types.ts";
import { chatCompletion, ModelConfig } from "./llm.ts";
import { evaluateChecklist } from "./judge.ts";
import { TraceLogger } from "./trace.ts";
import { copyRecursive } from "./utils.ts";
import { generateSystemMessage } from "./system-prompt-generator.ts";
import { SpawnedAgent } from "./spawned_agent.ts";
import { SimulatedUser } from "./simulated_user.ts";

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
  const agentPath = scenario.targetAgentPath.startsWith("/")
    ? scenario.targetAgentPath
    : join(Deno.cwd(), scenario.targetAgentPath);

  await tracer.init(
    scenario.name,
    scenario.id,
    options.agentModel,
    scenario.targetAgentPath,
    scenario.userQuery,
  );

  // Log tools if any
  if (scenario.mocks && Object.keys(scenario.mocks).length > 0) {
    const toolsDesc = scenario.mocks ? Object.keys(scenario.mocks).map((t) => `- **${t}**`).join(
      "\n",
    ) : "";
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

    const skillContent = await Deno.readTextFile(agentPath);

    const systemMessage = await generateSystemMessage({
      scenario,
      sandboxPath,
      skillContent,
      agentsMarkdown: agentsMarkdown || "",
      userQuery: scenario.userQuery,
    });

    await tracer.logSystemPrompt(systemMessage);

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

      console.log(`  Created Cursor hooks for: ${Object.keys(scenario.mocks).join(", ")}`);
    }

    // Prepare Environment
    const fullPrompt = `${systemMessage}\n\nUser Query: ${scenario.userQuery}`;

    const simulatedUser = scenario.userPersona
      ? new SimulatedUser({
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
    });

    const { code, logs } = await agent.run(async (allLogs) => {
      if (!simulatedUser) {
        console.log("  No simulated user and agent needs input. Stopping.");
        return null;
      }
      const response = await simulatedUser.getResponse(allLogs);
      if (response) {
        console.log(`  Simulated User response: "${response}"`);
      }
      return response;
    });

    const durationMs = performance.now() - start;

    console.log(`  Agent finished with exit code ${code}`);
    await tracer.logExecutionSection();
    await tracer.logLLMInteraction(
      [{ role: "system", content: "Agent Output Log" }],
      logs,
      { step: 1, source: "agent", model: options.agentModel }
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
      tokensUsed: 0, 
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
