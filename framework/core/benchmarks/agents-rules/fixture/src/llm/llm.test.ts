import { expect } from "@std/expect";
import { createVercelRequester, ModelURI } from "./llm.ts";
import type { Logger } from "../logger/logger.ts";
import type { CostTracker } from "../cost-tracker/cost-tracker.ts";
import type { RunContext } from "../run-context/run-context.ts";

Deno.test("ModelURI", async (t) => {
  await t.step("should parse chat://openai/gpt-4", () => {
    const uri = ModelURI.parse("chat://openai/gpt-4");
    expect(uri.provider).toBe("openai");
    expect(uri.modelName).toBe("gpt-4");
  });

  await t.step("should parse response-api://openai/gpt-4o (protocol accepted but ignored)", () => {
    const uri = ModelURI.parse("response-api://openai/gpt-4o");
    expect(uri.provider).toBe("openai");
    expect(uri.modelName).toBe("gpt-4o");
  });

  await t.step("should parse openai/gpt-4 without protocol prefix", () => {
    const uri = ModelURI.parse("openai/gpt-4");
    expect(uri.provider).toBe("openai");
    expect(uri.modelName).toBe("gpt-4");
  });

  await t.step("toString() should return format without protocol prefix", () => {
    const uri = ModelURI.parse("openai/gpt-4");
    expect(uri.toString()).toBe("openai/gpt-4");
  });

  await t.step("toString() should return format without protocol prefix for chat:// URI", () => {
    const uri = ModelURI.parse("chat://openai/gpt-4");
    expect(uri.toString()).toBe("openai/gpt-4");
  });

  await t.step("should throw error for legacy openai:gpt-4 format", () => {
    expect(() => ModelURI.parse("openai:gpt-4")).toThrow();
  });

  await t.step("should parse with parameters", () => {
    const uri = ModelURI.parse("chat://openai/gpt-4?apiKey=test-key&temperature=0.5");
    expect(uri.provider).toBe("openai");
    expect(uri.modelName).toBe("gpt-4");
    expect(uri.params.get("apiKey")).toBe("test-key");
    expect(uri.params.get("temperature")).toBe("0.5");
  });

  await t.step("should mask apiKey in toString()", () => {
    const uri = ModelURI.parse("chat://openai/gpt-4?apiKey=secret-key&other=val");
    expect(uri.toString()).toContain("apiKey=***");
    expect(uri.toString()).toContain("other=val");
    expect(uri.toString()).not.toContain("secret-key");
  });
});

Deno.test("LLM Requester", async (t) => {
  const logger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  } as unknown as Logger;
  const costTracker = {
    addCost: () => {},
    addTokens: () => {},
  } as unknown as CostTracker;
  const ctx = {
    runId: "test-run-123",
    debugDir: "/tmp/test-debug",
    logger,
    startTime: new Date(),
    saveDebugFile: () => Promise.resolve(),
  } as unknown as RunContext;

  await t.step("should create requester for OpenAI", () => {
    expect(() => createVercelRequester({
      modelUri: ModelURI.parse("chat://openai/gpt-4?apiKey=test-key"),
      logger,
      costTracker,
      ctx
    })).not.toThrow();
  });

  await t.step("API Key Resolution", async (t) => {
    await t.step("should fallback to environment variable if apiKey is missing from URI", () => {
      Deno.env.set("OPENAI_API_KEY", "env-key");
      
      const requester = createVercelRequester({
        modelUri: ModelURI.parse("chat://openai/gpt-4"),
        logger,
        costTracker,
        ctx
      });
      expect(requester).toBeDefined();
    });

    await t.step("should use provider-specific environment variable", () => {
      Deno.env.set("GEMINI_API_KEY", "gemini-env-key");
      const requester = createVercelRequester({
        modelUri: ModelURI.parse("chat://gemini/model"),
        logger,
        costTracker,
        ctx
      });
      expect(requester).toBeDefined();
    });
  });
});
