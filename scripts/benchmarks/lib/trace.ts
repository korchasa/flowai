/**
 * trace.ts — Facade for benchmark trace system.
 *
 * Delegates data collection to TraceCollector and HTML rendering to
 * renderTraceReport. Preserves the original TraceLogger public API
 * for backward compatibility with runner.ts and task-bench.ts.
 */
import { join } from "@std/path";
import { TraceCollector } from "./trace-collector.ts";
import { renderTraceReport } from "./trace-renderer.ts";
import type { TraceSource } from "./trace-types.ts";

export type {
  ScenarioMetadata,
  TraceEvent,
  TraceSource,
} from "./trace-types.ts";

export class TraceLogger {
  private collector = new TraceCollector();
  private tracePath: string;

  constructor(workDir: string, filename = "trace.html") {
    this.tracePath = join(workDir, filename);
  }

  private async save() {
    if (!this.collector.hasScenarios()) return;
    const groups = this.collector.computeGroups();
    const html = renderTraceReport(
      this.collector.getScenarios(),
      this.collector.getEvents(),
      groups,
    );
    await Deno.writeTextFile(this.tracePath, html);
  }

  async init(
    scenarioName: string,
    scenarioId: string,
    model: string,
    agentPath: string,
    userQuery: string,
    scenarioGroup?: string,
  ) {
    this.collector.init(
      scenarioName,
      scenarioId,
      model,
      agentPath,
      userQuery,
      scenarioGroup,
    );
    await this.save();
  }

  async logLLMInteraction(
    scenarioId: string,
    messages: { role: string; content: string }[],
    response: string,
    context: { step: number; source: TraceSource; model?: string },
  ) {
    this.collector.logLLMInteraction(scenarioId, messages, response, context);
    await this.save();
  }

  async logExecutionSection() {
    // No-op in HTML version
  }

  async logCommand(
    scenarioId: string,
    command: string,
    exitCode: number,
    stdout: string,
    stderr: string,
    context?: { step: number; script?: string },
  ) {
    this.collector.logCommand(
      scenarioId,
      command,
      exitCode,
      stdout,
      stderr,
      context,
    );
    await this.save();
  }

  async logEvidence(scenarioId: string, gitStatus: string, gitLog: string) {
    this.collector.logEvidence(scenarioId, gitStatus, gitLog);
    await this.save();
  }

  async logEvaluation(
    scenarioId: string,
    checklistResults: Record<string, { pass: boolean; reason?: string }>,
    checklist: { id: string; description: string; critical: boolean }[],
    judgeInteraction?: {
      messages: { role: string; content: string }[];
      response: string;
      model?: string;
    },
  ) {
    this.collector.logEvaluation(
      scenarioId,
      checklistResults,
      checklist,
      judgeInteraction,
    );
    await this.save();
  }

  async logSummary(
    scenarioId: string,
    result: {
      success: boolean;
      score: number;
      durationMs: number;
      tokensUsed: number;
      totalCost: number;
      errors: number;
      warnings: number;
    },
  ) {
    this.collector.logSummary(scenarioId, result);
    await this.save();
  }

  async logTools(scenarioId: string, toolsDescription: string) {
    this.collector.logTools(scenarioId, toolsDescription);
    await this.save();
  }
}
