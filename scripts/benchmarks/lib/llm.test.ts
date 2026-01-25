import { assertEquals } from "@std/assert";
import { chatCompletion } from "./llm.ts";

Deno.test("LLM - chatCompletion should extract cost from OpenRouter response", async () => {
  const mockResponse = {
    choices: [{ message: { content: "Hello" } }],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 5,
      total_tokens: 15,
      cost: 0.000123,
    },
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = () =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response);

  try {
    // Set dummy API key
    Deno.env.set("OPENROUTER_API_KEY", "test-key");

    const response = await chatCompletion([{ role: "user", content: "Hi" }]);

    assertEquals(response.usage?.cost, 0.000123);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
