/**
 * Tests for AbortController race condition fix (GitHub issue #6).
 *
 * Background: When generateText() settles and the setTimeout callback is
 * already queued as a macrotask, clearTimeout cannot cancel it.
 * controller.abort() then triggers AbortError in dangling SDK-internal
 * listeners (e.g., fetch) that are no longer awaited, crashing the process.
 *
 * Fix: A `settled` flag checked in the setTimeout callback before calling
 * abort(). Combined with clearTimeout in finally, this provides
 * defense-in-depth against the timing race.
 */
import { expect } from "@std/expect";
import { createVercelRequester, ModelURI, type LlmEngine } from "./llm.ts";
import type { Logger } from "../logger/logger.ts";
import type { CostTracker } from "../cost-tracker/cost-tracker.ts";
import type { RunContext } from "../run-context/run-context.ts";
import { z } from "zod";

/**
 * Proof: calling abort() on a signal with a dangling listener creates
 * an unhandled promise rejection. This is the root cause of issue #6.
 */
Deno.test("AbortController race — dangling listener causes unhandled rejection (proof)", async () => {
  const controller = new AbortController();

  const unhandledErrors: unknown[] = [];
  const handler = (event: PromiseRejectionEvent) => {
    unhandledErrors.push(event.reason);
    event.preventDefault();
  };
  globalThis.addEventListener("unhandledrejection", handler);

  const danglingPromise = new Promise((_resolve, reject) => {
    controller.signal.addEventListener("abort", () => {
      reject(new DOMException("The operation was aborted.", "AbortError"));
    });
  });
  void danglingPromise;

  controller.abort();
  await new Promise(r => setTimeout(r, 100));

  const abortErrors = unhandledErrors.filter(
    e => e instanceof DOMException && e.name === "AbortError"
  );
  expect(abortErrors.length).toBeGreaterThan(0);

  globalThis.removeEventListener("unhandledrejection", handler);
});

/**
 * Proof: the settled-flag pattern prevents the unhandled rejection.
 */
Deno.test("settled flag pattern prevents unhandled rejection (proof)", async () => {
  const unhandledErrors: unknown[] = [];
  const handler = (event: PromiseRejectionEvent) => {
    unhandledErrors.push(event.reason);
    event.preventDefault();
  };
  globalThis.addEventListener("unhandledrejection", handler);

  const controller = new AbortController();
  let settled = false;

  const danglingPromise = new Promise((_resolve, reject) => {
    controller.signal.addEventListener("abort", () => {
      reject(new DOMException("The operation was aborted.", "AbortError"));
    });
  });
  void danglingPromise;

  // Simulate the timeout callback with the settled guard
  const timeoutCallback = () => {
    if (settled) return;
    controller.abort();
  };
  const timeoutId = setTimeout(timeoutCallback, 1);

  // Simulate generateText resolving
  await Promise.resolve();

  // Simulate the finally block
  settled = true;
  clearTimeout(timeoutId);

  // Manually invoke the callback to simulate the race where the callback
  // was already queued before clearTimeout could cancel it
  timeoutCallback();

  await new Promise(r => setTimeout(r, 100));

  const abortErrors = unhandledErrors.filter(
    e => e instanceof DOMException && e.name === "AbortError"
  );
  expect(abortErrors.length).toBe(0);
  expect(controller.signal.aborted).toBe(false);

  globalThis.removeEventListener("unhandledrejection", handler);
});

/**
 * Counter-proof: without the settled flag, same pattern causes the crash.
 */
Deno.test("without settled flag, same pattern causes unhandled rejection (counter-proof)", async () => {
  const unhandledErrors: unknown[] = [];
  const handler = (event: PromiseRejectionEvent) => {
    unhandledErrors.push(event.reason);
    event.preventDefault();
  };
  globalThis.addEventListener("unhandledrejection", handler);

  const controller = new AbortController();

  const danglingPromise = new Promise((_resolve, reject) => {
    controller.signal.addEventListener("abort", () => {
      reject(new DOMException("The operation was aborted.", "AbortError"));
    });
  });
  void danglingPromise;

  const timeoutCallbackNoGuard = () => {
    controller.abort();
  };
  const timeoutId = setTimeout(timeoutCallbackNoGuard, 1);

  await Promise.resolve();

  // Only clearTimeout, no settled flag
  clearTimeout(timeoutId);

  // Manually invoke — simulates the race
  timeoutCallbackNoGuard();

  await new Promise(r => setTimeout(r, 100));

  const abortErrors = unhandledErrors.filter(
    e => e instanceof DOMException && e.name === "AbortError"
  );
  expect(abortErrors.length).toBeGreaterThan(0);

  globalThis.removeEventListener("unhandledrejection", handler);
});

Deno.test("LLM Abort Crash — integration", async (t) => {
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

  await t.step("should handle abort timeout correctly (normal path)", async () => {
    const ctx = {
      runId: "test-run-123",
      debugDir: await Deno.makeTempDir({ prefix: "test-abort-crash-" }),
      logger,
      startTime: new Date(),
    } as unknown as RunContext;

    const mockEngine: LlmEngine = {
      streamText: () => ({}),
      generateText: (params: Record<string, unknown>) => {
        const signal = params.abortSignal as AbortSignal | undefined;
        if (signal?.aborted) {
          const error = new Error("Aborted");
          error.name = "AbortError";
          return Promise.reject(error);
        }
        return new Promise((_resolve, reject) => {
          signal?.addEventListener("abort", () => {
            const error = new Error("Aborted");
            error.name = "AbortError";
            reject(error);
          });
        });
      },
    };

    const requester = createVercelRequester({
      modelUri: ModelURI.parse("chat://openai/gpt-4?apiKey=test-key&timeout=10"),
      logger,
      costTracker,
      ctx
    });
    requester.engine = mockEngine;

    const schema = z.object({ result: z.string() });
    const result = await requester({
      messages: [{ role: "user", content: "test prompt" }],
      identifier: "test-id",
      schema,
      stageName: "test-stage",
      tools: undefined,
      maxSteps: undefined,
      settings: undefined,
    });

    expect(result.result).toBeNull();
    expect(result.validationError).toContain("Request timed out");

    await Deno.remove(ctx.debugDir, { recursive: true });
  });

  await t.step("should not call abort() after generateText settles (settled flag)", async () => {
    const ctx = {
      runId: "test-run-settled",
      debugDir: await Deno.makeTempDir({ prefix: "test-abort-settled-" }),
      logger,
      startTime: new Date(),
    } as unknown as RunContext;

    const capturedSignals: AbortSignal[] = [];

    const mockEngine: LlmEngine = {
      streamText: () => ({}),
      generateText: (params: Record<string, unknown>) => {
        const signal = params.abortSignal as AbortSignal | undefined;
        if (signal) capturedSignals.push(signal);

        return Promise.resolve({
          text: "not valid json",
          output: undefined,
          usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
          steps: [],
          finishReason: "stop",
          toolCalls: [],
          toolResults: [],
          providerMetadata: undefined,
        });
      },
    };

    const requester = createVercelRequester({
      modelUri: ModelURI.parse("chat://openai/gpt-4?apiKey=test-key&timeout=1"),
      logger,
      costTracker,
      ctx,
    });
    requester.engine = mockEngine;

    const schema = z.object({ answer: z.string() });
    await requester({
      messages: [{ role: "user", content: "test" }],
      identifier: "settled-flag-test",
      schema,
      stageName: "test-stage",
      tools: undefined,
      maxSteps: undefined,
      settings: undefined,
    });

    // Give all pending setTimeout callbacks time to fire
    await new Promise(r => setTimeout(r, 50));

    // The settled flag + clearTimeout should prevent abort() from being called.
    for (const signal of capturedSignals) {
      expect(signal.aborted).toBe(false);
    }

    await Deno.remove(ctx.debugDir, { recursive: true });
  });

  await t.step("should not crash during retry loop with dangling listeners", async () => {
    const unhandledRejections: unknown[] = [];
    const handler = (event: PromiseRejectionEvent) => {
      unhandledRejections.push(event.reason);
      event.preventDefault();
    };
    globalThis.addEventListener("unhandledrejection", handler);

    const ctx = {
      runId: "test-run-retry-race",
      debugDir: await Deno.makeTempDir({ prefix: "test-abort-retry-" }),
      logger,
      startTime: new Date(),
    } as unknown as RunContext;

    let attemptCount = 0;

    const mockEngine: LlmEngine = {
      streamText: () => ({}),
      generateText: (params: Record<string, unknown>) => {
        attemptCount++;
        const signal = params.abortSignal as AbortSignal | undefined;

        const danglingPromise = new Promise((_resolve, reject) => {
          signal?.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        });
        void danglingPromise;

        if (attemptCount <= 2) {
          return Promise.resolve({
            text: "invalid",
            output: undefined,
            usage: { inputTokens: 5, outputTokens: 3, totalTokens: 8 },
            steps: [],
            finishReason: "stop",
            toolCalls: [],
            toolResults: [],
            providerMetadata: undefined,
          });
        }

        return new Promise((_resolve, reject) => {
          signal?.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        });
      },
    };

    const requester = createVercelRequester({
      modelUri: ModelURI.parse("chat://openai/gpt-4?apiKey=test-key&timeout=30"),
      logger,
      costTracker,
      ctx,
    });
    requester.engine = mockEngine;

    const schema = z.object({ answer: z.string() });
    const result = await requester({
      messages: [{ role: "user", content: "test" }],
      identifier: "retry-race-test",
      schema,
      stageName: "test-stage",
      tools: undefined,
      maxSteps: undefined,
      settings: undefined,
    });

    expect(result).toBeDefined();
    expect(result.result).toBeNull();

    await new Promise(r => setTimeout(r, 200));

    const abortRejections = unhandledRejections.filter(r =>
      r instanceof DOMException && r.name === "AbortError" ||
      r instanceof Error && r.name === "AbortError"
    );
    expect(abortRejections.length).toBe(0);

    globalThis.removeEventListener("unhandledrejection", handler);
    await Deno.remove(ctx.debugDir, { recursive: true });
  });
});
