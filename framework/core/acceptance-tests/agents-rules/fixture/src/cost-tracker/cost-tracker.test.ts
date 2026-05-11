import { expect } from "@std/expect";
import { CostTracker } from "./cost-tracker.ts";

Deno.test("CostTracker", async (t) => {
  await t.step("getInstance() should return the same instance (singleton pattern)", () => {
    const instance1 = CostTracker.getInstance();
    const instance2 = CostTracker.getInstance();

    expect(instance1).toBe(instance2);
    expect(instance1 instanceof CostTracker).toBe(true);
  });

  await t.step("addCost()", async (t) => {
    await t.step("should add cost to total", () => {
      const tracker = CostTracker.getInstance();
      tracker.reset();

      tracker.addCost(1.50);
      tracker.addCost(2.25);

      const report = tracker.getReport();
      expect(report.totalCost).toBe(3.75);
      expect(report.requestCount).toBe(2);
    });

    await t.step("should increment request count for each cost addition", () => {
      const tracker = CostTracker.getInstance();
      tracker.reset();

      tracker.addCost(1.00);
      tracker.addCost(2.00);
      tracker.addCost(3.00);

      const report = tracker.getReport();
      expect(report.requestCount).toBe(3);
    });

    await t.step("should handle zero cost", () => {
      const tracker = CostTracker.getInstance();
      tracker.reset();

      tracker.addCost(0);

      const report = tracker.getReport();
      expect(report.totalCost).toBe(0);
      expect(report.requestCount).toBe(1);
    });

    await t.step("should handle negative cost", () => {
      const tracker = CostTracker.getInstance();
      tracker.reset();

      tracker.addCost(-1.50);

      const report = tracker.getReport();
      expect(report.totalCost).toBe(-1.50);
      expect(report.requestCount).toBe(1);
    });
  });

  await t.step("addTokens()", async (t) => {
    await t.step("should add input and output tokens", () => {
      const tracker = CostTracker.getInstance();
      tracker.reset();

      tracker.addTokens(100, 50);
      tracker.addTokens(200, 75);

      const report = tracker.getReport();
      expect(report.totalInputTokens).toBe(300);
      expect(report.totalOutputTokens).toBe(125);
      expect(report.totalTokens).toBe(425);
    });

    await t.step("should handle zero tokens", () => {
      const tracker = CostTracker.getInstance();
      tracker.reset();

      tracker.addTokens(0, 0);

      const report = tracker.getReport();
      expect(report.totalInputTokens).toBe(0);
      expect(report.totalOutputTokens).toBe(0);
      expect(report.totalTokens).toBe(0);
    });
  });

  await t.step("getReport()", async (t) => {
    await t.step("should return complete cost report", () => {
      const tracker = CostTracker.getInstance();
      tracker.reset();

      tracker.addCost(5.50);
      tracker.addCost(2.25);
      tracker.addTokens(150, 75);
      tracker.addTokens(200, 50);

      const report = tracker.getReport();

      expect(report.totalCost).toBe(7.75);
      expect(report.totalInputTokens).toBe(350);
      expect(report.totalOutputTokens).toBe(125);
      expect(report.totalTokens).toBe(475);
      expect(report.requestCount).toBe(2);
    });

    await t.step("should return zero values for new instance", () => {
      const tracker = CostTracker.getInstance();
      tracker.reset();

      const report = tracker.getReport();

      expect(report.totalCost).toBe(0);
      expect(report.totalInputTokens).toBe(0);
      expect(report.totalOutputTokens).toBe(0);
      expect(report.totalTokens).toBe(0);
      expect(report.requestCount).toBe(0);
    });
  });

  await t.step("getFormattedReport()", async (t) => {
    await t.step("should return human-readable formatted report", () => {
      const tracker = CostTracker.getInstance();
      tracker.reset();

      tracker.addCost(3.14159);
      tracker.addTokens(1000, 500);

      const formatted = tracker.getFormattedReport();

      expect(formatted).toContain("Total Cost: $3.1416");
      expect(formatted).toContain("Total Tokens: 1500 (1000 input, 500 output)");
      expect(formatted).toContain("Total Requests: 1");
    });

    await t.step("should format cost with 4 decimal places", () => {
      const tracker = CostTracker.getInstance();
      tracker.reset();

      tracker.addCost(1.23456);

      const formatted = tracker.getFormattedReport();

      expect(formatted).toContain("Total Cost: $1.2346");
    });

    await t.step("should round cost to 4 decimal places", () => {
      const tracker = CostTracker.getInstance();
      tracker.reset();

      tracker.addCost(1.23456789);

      const formatted = tracker.getFormattedReport();

      expect(formatted).toContain("Total Cost: $1.2346");
    });
  });

  await t.step("reset()", async (t) => {
    await t.step("should reset all counters to zero", () => {
      const tracker = CostTracker.getInstance();
      tracker.reset();

      tracker.addCost(10.00);
      tracker.addTokens(1000, 500);

      tracker.reset();

      const report = tracker.getReport();
      expect(report.totalCost).toBe(0);
      expect(report.totalInputTokens).toBe(0);
      expect(report.totalOutputTokens).toBe(0);
      expect(report.totalTokens).toBe(0);
      expect(report.requestCount).toBe(0);
    });

    await t.step("should allow new tracking after reset", () => {
      const tracker = CostTracker.getInstance();
      tracker.reset();

      tracker.addCost(5.00);
      tracker.reset();
      tracker.addCost(2.50);

      const report = tracker.getReport();
      expect(report.totalCost).toBe(2.50);
      expect(report.requestCount).toBe(1);
    });
  });

  await t.step("integration scenarios", async (t) => {
    await t.step("should handle complex usage scenario", () => {
      const tracker = CostTracker.getInstance();
      tracker.reset();

      // Simulate multiple LLM requests
      tracker.addCost(0.036); // GPT-4 call
      tracker.addTokens(100, 50);

      tracker.addCost(0.018); // GPT-3.5 call
      tracker.addTokens(80, 30);

      tracker.addCost(0.036); // Another GPT-4 call
      tracker.addTokens(120, 60);

      const report = tracker.getReport();

      expect(report.totalCost).toBe(0.09);
      expect(report.totalInputTokens).toBe(300);
      expect(report.totalOutputTokens).toBe(140);
      expect(report.totalTokens).toBe(440);
      expect(report.requestCount).toBe(3);
    });
  });
});
