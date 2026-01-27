import { assertEquals } from "@std/assert";
import { join } from "@std/path";
import { runScenario } from "./runner.ts";
import { BenchmarkScenario, LLMMessage, LLMResponse } from "./types.ts";
import { chatCompletion, ModelConfig } from "./llm.ts";
import { evaluateChecklist } from "./judge.ts";

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
    agentsMarkdown: "# Test Agent\n- Rule 1",
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
  const llmClient = (
    _messages: LLMMessage[],
    _config: ModelConfig | string,
    _temp?: number,
    _signal?: AbortSignal,
  ): Promise<LLMResponse> => {
    llmCallCount++;
    if (llmCallCount === 1) {
      // First turn: Agent generates a command
      return Promise.resolve({
        content:
          "I will modify the file.\n```bash\necho 'modified' > test.txt\ncustom-tool\n```",
      });
    } else if (llmCallCount === 2) {
      // Second turn: Agent confirms
      return Promise.resolve({
        content: "I am done.",
      });
    }
    return Promise.resolve({ content: "Done" });
  };

  const judgeClient = async () => {
    await Promise.resolve(); // satisfy require-await
    return {
      results: {
        check1: { pass: true, reason: "Test passed" },
      },
      messages: [],
      response: "Judge response",
    };
  };

  try {
    const result = await runScenario(scenario, {
      agentConfig: { model: "test-model" },
      judgeConfig: { model: "judge-model" },
      workDir: tempDir,
      llmClient: llmClient as typeof chatCompletion,
      judgeClient: judgeClient as typeof evaluateChecklist,
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
