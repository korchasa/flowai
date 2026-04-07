import { expect } from "@std/expect";
import { JinaScraper } from "./client.ts";
import type { RunContext } from "../../run-context/run-context.ts";
import type { Logger } from "../../logger/logger.ts";

Deno.test("JinaScraperClient", async (t) => {
  const mockCtx = {
    logger: {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    } as unknown as Logger,
    runId: "test-run",
    debugDir: await Deno.makeTempDir({ prefix: "jina-test-" }),
  } as unknown as RunContext;

  Deno.env.set("JINA_READER_API_KEY", "test-api-key");
  Deno.env.set("JINA_API_KEY", "test-api-key");

  await t.step("fetch should call Jina Reader API with correct parameters", async (_t) => {
    let capturedUrl = "";
    let capturedOptions: RequestInit = {};

    globalThis.fetch = ((url: string, options: RequestInit) => {
      capturedUrl = url;
      capturedOptions = options;
      return Promise.resolve({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        text: () => Promise.resolve(JSON.stringify({
          code: 200,
          status: 20000,
          data: {
            title: "Test Content",
            content: "This is a test.",
            url: "https://test.com"
          }
        })),
        json: () => Promise.resolve({
          code: 200,
          status: 20000,
          data: {
            title: "Test Content",
            content: "This is a test.",
            url: "https://test.com"
          }
        }),
      } as Response);
    }) as typeof fetch;

    const client = new JinaScraper(mockCtx);
    const result = await client.fetch("https://test.com");

    expect(capturedUrl).toContain("https://r.jina.ai/https");
    expect(capturedUrl).toContain("test.com");
    expect(capturedUrl).toContain("respondWith=json");
    expect((capturedOptions.headers as Record<string, string>)["Authorization"]).toBe("Bearer test-api-key");
    expect(result.text).toContain("This is a test.");
    expect(result.title).toBe("Test Content");
  });

  await t.step("fetch should handle API errors", async (_t) => {
    globalThis.fetch = (() => Promise.resolve({
      ok: false,
      status: 404,
      statusText: "Not Found",
      headers: new Headers(),
      text: () => Promise.resolve("Error body"),
    } as Response)) as typeof fetch;

    const client = new JinaScraper(mockCtx);
    await expect(client.fetch("https://test.com")).rejects.toThrow("HTTP error: 404 Not Found");
  });

  await t.step("fetch should handle network errors", async (_t) => {
    globalThis.fetch = (() => Promise.reject(new Error("Network error"))) as typeof fetch;

    const client = new JinaScraper(mockCtx);
    await expect(client.fetch("https://test.com")).rejects.toThrow("Network error");
  });

  // Cleanup
  await Deno.remove(mockCtx.debugDir, { recursive: true });
});
