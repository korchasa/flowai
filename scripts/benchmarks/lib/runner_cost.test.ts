import { assertEquals } from "@std/assert";
import { join } from "@std/path";
import { runScenario } from "./runner.ts";
import { BenchmarkScenario, LLMMessage, LLMResponse } from "./types.ts";
import { chatCompletion } from "./llm.ts";
import { evaluateChecklist } from "./judge.ts";

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
    agentsMarkdown: "# Test Agent\n- Rule 1",
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
    return {
      results: {},
      messages: [],
      response: "Judge response",
    };
  };

  try {
    const result = await runScenario(scenario, {
      agentConfig: { model: "test-model" },
      judgeConfig: { model: "judge-model" },
      workDir: tempDir,
      llmClient: llmClient as unknown as typeof chatCompletion,
      judgeClient: judgeClient as unknown as typeof evaluateChecklist,
    });

    assertEquals(result.totalCost, 0.0015);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});
