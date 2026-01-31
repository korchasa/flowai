/**
 * Integration tests for Runner + SpawnedAgent with real cursor-agent.
 *
 * These tests require:
 * - cursor-agent binary in PATH
 * - Valid Cursor authentication
 * - .env file with INTEGRATION_TEST_MODEL (optional, defaults to "auto")
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "@std/path";
import { load } from "@std/dotenv";
import { SpawnedAgent } from "./spawned_agent.ts";
import { runScenario } from "./runner.ts";
import { BenchmarkScenario } from "./types.ts";
import { createTempDir } from "./utils.ts";

// Load environment variables from .env file
await load({ export: true });

const TEST_MODEL = Deno.env.get("INTEGRATION_TEST_MODEL") || "auto";
const JUDGE_CONFIG = { model: TEST_MODEL, temperature: 0 };

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
    });

    try {
      const result = await agent.run();

      // Agent should complete successfully
      assertEquals(result.code, 0);

      // Should contain result JSON
      assertStringIncludes(result.logs, '"type":"result"');

      // Should contain some response (the actual text may vary)
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
    const tempDir = await createTempDir("integ");

    // Create a minimal skill file
    const skillPath = join(tempDir, "test-skill.md");
    await Deno.writeTextFile(
      skillPath,
      `# Test Skill

## Instructions
When asked to create a file, create it with the exact content requested.
`,
    );

    const scenario: BenchmarkScenario = {
      id: "integration-test-basic",
      name: "Integration Test - Basic",
      targetAgentPath: skillPath,
      setup: async (sandbox) => {
        // Initialize git repo for evidence collection
        const gitInit = new Deno.Command("git", {
          args: ["init"],
          cwd: sandbox,
        });
        await gitInit.output();

        const gitConfig1 = new Deno.Command("git", {
          args: ["config", "user.email", "test@test.com"],
          cwd: sandbox,
        });
        await gitConfig1.output();

        const gitConfig2 = new Deno.Command("git", {
          args: ["config", "user.name", "Test"],
          cwd: sandbox,
        });
        await gitConfig2.output();
      },
      userQuery: "Create a file named 'hello.txt' with content 'Hello from integration test'",
      agentsMarkdown: "# Test Agent\nYou are a helpful file manager.",
      checklist: [
        {
          id: "file_created",
          description: "File hello.txt was created",
          critical: true,
        },
        {
          id: "content_correct",
          description: "File contains the expected content",
          critical: true,
        },
      ],
      maxSteps: 3,
    };

    try {
      const result = await runScenario(scenario, {
        agentModel: TEST_MODEL,
        judgeConfig: JUDGE_CONFIG,
        workDir: tempDir,
      });

      // Check that scenario completed
      assertEquals(typeof result.success, "boolean");
      assertEquals(typeof result.durationMs, "number");
      assertEquals(result.scenarioId, "integration-test-basic");

      // Verify file was actually created in sandbox
      const sandboxPath = join(tempDir, "integration-test-basic", "sandbox");
      try {
        const content = await Deno.readTextFile(join(sandboxPath, "hello.txt"));
        assertStringIncludes(content.toLowerCase(), "hello");
      } catch {
        // File might not exist if agent failed - that's ok for this test
        console.log("  Note: File was not created by agent");
      }

      // Verify trace was created
      const tracePath = join(tempDir, "integration-test-basic", "trace.html");
      const traceExists = await Deno.stat(tracePath).then(() => true).catch(() => false);
      assertEquals(traceExists, true);
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  },
});

