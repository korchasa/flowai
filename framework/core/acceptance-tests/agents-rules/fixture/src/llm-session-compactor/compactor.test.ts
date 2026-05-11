import { expect } from "@std/expect";
import type { ModelMessage } from "ai";
import {
  SimpleHistoryCompactor,
  SummarizingHistoryCompactor,
} from "./compactor.ts";
import type { SummaryGenerator } from "./summary-generator.ts";

// Mock summary generator
class MockSummaryGenerator {
  generateSummary({ messages }: { messages: readonly ModelMessage[] }): Promise<ModelMessage> {
    const content = `Summary of ${messages.length} messages`;
    return Promise.resolve({
      role: "assistant",
      content,
    });
  }
}

Deno.test("History Compactor", async (t) => {
  await t.step("SimpleHistoryCompactor", async (t) => {
    await t.step("constructor should create compactor with specified max symbols", () => {
      const compactor = new SimpleHistoryCompactor({ maxSymbols: 1000 });
      expect(compactor instanceof SimpleHistoryCompactor).toBe(true);
    });

    await t.step("compact should return all messages if under limit", () => {
      const compactor = new SimpleHistoryCompactor({ maxSymbols: 1000 });
      const messages: ModelMessage[] = [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi" },
      ];

      const result = compactor.compact(messages);
      expect(result.length).toBe(2);
      expect(result).toStrictEqual(messages);
    });

    await t.step("compact should trim messages from the beginning when over limit", () => {
      const compactor = new SimpleHistoryCompactor({ maxSymbols: 10 });
      const messages: ModelMessage[] = [
        { role: "user", content: "Very long message that exceeds limit" },
        { role: "assistant", content: "Short" },
        { role: "user", content: "Another long message" },
      ];

      const result = compactor.compact(messages);
      expect(result.length <= messages.length).toBe(true);
      expect(result[result.length - 1].role).toBe("assistant");
      expect(result.length).toBe(1);
    });

    await t.step("compact should handle messages with complex content", () => {
      const compactor = new SimpleHistoryCompactor({ maxSymbols: 50 });
      const messages: ModelMessage[] = [
        { role: "user", content: "Start conversation" },
        { role: "assistant", content: "Response with complex content structure" },
        { role: "user", content: "Final question" },
      ];

      const result = compactor.compact(messages);
      expect(result.length > 0).toBe(true);
    });

    await t.step("compact should handle empty message list", () => {
      const compactor = new SimpleHistoryCompactor({ maxSymbols: 100 });
      const messages: ModelMessage[] = [];

      const result = compactor.compact(messages);
      expect(result.length).toBe(0);
    });

    await t.step("compact should handle single message over limit", () => {
      const compactor = new SimpleHistoryCompactor({ maxSymbols: 5 });
      const messages: ModelMessage[] = [
        { role: "user", content: "This message is way too long for the limit" },
      ];

      const result = compactor.compact(messages);
      expect(result.length).toBe(0);
    });

    await t.step("estimateSymbols should provide symbol estimation", () => {
      const compactor = new SimpleHistoryCompactor({ maxSymbols: 100 });
      const message: ModelMessage = { role: "user", content: "Test" };

      const result = compactor.estimateSymbols(message);
      expect(result).toBe(4);
    });
  });

  await t.step("SummarizingHistoryCompactor", async (t) => {
    const mockSummaryGenerator = new MockSummaryGenerator() as unknown as SummaryGenerator;

    await t.step("constructor should create compactor with summary generator", () => {
      const compactor = new SummarizingHistoryCompactor({
        maxSymbols: 1000,
        summaryGenerator: mockSummaryGenerator,
      });

      expect(compactor instanceof SummarizingHistoryCompactor).toBe(true);
    });

    await t.step("compact should use simple compaction when no threshold set", async () => {
      const compactor = new SummarizingHistoryCompactor({
        maxSymbols: 1000,
        summaryGenerator: mockSummaryGenerator,
      });

      const messages: ModelMessage[] = [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi" },
      ];

      const result = await compactor.compact(messages);
      expect(result.length).toBe(2);
    });

    await t.step("compact should use simple compaction when under threshold", async () => {
      const compactor = new SummarizingHistoryCompactor({
        maxSymbols: 1000,
        summaryTokenThreshold: 1000,
        summaryGenerator: mockSummaryGenerator,
      });

      const messages: ModelMessage[] = [
        { role: "user", content: "Short message" },
        { role: "assistant", content: "Short response" },
      ];

      const result = await compactor.compact(messages);
      expect(result.length).toBe(2);
    });

    await t.step("compact should attempt summarization when over threshold", async () => {
      const compactor = new SummarizingHistoryCompactor({
        maxSymbols: 1000,
        summaryTokenThreshold: 10,
        summaryGenerator: mockSummaryGenerator,
      });

      const longMessage = "x".repeat(100);
      const messages: ModelMessage[] = [
        { role: "user", content: longMessage },
        { role: "assistant", content: "Response" },
        { role: "user", content: "Final question" },
      ];

      const result = await compactor.compact(messages);
      expect(result.length > 0).toBe(true);
    });

    await t.step("compact should handle summarization errors gracefully", async () => {
      class ErrorSummaryGenerator {
        generateSummary(): Promise<ModelMessage> {
          return Promise.reject(new Error("Summarization failed"));
        }
      }

      const compactor = new SummarizingHistoryCompactor({
        maxSymbols: 1000,
        summaryTokenThreshold: 10,
        summaryGenerator: new ErrorSummaryGenerator() as unknown as SummaryGenerator,
      });

      const messages: ModelMessage[] = [
        { role: "user", content: "x".repeat(50) },
        { role: "assistant", content: "Response" },
      ];

      const result = await compactor.compact(messages);
      expect(result.length > 0).toBe(true);
    });

    await t.step("estimateSymbols should provide symbol estimation", () => {
      const compactor = new SummarizingHistoryCompactor({
        maxSymbols: 100,
        summaryGenerator: mockSummaryGenerator,
      });

      const message: ModelMessage = { role: "user", content: "Test" };
      const result = compactor.estimateSymbols(message);
      expect(result).toBe(4);
    });
  });
});
