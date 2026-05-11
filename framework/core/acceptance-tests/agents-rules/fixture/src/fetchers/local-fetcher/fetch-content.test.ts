import { expect } from "@std/expect";
import { fetchFromURL } from "./fetch-content.ts";
import type { RunContext } from "../../run-context/run-context.ts";
import type { Logger } from "../../logger/logger.ts";

Deno.test("fetchContent", async (t) => {
  const logger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  } as unknown as Logger;

  const ctx = {
    logger,
    runId: "test-run",
    debugDir: await Deno.makeTempDir({ prefix: "fetch-content-test-" }),
  } as unknown as RunContext;

  await t.step("should fetch and extract content from URL", async () => {
    const result = await fetchFromURL({ url: "https://example.com", options: { ctx } });
    expect(result.url).toBe("https://example.com");
    expect(result.text).toBeDefined();
    expect(typeof result.text).toBe("string");
  });

  await t.step("should handle invalid URLs", async () => {
    await expect(fetchFromURL({ url: "invalid-url", options: { ctx } })).rejects.toThrow();
  });

  // Cleanup
  await Deno.remove(ctx.debugDir, { recursive: true });
});
