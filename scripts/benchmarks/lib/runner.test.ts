/**
 * Integration tests for Runner.
 * These tests use the default IDE from benchmarks/config.json.
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "@std/path";
import { load } from "@std/dotenv";
import { runScenario } from "./runner.ts";
import { BenchmarkScenario } from "./types.ts";
import { createTempDir } from "./utils.ts";
import { evaluateChecklist } from "./judge.ts";
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
    setup: async (sandbox) => {
      await Deno.writeTextFile(join(sandbox, "test.txt"), "initial");
    },
    userQuery: "Change test.txt content to 'modified'",
    agentsMarkdown: "# Test Agent\nYou can modify files.",
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
    id: "flow-test-fixture",
    name: "Fixture Test",
    targetAgentPath: agentPath,
    fixturePath: fixtureDir,
    setup: async () => {},
    userQuery: "Say hello",
    checklist: [],
  };

  const judgeClient = () => {
    return Promise.resolve({
      results: {},
      messages: [],
      response: "ok",
    });
  };

  const scenarioWorkDir = join(tempDir, "flow-test-fixture", "run-1");
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

Deno.test("Runner - AGENTS.md Fallback", async () => {
  const tempDir = await createTempDir("runner");
  const agentPath = join(tempDir, "agent.md");
  await Deno.writeTextFile(agentPath, "agent");

  const scenario: BenchmarkScenario = {
    id: "test-no-agents-md",
    name: "No AGENTS.md Test",
    targetAgentPath: agentPath,
    setup: async () => {},
    userQuery: "Say hello",
    checklist: [],
    // agentsMarkdown is undefined
  };

  const judgeClient = () => {
    return Promise.resolve({
      results: {},
      messages: [],
      response: "ok",
    });
  };

  const scenarioWorkDir = join(tempDir, "test-no-agents-md", "run-1");
  try {
    await runScenario(scenario, {
      agentModel: AGENT_MODEL,
      judgeConfig: JUDGE_CONFIG,
      workDir: scenarioWorkDir,
      judgeClient: judgeClient as unknown as typeof evaluateChecklist,
      adapter,
    });

    const sandboxPath = join(scenarioWorkDir, "sandbox");
    const agentsContent = await Deno.readTextFile(
      join(sandboxPath, "AGENTS.md"),
    );
    assertStringIncludes(agentsContent, "Agent Reference");
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});
