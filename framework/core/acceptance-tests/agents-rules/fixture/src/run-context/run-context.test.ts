import { expect } from "@std/expect";
import { join } from "node:path";
import { getSubDebugDir, createRunContext } from "./run-context.ts";
import type { RunContext } from "./run-context.ts";
import { Logger } from "../logger/logger.ts";

// Mock logger
class MockLogger extends Logger {
  constructor() {
    super({ context: "test" });
  }
}

Deno.test("run-context", async (t) => {
  await t.step("getSubDebugDir()", async (t) => {
    await t.step("should create subdirectory path within debug directory", () => {
      const ctx: RunContext = {
        runId: "test-run-123",
        debugDir: "/tmp/debug",
        logger: new MockLogger(),
        startTime: new Date(),
      };

      const result = getSubDebugDir({ ctx, stageDir: "processing" });

      expect(result).toBe("/tmp/debug/processing");
    });

    await t.step("should handle nested stage directories", () => {
      const ctx: RunContext = {
        runId: "test-run-456",
        debugDir: "/app/debug",
        logger: new MockLogger(),
        startTime: new Date(),
      };

      const result = getSubDebugDir({ ctx, stageDir: "llm/session-compaction" });

      expect(result).toBe("/app/debug/llm/session-compaction");
    });

    await t.step("should handle debug directory with trailing slash", () => {
      const ctx: RunContext = {
        runId: "test-run-789",
        debugDir: "/tmp/debug/",
        logger: new MockLogger(),
        startTime: new Date(),
      };

      const result = getSubDebugDir({ ctx, stageDir: "output" });

      expect(result).toMatch(/output$/);
      expect(result).toContain("/tmp/debug");
    });

    await t.step("should handle debug directory without trailing slash", () => {
      const ctx: RunContext = {
        runId: "test-run-101",
        debugDir: "/tmp/debug",
        logger: new MockLogger(),
        startTime: new Date(),
      };

      const result = getSubDebugDir({ ctx, stageDir: "output" });

      expect(result).toBe("/tmp/debug/output");
    });

    await t.step("should handle empty stage directory", () => {
      const ctx: RunContext = {
        runId: "test-run-202",
        debugDir: "/tmp/debug",
        logger: new MockLogger(),
        startTime: new Date(),
      };

      const result = getSubDebugDir({ ctx, stageDir: "" });

      expect(result).toBe("/tmp/debug");
    });

    await t.step("should handle relative debug directory paths", () => {
      const ctx: RunContext = {
        runId: "test-run-303",
        debugDir: "./debug",
        logger: new MockLogger(),
        startTime: new Date(),
      };

      const result = getSubDebugDir({ ctx, stageDir: "stage1" });

      expect(result).toBe("debug/stage1");
    });

    await t.step("should handle stage directory with special characters", () => {
      const ctx: RunContext = {
        runId: "test-run-505",
        debugDir: "/tmp/debug",
        logger: new MockLogger(),
        startTime: new Date(),
      };

      const result = getSubDebugDir({ ctx, stageDir: "stage-with_special.chars" });

      expect(result).toBe("/tmp/debug/stage-with_special.chars");
    });

    await t.step("should create consistent paths for same inputs", () => {
      const ctx: RunContext = {
        runId: "test-run-606",
        debugDir: "/tmp/debug",
        logger: new MockLogger(),
        startTime: new Date(),
      };

      const result1 = getSubDebugDir({ ctx, stageDir: "test" });
      const result2 = getSubDebugDir({ ctx, stageDir: "test" });

      expect(result1).toBe(result2);
    });
  });

  await t.step("RunContext interface", () => {
    const ctx: RunContext = {
      runId: "test-run",
      debugDir: "/tmp/test",
      logger: new MockLogger(),
      startTime: new Date("2024-01-01T00:00:00Z"),
    };

    expect(ctx.runId).toBe("test-run");
    expect(ctx.debugDir).toBe("/tmp/test");
    expect(ctx.startTime.getTime()).toBe(new Date("2024-01-01T00:00:00Z").getTime());
    expect(ctx.logger instanceof MockLogger).toBe(true);
  });

  await t.step("createRunContext()", async (t) => {
    await t.step("should use provided runId and debugDir", () => {
      const ctx = createRunContext({
        logger: new MockLogger(),
        debugDir: "/tmp/debug",
        runId: "explicit-run",
      });

      expect(ctx.runId).toBe("explicit-run");
      expect(ctx.debugDir).toBe("/tmp/debug");
      expect(typeof ctx.saveDebugFile).toBe("function");
    });

    await t.step("should save debug files with default saveDebugFile", async () => {
      const baseDir = await Deno.makeTempDir({ prefix: "run-context-" });

      try {
        const ctx = createRunContext({
          logger: new MockLogger(),
          debugDir: baseDir,
          runId: "test-run",
        });

        await ctx.saveDebugFile?.({
          filename: "debug.txt",
          content: "hello",
          stageDir: "stage",
        });

        const fileContent = await Deno.readTextFile(join(baseDir, "stage", "debug.txt"));
        expect(fileContent).toBe("hello");
      } finally {
        await Deno.remove(baseDir, { recursive: true });
      }
    });
  });
});
