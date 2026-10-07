/**
 * trace-types.ts — Shared types and utilities for the trace subsystem.
 */

export type TraceSource = "agent" | "judge" | "user_emulation" | "system";

export interface TraceEvent {
  type: string;
  timestamp: string;
  metadata: Record<string, unknown>;
  content: string;
  scenarioId: string;
}

export interface ScenarioMetadata {
  name: string;
  id: string;
  model: string;
  agentPath: string;
  userQuery: string;
  date: string;
  scenarioGroup?: string; // Base scenario id (without /run-N), for multi-run grouping
  runIndex?: number;
  summary?: {
    success: boolean;
    score: number;
    durationMs: number;
    tokensUsed: number;
    totalCost: number;
    errors: number;
    warnings: number;
    /** Set on a run the harness could not measure (FR-ACCEPT.INFRA-ABORT). */
    infraError?: string;
  };
}

/** Aggregated stats for a group of scenario runs (single or multi-run). */
export interface ScenarioGroupStats {
  groupId: string;
  name: string;
  runs: ScenarioMetadata[];
  passRate: number;
  avgScore: number;
  avgDurationMs: number;
  totalTokens: number;
  totalCost: number;
  totalErrors: number;
  totalWarnings: number;
  allPassed: boolean;
}

/** HTML-escapes a string for safe embedding in HTML content. */
/**
 * Status word of one run. An infrastructure abort is ERROR: it says nothing
 * about the primitive, so it must not read as FAILED
 * ([REF:fr:accept.infra-abort | FR-ACCEPT.INFRA-ABORT]).
 */
export function summaryStatus(
  summary: { success: boolean; infraError?: string },
): "PASSED" | "FAILED" | "ERROR" {
  if (summary.infraError) return "ERROR";
  return summary.success ? "PASSED" : "FAILED";
}

export function escape(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
