import { join } from "@std/path";
import { parse } from "@std/flags";
import {
  GitCommitterAtomicDocsBench,
  GitCommitterAtomicHunkBench,
  GitCommitterAtomicRefactorBench,
  GitCommitterBasicBench,
  GitCommitterCheckBench,
  GitCommitterCheckFailBench,
  GitCommitterDepsBench,
  GitCommitterSyncDocsBench,
} from "./benchmarks/scenarios/git-committer.bench.ts";
import {
  InterviewerArchitectureChoiceBench,
  InterviewerBugReportBench,
  InterviewerClarifyFeatureBench,
} from "./benchmarks/scenarios/interviewer.bench.ts";
import {
  BenchmarkResult,
  BenchmarkScenario,
  LLMMessage,
} from "./benchmarks/lib/types.ts";
import { chatCompletion } from "./benchmarks/lib/llm.ts";
import { evaluateChecklist } from "./benchmarks/lib/judge.ts";
import { TraceLogger } from "./benchmarks/lib/trace.ts";

const SCENARIOS: BenchmarkScenario[] = [
  GitCommitterBasicBench,
  GitCommitterAtomicRefactorBench,
  GitCommitterAtomicDocsBench,
  GitCommitterCheckBench,
  GitCommitterSyncDocsBench,
  GitCommitterAtomicHunkBench,
  GitCommitterDepsBench,
  GitCommitterCheckFailBench,
  InterviewerClarifyFeatureBench,
  InterviewerBugReportBench,
  InterviewerArchitectureChoiceBench,
];

const MODEL = "google/gemini-2.0-flash-001";

async function runScenario(
  scenario: BenchmarkScenario,
): Promise<BenchmarkResult> {
  console.log(`\nRunning scenario: ${scenario.name} (${scenario.id})...`);

  // 1. Setup Sandbox
  const workDir = join(Deno.cwd(), "scripts/benchmarks/work");
  const scenarioDir = join(workDir, scenario.id);
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
  const agentPath = join(Deno.cwd(), scenario.targetAgentPath);

  await tracer.init(
    scenario.name,
    scenario.id,
    MODEL,
    scenario.targetAgentPath,
    scenario.userQuery,
  );

  let result: (BenchmarkResult & { evidence: string }) | undefined;

  try {
    await scenario.setup(sandboxPath);

    // 2. Load Agent Prompt
    const agentContent = await Deno.readTextFile(agentPath);

    // 3. Run Agent (Simulation)
    // We simulate the agent loop:
    // User -> LLM (with Agent System Prompt) -> Tool Calls (Simulated) -> Output

    const messages: LLMMessage[] = [
      { role: "system", content: agentContent },
      { role: "user", content: scenario.userQuery },
    ];

    const start = performance.now();
    let tokensUsed = 0;

    // For this v0.1 benchmark, we will do a SINGLE turn simulation.
    // Real agents are multi-turn, but for "git commit" it's often one-shot or two-shot.
    // We will ask the LLM to generate the shell commands it WOULD run.
    // To make this work with the text-based agent prompt, we append instructions to output commands in a specific block.

    messages[0].content += `\n\nIMPORTANT FOR BENCHMARK:
You are running in a benchmark mode.
DO NOT use any tools directly.
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

    console.log(`  Invoking Agent LLM (${MODEL})...`);
    const response = await chatCompletion(
      messages,
      MODEL,
      0,
    );
    tokensUsed += response.usage?.total_tokens || 0;

    const agentOutput = response.content;
    const durationMs = performance.now() - start;

    await tracer.logLLMInteraction(messages, agentOutput);

    console.log("  Agent finished. Analyzing output...");

    // 4. Simulate Execution (Naive)
    // We look for bash blocks and execute them in the sandbox to create side effects for the Judge
    const bashRegex = /```bash\n([\s\S]*?)\n```/g;
    let match;
    let executedCommands = "";
    let toolCallsCount = 0;

    await tracer.logExecutionSection();

    while ((match = bashRegex.exec(agentOutput)) !== null) {
      const script = match[1];
      const commands = script.split("\n").filter((line) =>
        line.trim() !== "" && !line.trim().startsWith("#")
      );

      for (const cmdStr of commands) {
        toolCallsCount++;
        executedCommands += `> ${cmdStr}\n`;

        // Better command parsing
        const args: string[] = [];
        let current = "";
        let inQuote = false;

        for (let i = 0; i < cmdStr.length; i++) {
          const char = cmdStr[i];
          if (char === '"') {
            inQuote = !inQuote;
            continue;
          }

          if (char === " " && !inQuote) {
            if (current.length > 0) {
              args.push(current);
              current = "";
            }
          } else {
            current += char;
          }
        }
        if (current.length > 0) {
          args.push(current);
        }

        // Handle env vars (e.g. GIT_PAGER=cat git ...)
        let cmdName = args[0];
        let cmdArgs = args.slice(1);
        const env: Record<string, string> = {};

        while (cmdName.includes("=")) {
          const [key, val] = cmdName.split("=");
          env[key] = val;
          if (cmdArgs.length > 0) {
            cmdName = cmdArgs[0];
            cmdArgs = cmdArgs.slice(1);
          } else {
            break; // Should not happen for valid commands
          }
        }

        try {
          const command = new Deno.Command(cmdName, {
            args: cmdArgs,
            cwd: sandboxPath,
            stdout: "piped",
            stderr: "piped",
            env, // Pass env vars
          });
          const output = await command.output();
          const stdout = new TextDecoder().decode(output.stdout);
          const stderr = new TextDecoder().decode(output.stderr);

          executedCommands += `STDOUT: ${stdout}\n`;
          if (stderr) executedCommands += `STDERR: ${stderr}\n`;

          await tracer.logCommand(cmdStr, output.code, stdout, stderr);
        } catch (e) {
          executedCommands += `ERROR: ${e}\n`;
          await tracer.logCommand(cmdStr, -1, "", String(e));
        }
      }
    }

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
    const checklistResults = await evaluateChecklist(
      scenario.userQuery,
      agentOutput, // The conversation log
      evidence, // The file/system state changes
      scenario.checklist,
    );

    await tracer.logEvaluation(checklistResults, scenario.checklist);

    // 7. Calculate Score
    const totalItems = scenario.checklist.length;
    const passedItems = Object.values(checklistResults).filter((v) =>
      v.pass
    ).length;
    const score = totalItems > 0 ? (passedItems / totalItems) * 100 : 0;
    const success = scenario.checklist.every((item) =>
      !item.critical || checklistResults[item.id]?.pass
    );

    result = {
      scenarioId: scenario.id,
      success,
      score,
      durationMs,
      tokensUsed,
      toolCallsCount,
      checklistResults,
      logs: agentOutput,
      model: MODEL,
      evidence, // Attach evidence to result for debugging
    } as BenchmarkResult & { evidence: string };

    await tracer.logSummary(result);

    return result;
  } finally {
    // Keep sandbox for inspection
    console.log(`  Sandbox available at: ${sandboxPath}\n`);
  }
}

async function main() {
  console.log("DEBUG: Running new version with reasoning output");
  const args = parse(Deno.args);
  const filter = args._[0];

  const scenariosToRun = filter
    ? SCENARIOS.filter((s) => s.id.includes(String(filter)))
    : SCENARIOS;

  console.log(`Found ${scenariosToRun.length} scenarios.`);

  const results: BenchmarkResult[] = [];

  for (const scenario of scenariosToRun) {
    try {
      const result = await runScenario(scenario);
      results.push(result);

      console.log(
        `  Result: ${result.success ? "PASSED" : "FAILED"} (Score: ${
          result.score.toFixed(1)
        }%)`,
      );
      console.log("  Checklist:");
      for (const [id, res] of Object.entries(result.checklistResults)) {
        const item = scenario.checklist.find((i) => i.id === id);
        const isCritical = item?.critical ?? true;

        let color = "\x1b[32m"; // Green
        let mark = "x";
        let label = "";

        if (!res.pass) {
          if (isCritical) {
            color = "\x1b[31m"; // Red
            mark = " ";
            label = " (ERROR)";
          } else {
            color = "\x1b[33m"; // Yellow
            mark = "!";
            label = " (WARNING)";
          }
        }

        console.log(
          `    ${color}[${mark}] ${id}${label}: ${res.reason}\x1b[0m`,
        );
      }

      if (!result.success) {
        console.log("\n  --- DEBUG INFO (FAILED) ---");
        console.log("  Agent Output:");
        console.log(result.logs);
        console.log("\n  Evidence:");
        console.log(result.evidence);
        console.log("  ---------------------------\n");
      }
    } catch (e) {
      console.error(`  Error running scenario ${scenario.id}:`, e);
    }
  }

  console.log("\n--- SUMMARY ---");
  console.log(
    `${"ID".padEnd(30)} | ${"Model".padEnd(30)} | ${
      "Status".padEnd(
        15,
      )
    } | ${"Score".padEnd(6)} | ${"Time (ms)".padEnd(10)} | ${"Tokens"}`,
  );
  console.log("-".repeat(110));

  for (const r of results) {
    let status = r.success ? "PASSED" : "FAILED";
    let color = r.success ? "\x1b[32m" : "\x1b[31m"; // Green : Red

    if (r.success && r.score < 100) {
      status = "WARNING"; // Passed with non-critical failures
      color = "\x1b[33m"; // Yellow
    }

    const statusStr = `${color}${status.padEnd(15)}\x1b[0m`;

    console.log(
      `${r.scenarioId.padEnd(30)} | ${r.model.padEnd(30)} | ${statusStr} | ${
        r.score
          .toFixed(1)
          .padEnd(6)
      } | ${r.durationMs.toFixed(0).padEnd(10)} | ${r.tokensUsed}`,
    );
  }

  const hasFailures = results.some((r) => !r.success);
  if (hasFailures) {
    console.log("\n\x1b[31mSome tests failed.\x1b[0m");
    Deno.exit(1);
  }
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    Deno.exit(1);
  }
}
