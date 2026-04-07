/**
 * Structured logging module.
 * Provides multi-level logging with context support and YAML-friendly output.
 *
 * @module
 */

/**
 * Supported log levels.
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Log level numeric values for comparison.
 */
const LOG_LEVELS: Readonly<Record<LogLevel, number>> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function isLogLevel(value: string): value is LogLevel {
  return value in LOG_LEVELS;
}

/**
 * Standard logger implementation with support for context and log levels.
 */
export class Logger {
  private readonly context: string;
  private readonly logLevel: LogLevel;

  constructor({ context, logLevel = "debug" }: Readonly<{ context: string; logLevel?: LogLevel }>) {
    this.context = context;
    this.logLevel = logLevel;
  }

  /**
   * Logs a debug message.
   *
   * @param message - The message to log.
   * @param meta - Optional metadata to include in the log.
   */
  debug(message: string, meta?: unknown): void {
    if (this.shouldLog("debug")) {
      console.debug(this.formatMessage("debug", message, meta));
    }
  }

  /**
   * Logs an info message.
   *
   * @param message - The message to log.
   * @param meta - Optional metadata to include in the log.
   */
  info(message: string, meta?: unknown): void {
    if (this.shouldLog("info")) {
      console.info(this.formatMessage("info", message, meta));
    }
  }

  /**
   * Logs a warning message.
   */
  warn(message: string, meta?: unknown): void {
    if (this.shouldLog("warn")) {
      console.warn(this.formatMessage("warn", message, meta));
    }
  }

  /**
   * Alias for warn.
   */
  warning(message: string, meta?: unknown): void {
    this.warn(message, meta);
  }

  /**
   * Logs an error message.
   *
   * @param message - The message to log.
   * @param error - Optional error object or metadata.
   */
  error(message: string, error?: unknown): void {
    if (this.shouldLog("error")) {
      console.error(this.formatMessage("error", message), error);
    }
  }

  /**
   * Checks if a message with given level should be logged.
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.logLevel];
  }

  /**
   * Formats the log message with timestamp, level, and context.
   */
  private formatMessage(level: LogLevel, message: string, meta?: unknown): string {
    const timestamp = new Date().toISOString();
    let metaString = "";

    if (meta) {
      // Handle Error objects specially since JSON.stringify(Error) returns {}
      if (meta instanceof Error) {
        metaString = `\n${
          JSON.stringify(
            {
              message: meta.message,
              stack: meta.stack,
              name: meta.name,
            },
            null,
            2,
          )
        }`;
      } else {
        metaString = `\n${JSON.stringify(meta, null, 2)}`;
      }
    }

    return `[${timestamp}] [${level.toUpperCase()}] [${this.context}] ${message}${metaString}`;
  }
}

const defaultLogger = new Logger({ context: "default" });

/**
 * Simple global log function for common use cases.
 */
export function log(meta: Readonly<Record<string, unknown>>): void {
  const { mod, event, ...rest } = meta;
  const message = `[${mod}] ${event}`;
  defaultLogger.info(message, rest);
}

/**
 * Creates a Logger from a string log level with fallback and warning.
 */
export function createContextFromLevelString(
  { context, level }: Readonly<{ context: string; level: string }>
): Logger {
  const resolvedLevel = isLogLevel(level) ? level : "debug";

  if (resolvedLevel !== level) {
    const warnLogger = new Logger({ context, logLevel: "debug" });
    warnLogger.warn(`Unknown log level "${level}", falling back to "debug".`);
  }

  return new Logger({ context, logLevel: resolvedLevel });
}
