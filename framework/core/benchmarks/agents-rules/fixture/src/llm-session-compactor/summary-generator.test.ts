import { expect } from "@std/expect";
import type { ModelMessage } from "ai";
import type { LlmRequester, GenerateResult } from "../llm/llm.ts";
import { SummaryGenerator } from "./summary-generator.ts";

/** Creates a mock LlmRequester that returns the given text as a successful result. */
function makeMockLlm(text: string): LlmRequester {
  const fn = () =>
    Promise.resolve({
      result: null,
      text,
      estimatedCost: 0.001,
      inputTokens: 50,
      outputTokens: 20,
      newMessages: [],
      steps: [],
    } as GenerateResult<null>);
  // Attach the .stream property so the type is satisfied
  // deno-lint-ignore no-explicit-any
  (fn as any).stream = () => { throw new Error("stream not implemented in mock"); };
  return fn as unknown as LlmRequester;
}

/** Creates a mock LlmRequester that throws the given error. */
function makeErrorLlm(message: string): LlmRequester {
  const fn = () => Promise.reject(new Error(message));
  // deno-lint-ignore no-explicit-any
  (fn as any).stream = () => { throw new Error("stream not implemented in mock"); };
  return fn as unknown as LlmRequester;
}

/** Creates a mock LlmRequester that returns a validationError. */
function makeValidationErrorLlm(): LlmRequester {
  const fn = () =>
    Promise.resolve({
      result: null,
      text: "",
      validationError: "Schema mismatch",
      estimatedCost: 0,
      inputTokens: 0,
      outputTokens: 0,
      newMessages: [],
      steps: [],
    } as GenerateResult<null>);
  // deno-lint-ignore no-explicit-any
  (fn as any).stream = () => { throw new Error("stream not implemented in mock"); };
  return fn as unknown as LlmRequester;
}

Deno.test("SummaryGenerator", async (t) => {
  await t.step("constructor should create summary generator with LlmRequester", () => {
    const generator = new SummaryGenerator({
      llm: makeMockLlm("summary"),
    });
    expect(generator).toBeInstanceOf(SummaryGenerator);
  });

  await t.step("generateSummary should call LlmRequester and return summary", async () => {
    const llmText = "This is the LLM-generated summary";
    const capturedArgs: unknown[] = [];

    const capturingLlm = ((params: unknown) => {
      capturedArgs.push(params);
      return Promise.resolve({
        result: null,
        text: llmText,
        estimatedCost: 0.001,
        inputTokens: 50,
        outputTokens: 20,
        newMessages: [],
        steps: [],
      } as GenerateResult<null>);
    }) as unknown as LlmRequester;
    // deno-lint-ignore no-explicit-any
    (capturingLlm as any).stream = () => { throw new Error("not implemented"); };

    const generator = new SummaryGenerator({ llm: capturingLlm });

    const messages: ModelMessage[] = [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there" },
    ];

    const result = await generator.generateSummary({ messages });

    // Result should be an assistant message with the LLM text
    expect(result.role).toBe("assistant");
    expect(result.content).toBe(llmText);

    // LlmRequester should have been called exactly once
    expect(capturedArgs.length).toBe(1);

    // The call should include the correct identifier and stageName
    const callParams = capturedArgs[0] as Record<string, unknown>;
    expect(callParams.identifier).toBe("summary-generation");
    expect(callParams.stageName).toBe("session-compaction");

    // Messages passed to LLM should include a system message
    const llmMessages = callParams.messages as ModelMessage[];
    expect(llmMessages.length).toBeGreaterThan(0);
    expect(llmMessages[0].role).toBe("system");
  });

  await t.step("generateSummary should pass summaryMaxTokens and temperature to settings", async () => {
    const capturedArgs: unknown[] = [];

    const capturingLlm = ((params: unknown) => {
      capturedArgs.push(params);
      return Promise.resolve({
        result: null,
        text: "summary",
        estimatedCost: 0,
        inputTokens: 10,
        outputTokens: 5,
        newMessages: [],
        steps: [],
      } as GenerateResult<null>);
    }) as unknown as LlmRequester;
    // deno-lint-ignore no-explicit-any
    (capturingLlm as any).stream = () => { throw new Error("not implemented"); };

    const generator = new SummaryGenerator({
      llm: capturingLlm,
      config: { summaryMaxTokens: 500, temperature: 0.2 },
    });

    await generator.generateSummary({
      messages: [{ role: "user", content: "test" }],
    });

    expect(capturedArgs.length).toBe(1);
    const callParams = capturedArgs[0] as Record<string, unknown>;
    const settings = callParams.settings as Record<string, unknown>;
    expect(settings.maxOutputTokens).toBe(500);
    expect(settings.temperature).toBe(0.2);
  });

  await t.step("generateSummary should return fallback on LLM error", async () => {
    const generator = new SummaryGenerator({
      llm: makeErrorLlm("API failed"),
    });

    const messages: ModelMessage[] = [
      { role: "user", content: "msg1" },
      { role: "assistant", content: "msg2" },
      { role: "user", content: "msg3" },
    ];

    const result = await generator.generateSummary({ messages });

    // Must NOT throw — returns fallback
    expect(result.role).toBe("assistant");
    expect(typeof result.content).toBe("string");
    // Fallback must mention the number of messages
    expect((result.content as string).includes("3")).toBe(true);
  });

  await t.step("generateSummary should return fallback when LLM returns validationError", async () => {
    const generator = new SummaryGenerator({
      llm: makeValidationErrorLlm(),
    });

    const messages: ModelMessage[] = [
      { role: "user", content: "x" },
    ];

    const result = await generator.generateSummary({ messages });

    expect(result.role).toBe("assistant");
    expect(typeof result.content).toBe("string");
  });
});
