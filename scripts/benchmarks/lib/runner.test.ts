import { assertEquals } from "@std/assert";
import { join } from "@std/path";
import { runScenario } from "./runner.ts";
import { BenchmarkScenario, LLMMessage, LLMResponse } from "./types.ts";

Deno.test("Runner - Multi-turn Interaction", async () => {
  // 1. Setup
  const tempDir = await Deno.makeTempDir();
  const agentPath = join(tempDir, "agent.md");
  await Deno.writeTextFile(agentPath, "You are a test agent.");

  const scenario: BenchmarkScenario = {
    id: "test-scenario",
    name: "Test Scenario",
    targetAgentPath: agentPath,
    setup: async (sandbox) => {
      await Deno.writeTextFile(join(sandbox, "test.txt"), "initial");
    },
    userQuery: "Change test.txt to 'modified'",
    checklist: [
      { id: "check1", description: "File modified", critical: true },
    ],
    mocks: {
      "custom-tool": "echo 'mocked output'",
    },
  };

  // Adjust targetAgentPath to be relative to CWD because runner joins it
  const relativeAgentPath = "test_agent.md";
  await Deno.writeTextFile(relativeAgentPath, "You are a test agent.");
  scenario.targetAgentPath = relativeAgentPath;

  let llmCallCount = 0;
  const llmClient = async (
    messages: LLMMessage[],
    _model?: string,
    _temp?: number,
    _signal?: AbortSignal,
  ): Promise<LLMResponse> => {
    await Promise.resolve(); // satisfy require-await
    llmCallCount++;
    const lastMsg = messages[messages.length - 1];

    if (llmCallCount === 1) {
      // First turn: Agent generates a command
      return {
        content:
          "I will modify the file.\n```bash\necho 'modified' > test.txt\ncustom-tool\n```",
      };
    } else if (llmCallCount === 2) {
      // Second turn: Agent confirms
      // Verify that the previous message was the tool output
      if (lastMsg.role !== "user" || !lastMsg.content.includes("STDOUT:")) {
        // In a real multi-turn, we expect the tool output to be fed back.
        // Since we haven't implemented it yet, this might not happen.
      }
      // Check if mock output is present
      if (lastMsg.content.includes("mocked output")) {
        // Mock worked
      } else {
        throw new Error("Mock output not found in user message");
      }
      return {
        content: "I am done.",
      };
    }
    return { content: "Done" };
  };

  const judgeClient = async () => {
    await Promise.resolve(); // satisfy require-await
    return {
      check1: { pass: true, reason: "Test passed" },
    };
  };

  try {
    const result = await runScenario(scenario, {
      model: "test-model",
      workDir: tempDir,
      llmClient,
      judgeClient,
    });

    // Assertions
    assertEquals(result.success, true);
    // Expect 2 calls: 1. Generate command, 2. Confirm completion
    assertEquals(llmCallCount, 2, "LLM should be called twice (multi-turn)");

    // Check if file was modified (side effect)
    const sandboxPath = join(tempDir, "test-scenario", "sandbox");
    const content = await Deno.readTextFile(join(sandboxPath, "test.txt"));
    assertEquals(content.trim(), "modified");
  } finally {
    // Cleanup
    await Deno.remove(tempDir, { recursive: true });
    await Deno.remove(relativeAgentPath);
  }
});
