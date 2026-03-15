/**
 * Integration tests for Runner + SpawnedAgent.
 *
 * These tests use the default IDE from benchmarks/config.json.
 * They require the corresponding agent CLI binary in PATH
 * and valid authentication.
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "@std/path";
import { load } from "@std/dotenv";
import { SpawnedAgent } from "./spawned_agent.ts";
import { runScenario } from "./runner.ts";
import type { BenchmarkScenario } from "./types.ts";
import { createTempDir } from "./utils.ts";
import { getIdeConfig, loadConfig } from "./llm.ts";
import { createAdapter } from "./adapters/mod.ts";

// Load environment variables from .env file
await load({ export: true });

// Load config and create adapter from default IDE (first key in config)
const config = await loadConfig();
const DEFAULT_IDE = config.default_ides[0];
const ideConfig = getIdeConfig(config, DEFAULT_IDE);
const adapter = createAdapter(DEFAULT_IDE);

const TEST_MODEL = ideConfig.default_agent_model;
const JUDGE_CONFIG = { ...ideConfig.judge };

// ============================================================================
// SpawnedAgent Integration Tests
// ============================================================================

Deno.test({
  name: "Integration: SpawnedAgent - Simple Query",
  async fn() {
    const tempDir = await createTempDir("integ");

    // Create minimal workspace
    await Deno.writeTextFile(
      join(tempDir, "AGENTS.md"),
      "# Test Agent\nYou are a helpful assistant.",
    );

    const agent = new SpawnedAgent({
      workspace: tempDir,
      model: TEST_MODEL,
      prompt: "Say 'Hello World' and nothing else.",
      maxSteps: 1,
      adapter,
    });

    try {
      const result = await agent.run();

      // Agent should complete successfully
      assertEquals(result.code, 0);

      // Should contain some response
      assertStringIncludes(result.logs, "Hello");
    } finally {
      await agent.kill();
      await Deno.remove(tempDir, { recursive: true });
    }
  },
});

// ============================================================================
// Runner + SpawnedAgent Integration Tests
// ============================================================================

Deno.test({
  name: "Integration: Runner - Full Scenario Execution",
  async fn() {
    const workDir = join(Deno.cwd(), "tmp", "integration-traces");
    await Deno.mkdir(workDir, { recursive: true });

    const scenario: BenchmarkScenario = {
      id: "integration-test-basic",
      name: "Integration Test - Basic",
      setup: async (_sandbox) => {
        // No setup needed for simple keyword test
      },
      userQuery: "Say the word 'BANANA' and nothing else.",
      agentsMarkdown: "# Test Agent\nYou are a helpful assistant.",
      checklist: [
        {
          id: "keyword_present",
          description: "Agent said 'BANANA'",
          critical: true,
        },
      ],
      maxSteps: 1,
    };

    const scenarioWorkDir = join(workDir, scenario.id, "run-1");

    try {
      const result = await runScenario(scenario, {
        agentModel: TEST_MODEL,
        judgeConfig: JUDGE_CONFIG,
        workDir: scenarioWorkDir,
        adapter,
      });

      console.log(
        `  Trace available at: ${join(scenarioWorkDir, "trace.html")}`,
      );

      // Check that scenario completed
      assertEquals(typeof result.success, "boolean");
      assertEquals(result.scenarioId, "integration-test-basic");

      // Verify keyword was present in logs
      assertStringIncludes(result.logs.toUpperCase(), "BANANA");
    } finally {
      // Cleanup handled by test runner if needed
    }
  },
});

Deno.test({
  name: "Integration: Runner - Interactive User Emulation",
  async fn() {
    const tempDir = await createTempDir("integ-interactive");

    const scenario: BenchmarkScenario = {
      id: "integration-test-interactive",
      name: "Integration Test - Interactive",
      setup: async (sandbox) => {
        const gitInit = new Deno.Command("git", {
          args: ["init"],
          cwd: sandbox,
        });
        await gitInit.output();
      },
      userQuery: "Ask me a question about my favorite color.",
      userPersona:
        "You are a user whose favorite color is blue. If asked about your favorite color (in any language, e.g., 'цвет'), answer 'Blue'. If asked about something else, respond strictly with <NO_RESPONSE>.",
      interactive: true,
      agentsMarkdown:
        "# Test Agent\nYou are a helpful assistant. Always ask the user about their favorite color before proceeding. As soon as he says it, repeat his answer verbatim and stop.",
      checklist: [
        {
          id: "interaction_occurred",
          description: "Agent asked a question and user emulator responded",
          critical: true,
        },
        {
          id: "correct_response",
          description: "User emulator responded with 'Blue'",
          critical: true,
        },
      ],
      maxSteps: 5,
    };

    const workDir = join(Deno.cwd(), "tmp", "integration-traces");
    await Deno.mkdir(workDir, { recursive: true });
    const interactiveWorkDir = join(workDir, scenario.id, "run-1");

    try {
      const result = await runScenario(scenario, {
        agentModel: TEST_MODEL,
        judgeConfig: JUDGE_CONFIG,
        workDir: interactiveWorkDir,
        adapter,
      });

      console.log(
        `  Trace available at: ${join(interactiveWorkDir, "trace.html")}`,
      );

      // Verification of multi-step interaction
      const logsLower = result.logs.toLowerCase();
      const hasBlue = logsLower.includes("blue") ||
        logsLower.includes("синий") || logsLower.includes("цвет");
      assertEquals(
        hasBlue,
        true,
        `Logs should contain 'blue' or 'синий' or 'цвет'. Got: ${result.logs}`,
      );
      assertEquals(result.scenarioId, "integration-test-interactive");
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  },
});
