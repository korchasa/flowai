/**
 * Cost tracking module for LLM usage.
 * Monitors token consumption and estimated costs across the application.
 *
 * @module
 */

import { Logger } from "../logger/logger.ts";

/**
 * Structure of the cost report.
 */
export interface CostReport {
  readonly totalCost: number;
  readonly totalInputTokens: number;
  readonly totalOutputTokens: number;
  readonly totalTokens: number;
  readonly requestCount: number;
}

/**
 * Tracks LLM usage costs and token counts.
 */
export class CostTracker {
  private static instance: CostTracker | null = null;
  private readonly logger: Logger;
  private totalCost: number = 0;
  private totalInputTokens: number = 0;
  private totalOutputTokens: number = 0;
  private requestCount: number = 0;

  private constructor() {
    this.logger = new Logger({ context: "CostTracker" });
  }

  /**
   * Returns the singleton instance of CostTracker.
   */
  static getInstance(): CostTracker {
    if (!CostTracker.instance) {
      CostTracker.instance = new CostTracker();
    }
    return CostTracker.instance;
  }

  /**
   * Adds cost to the total and increments request count.
   *
   * @param cost - The cost amount to add (usually in USD).
   *
   * @example
   * ```ts
   * tracker.addCost(0.002);
   * ```
   */
  addCost(cost: number): void {
    this.totalCost += cost;
    this.requestCount += 1;
    this.logger.debug(`Added cost: $${cost.toFixed(4)}, Total: $${this.totalCost.toFixed(4)}`);
  }

  /**
   * Adds input and output tokens to the total.
   *
   * @param inputTokens - Number of input (prompt) tokens.
   * @param outputTokens - Number of output (completion) tokens.
   *
   * @example
   * ```ts
   * tracker.addTokens(100, 50);
   * ```
   */
  addTokens(inputTokens: number, outputTokens: number): void {
    this.totalInputTokens += inputTokens;
    this.totalOutputTokens += outputTokens;
    this.logger.debug(`Added tokens: ${inputTokens} input, ${outputTokens} output`);
  }

  /**
   * Returns a detailed cost report.
   */
  getReport(): CostReport {
    return {
      totalCost: this.totalCost,
      totalInputTokens: this.totalInputTokens,
      totalOutputTokens: this.totalOutputTokens,
      totalTokens: this.totalInputTokens + this.totalOutputTokens,
      requestCount: this.requestCount,
    };
  }

  /**
   * Returns a human-readable formatted report.
   */
  getFormattedReport(): string {
    const report = this.getReport();
    return [
      `Total Cost: $${report.totalCost.toFixed(4)}`,
      `Total Tokens: ${report.totalTokens} (${report.totalInputTokens} input, ${report.totalOutputTokens} output)`,
      `Total Requests: ${report.requestCount}`,
    ].join("\n");
  }

  /**
   * Resets all counters.
   */
  reset(): void {
    this.totalCost = 0;
    this.totalInputTokens = 0;
    this.totalOutputTokens = 0;
    this.requestCount = 0;
    this.logger.debug("CostTracker reset");
  }
}
