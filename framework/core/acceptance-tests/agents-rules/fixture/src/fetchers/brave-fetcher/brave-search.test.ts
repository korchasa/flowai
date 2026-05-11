import { expect } from "@std/expect";
import { BraveSearchClient } from "./client.ts";
import type { RunContext } from "../../run-context/run-context.ts";
import type { Logger } from "../../logger/logger.ts";

Deno.test("BraveSearchClient", async (t) => {
  const mockCtx = {
    logger: {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    } as unknown as Logger,
    runId: "test-run",
    debugDir: await Deno.makeTempDir({ prefix: "brave-test-" }),
  } as unknown as RunContext;

  Deno.env.set("BRAVE_SEARCH_API_KEY", "test-api-key");
  Deno.env.set("BRAVE_API_KEY", "test-api-key");

  await t.step("search should call Brave API with correct parameters", async (_t) => {
    let capturedUrl = "";
    let capturedOptions: RequestInit = {};

    globalThis.fetch = ((url: string, options: RequestInit) => {
      capturedUrl = url;
      capturedOptions = options;
      return Promise.resolve({
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify({
          web: { results: [{ title: "Test", url: "https://test.com", description: "Test desc" }] }
        })),
      } as Response);
    }) as typeof fetch;

    const client = new BraveSearchClient(mockCtx);
    const result = await client.search({ q: "test query", count: 5 });

    expect(capturedUrl).toContain("q=test+query");
    expect(capturedUrl).toContain("count=5");
    expect((capturedOptions.headers as Record<string, string>)["X-Subscription-Token"]).toBe("test-api-key");
    expect(result.web?.results?.[0].title).toBe("Test");
  });

  await t.step("search should handle API errors", async (_t) => {
    globalThis.fetch = (() => Promise.resolve({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      headers: new Headers(),
      text: () => Promise.resolve("Error body"),
    } as Response)) as typeof fetch;

    const client = new BraveSearchClient(mockCtx);
    await expect(client.search({ q: "test" })).rejects.toThrow("HTTP error: 500 Internal Server Error");
  });

  await t.step("search should handle network errors", async (_t) => {
    globalThis.fetch = (() => Promise.reject(new Error("Network error"))) as typeof fetch;

    const client = new BraveSearchClient(mockCtx);
    await expect(client.search({ q: "test" })).rejects.toThrow("Network error");
  });

  // Cleanup
  await Deno.remove(mockCtx.debugDir, { recursive: true });
});
