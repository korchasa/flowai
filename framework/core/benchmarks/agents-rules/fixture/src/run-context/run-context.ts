/**
 * Execution context module.
 * Manages run-specific metadata, debug directories, and artifact persistence.
 *
 * @module
 */

import { join, dirname } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import type { Logger } from "../logger/logger.ts";

const MAX_REVERSE_DATE_MS = Date.UTC(9999, 11, 31, 23, 59, 59, 999);
let lastEpochMs = 0;
let microSequence = 0;

/**
 * Context for a single execution run.
 */
export interface RunContext {
  readonly runId: string;
  readonly debugDir: string;
  readonly logger: Logger;
  readonly startTime: Date;

  /**
   * Saves a debug file within the debug directory.
   */
  saveDebugFile?(params: Readonly<{
    filename: string;
    content: string | unknown;
    stageDir?: string;
  }>): Promise<void>;
}

/**
 * Recursively sanitizes data for serialization, handling Errors, Buffers, and Circular references.
 */
export function safeSanitize(obj: unknown, visited: WeakSet<object> = new WeakSet()): unknown {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (visited.has(obj)) {
    return "[Circular Reference]";
  }

  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: obj.message,
      stack: obj.stack,
      ...(obj as unknown as Record<string, unknown>),
    };
  }

  if (obj && typeof obj === "object" && "constructor" in obj && obj.constructor.name === "Buffer") {
    return `[Buffer: ${(obj as { length?: number }).length} bytes]`;
  }

  visited.add(obj);

  if (Array.isArray(obj)) {
    return obj.map(item => safeSanitize(item, visited));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = safeSanitize(value, visited);
  }
  return sanitized;
}

/**
 * Returns a subdirectory within the debug directory for a specific stage.
 */
export function getSubDebugDir({ ctx, stageDir }: Readonly<{ ctx: RunContext; stageDir: string }>): string {
  return join(ctx.debugDir, stageDir);
}

/**
 * Creates a RunContext with a default reverse-sortable ISO timestamp runId.
 *
 * @param params - Configuration for the run context.
 * @returns A new RunContext instance.
 *
 * @example
 * ```ts
 * const ctx = createRunContext({ logger, debugDir: "./debug" });
 * ```
 */
export function createRunContext(
  { logger, debugDir, runId }: Readonly<{
    logger: Logger;
    debugDir: string;
    runId?: string;
  }>
): RunContext {
  const resolvedRunId = runId ?? createRunId();
  const startTime = new Date();

  const ctx: RunContext = {
    runId: resolvedRunId,
    debugDir,
    logger,
    startTime,
  };

  ctx.saveDebugFile = (params) => saveDebugFile({ ctx, ...params });

  return ctx;
}

/**
 * Default implementation for saving debug files.
 */
export async function saveDebugFile(
  { ctx, filename, content, stageDir }: Readonly<{
    ctx: RunContext;
    filename: string;
    content: string | unknown;
    stageDir?: string;
  }>
): Promise<void> {
  const fullPath = stageDir ? join(ctx.debugDir, stageDir, filename) : join(ctx.debugDir, filename);
  await mkdir(dirname(fullPath), { recursive: true });

  const finalContent = typeof content === "string"
    ? content
    : JSON.stringify(safeSanitize(content), null, 2);

  await writeFile(fullPath, finalContent);
}

function createRunId(): string {
  const epochMs = Date.now();
  if (epochMs === lastEpochMs) {
    microSequence = (microSequence + 1) % 1000;
  } else {
    lastEpochMs = epochMs;
    microSequence = 0;
  }

  const reversedMs = MAX_REVERSE_DATE_MS - epochMs;
  const reversedMicro = 999 - microSequence;
  const iso = new Date(reversedMs).toISOString();
  const micro = String(reversedMicro).padStart(3, "0");

  return iso.replace("Z", `${micro}Z`);
}
