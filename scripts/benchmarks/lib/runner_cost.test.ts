import { assertEquals } from "@std/assert";
import { join } from "@std/path";
import { runScenario } from "./runner.ts";
import { BenchmarkScenario, LLMMessage, LLMResponse } from "./types.ts";

Deno.test("Runner - should aggregate cost from multiple turns", async () => {
  const tempDir = await Deno.makeTempDir();
  const agentPath = join(tempDir, "agent.md");
  await Deno.writeTextFile(agentPath, "You are a test agent.");

  const scenario: BenchmarkScenario = {
    id: "test-scenario",
    name: "Test Scenario",
    targetAgentPath: agentPath,
    setup: async () => {},
    userQuery: "Test",
    checklist: [],
  };

  let turn = 0;
  const llmClient = async (
    _messages: LLMMessage[],
  ): Promise<LLMResponse> => {
    await Promise.resolve();
    turn++;
    if (turn === 1) {
      return {
        content: "```bash\necho 1\n```",
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
          cost: 0.001,
        },
      };
    }
    return {
      content: "Done",
      usage: {
        prompt_tokens: 5,
        completion_tokens: 2,
        total_tokens: 7,
        cost: 0.0005,
      },
    };
  };

  const judgeClient = async () => {
    await Promise.resolve();
    return {};
  };

  try {
    const result = await runScenario(scenario, {
      model: "test-model",
      workDir: tempDir,
      llmClient,
      judgeClient,
    });

    assertEquals(result.totalCost, 0.0015);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});
