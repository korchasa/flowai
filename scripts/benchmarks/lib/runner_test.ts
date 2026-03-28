/**
 * Integration tests for Runner.
 * These tests use the default IDE from benchmarks/config.json.
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "@std/path";
import { load } from "@std/dotenv";
import { runScenario } from "./runner.ts";
import type { BenchmarkScenario } from "./types.ts";
import { createTempDir } from "./utils.ts";
import type { evaluateChecklist } from "./judge.ts";
import { getIdeConfig, loadConfig } from "./llm.ts";
import { createAdapter } from "./adapters/mod.ts";

// Load environment variables from .env file
await load({ export: true });

const config = await loadConfig();
const DEFAULT_IDE = config.default_ides[0];
const ideConfig = getIdeConfig(config, DEFAULT_IDE);
const adapter = createAdapter(DEFAULT_IDE);

const AGENT_MODEL = ideConfig.default_agent_model;
const JUDGE_CONFIG = { ...ideConfig.judge };

Deno.test("Runner - Basic Scenario Execution", async () => {
  const tempDir = await createTempDir("runner");
  const agentPath = join(tempDir, "agent.md");
  await Deno.writeTextFile(
    agentPath,
    "You are a test agent. Do what user asks.",
  );

  const scenario: BenchmarkScenario = {
    id: "test-scenario",
    name: "Test Scenario",
    targetAgentPath: agentPath,
    sandboxState: {
      commits: [],
      modified: ["test.txt"],
      expectedOutcome: "Agent modifies test.txt content",
    },
    setup: async (sandbox) => {
      await Deno.writeTextFile(join(sandbox, "test.txt"), "initial");
    },
    userQuery: "Change test.txt content to 'modified'",
    agentsTemplateVars: { PROJECT_NAME: "TestProject" },
    checklist: [
      { id: "check1", description: "File was modified", critical: true },
    ],
  };

  const judgeClient = () => {
    return Promise.resolve({
      results: {
        check1: { pass: true, reason: "Test passed" },
      },
      messages: [],
      response: "Judge response",
    });
  };

  const scenarioWorkDir = join(tempDir, "test-scenario", "run-1");
  try {
    const result = await runScenario(scenario, {
      agentModel: AGENT_MODEL,
      judgeConfig: JUDGE_CONFIG,
      workDir: scenarioWorkDir,
      judgeClient: judgeClient as unknown as typeof evaluateChecklist,
      adapter,
    });

    // Basic assertions - scenario completed
    assertEquals(typeof result.success, "boolean");
    assertEquals(result.scenarioId, "test-scenario");
    assertEquals(typeof result.durationMs, "number");
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("Runner - Fixture Copying", async () => {
  const tempDir = await createTempDir("runner");
  const fixtureDir = join(tempDir, "fixtures");
  await Deno.mkdir(join(fixtureDir, "subdir"), { recursive: true });
  await Deno.writeTextFile(join(fixtureDir, "file1.txt"), "content1");
  await Deno.writeTextFile(join(fixtureDir, "subdir/file2.txt"), "content2");

  const agentPath = join(tempDir, "agent.md");
  await Deno.writeTextFile(agentPath, "agent");

  const scenario: BenchmarkScenario = {
    id: "flowai-test-fixture",
    name: "Fixture Test",
    targetAgentPath: agentPath,
    fixturePath: fixtureDir,
    sandboxState: {
      commits: [],
      expectedOutcome: "Fixture files are accessible in sandbox",
    },
    setup: async () => {},
    userQuery: "Say hello",
    agentsTemplateVars: { PROJECT_NAME: "FixtureTest" },
    checklist: [],
  };

  const judgeClient = () => {
    return Promise.resolve({
      results: {},
      messages: [],
      response: "ok",
    });
  };

  const scenarioWorkDir = join(tempDir, "flowai-test-fixture", "run-1");
  try {
    await runScenario(scenario, {
      agentModel: AGENT_MODEL,
      judgeConfig: JUDGE_CONFIG,
      workDir: scenarioWorkDir,
      judgeClient: judgeClient as unknown as typeof evaluateChecklist,
      adapter,
    });

    const sandboxPath = join(scenarioWorkDir, "sandbox");
    assertEquals(
      await Deno.readTextFile(join(sandboxPath, "file1.txt")),
      "content1",
    );
    assertEquals(
      await Deno.readTextFile(join(sandboxPath, "subdir/file2.txt")),
      "content2",
    );
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("Runner - Score counts failed items correctly", async () => {
  const tempDir = await createTempDir("runner");
  const agentPath = join(tempDir, "agent.md");
  await Deno.writeTextFile(agentPath, "agent");

  const scenario: BenchmarkScenario = {
    id: "test-score",
    name: "Score Calculation Test",
    targetAgentPath: agentPath,
    sandboxState: {
      commits: [],
      expectedOutcome: "Agent completes task",
    },
    setup: async () => {},
    userQuery: "Say hello",
    agentsTemplateVars: { PROJECT_NAME: "ScoreTest" },
    checklist: [
      { id: "check1", description: "Check 1", critical: true },
      { id: "check2", description: "Check 2", critical: false },
      { id: "check3", description: "Check 3", critical: true },
    ],
  };

  // Judge fails check1 (critical) and check2 (non-critical), passes check3
  const judgeClient = () => {
    return Promise.resolve({
      results: {
        check1: { pass: false, reason: "failed" },
        check2: { pass: false, reason: "failed" },
        check3: { pass: true, reason: "ok" },
      },
      messages: [],
      response: "ok",
    });
  };

  const scenarioWorkDir = join(tempDir, "test-score", "run-1");
  try {
    const result = await runScenario(scenario, {
      agentModel: AGENT_MODEL,
      judgeConfig: JUDGE_CONFIG,
      workDir: scenarioWorkDir,
      judgeClient: judgeClient as unknown as typeof evaluateChecklist,
      adapter,
    });

    // When agent exits non-zero, runner injects exit_code_zero (critical) →
    // 1 passed / 4 total = 25%, errorsCount=2 (check1 + exit_code_zero).
    // When agent exits 0: 1 passed / 3 total = 33%, errorsCount=1.
    if (result.errorsCount === 2) {
      // Agent crashed → exit_code_zero added
      assertEquals(Math.round(result.score), 25);
      assertEquals(result.errorsCount, 2); // check1 + exit_code_zero
      assertEquals(result.warningsCount, 1); // check2
    } else {
      // Agent exited cleanly
      assertEquals(Math.round(result.score), 33);
      assertEquals(result.errorsCount, 1); // check1 critical
      assertEquals(result.warningsCount, 1); // check2 non-critical
    }
    assertEquals(result.success, false);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("Runner - Evidence includes expectedOutcome and git diff", async () => {
  const tempDir = await createTempDir("runner");
  const agentPath = join(tempDir, "agent.md");
  await Deno.writeTextFile(agentPath, "agent");

  const scenario: BenchmarkScenario = {
    id: "test-evidence",
    name: "Evidence Test",
    targetAgentPath: agentPath,
    sandboxState: {
      commits: [],
      expectedOutcome: "Test expected outcome for judge",
    },
    setup: async () => {},
    userQuery: "Say hello",
    agentsTemplateVars: { PROJECT_NAME: "EvidenceTest" },
    checklist: [
      { id: "check1", description: "Check", critical: true },
    ],
  };

  let capturedEvidence = "";
  const judgeClient = (
    _q: string,
    _logs: string,
    evidence: string,
  ) => {
    capturedEvidence = evidence;
    return Promise.resolve({
      results: { check1: { pass: true, reason: "ok" } },
      messages: [],
      response: "ok",
    });
  };

  const scenarioWorkDir = join(tempDir, "test-evidence", "run-1");
  try {
    await runScenario(scenario, {
      agentModel: AGENT_MODEL,
      judgeConfig: JUDGE_CONFIG,
      workDir: scenarioWorkDir,
      judgeClient: judgeClient as unknown as typeof evaluateChecklist,
      adapter,
    });

    assertStringIncludes(capturedEvidence, "--- EXPECTED OUTCOME ---");
    assertStringIncludes(
      capturedEvidence,
      "Test expected outcome for judge",
    );
    assertStringIncludes(capturedEvidence, "--- GIT DIFF (init..HEAD) ---");
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});
