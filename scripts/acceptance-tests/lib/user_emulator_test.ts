import { assertEquals } from "@std/assert";
import { UserEmulator } from "./user_emulator.ts";
import type { ChatCompletionFn } from "./llm.ts";

function stubClient(total: number): ChatCompletionFn {
  return () =>
    Promise.resolve({
      content: "sure, go ahead",
      usage: {
        freshInput: 1,
        cachedInput: 2,
        cacheWrite: 0,
        output: 3,
        reasoning: 4,
        total,
      },
    });
}

Deno.test("UserEmulator: every answer it gives adds to what it has spent", async () => {
  const emulator = new UserEmulator({
    persona: "a hurried developer",
    config: { model: "m", temperature: 0 },
    llmClient: stubClient(10),
  });
  assertEquals(emulator.getUsage().total, 0);
  await emulator.getResponse([{ role: "assistant", content: "which one?" }]);
  await emulator.getResponse([{ role: "assistant", content: "and this one?" }]);
  const usage = emulator.getUsage();
  assertEquals(usage.total, 20);
  assertEquals(usage.reasoning, 8);
});
