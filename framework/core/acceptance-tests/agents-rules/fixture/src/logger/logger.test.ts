import { expect } from "@std/expect";
import { Logger, createContextFromLevelString, log } from "./logger.ts";

Deno.test("Logger", async (t) => {
  // Capture console output for testing
  let consoleOutput: string[] = [];
  const originalConsoleDebug = console.debug;
  const originalConsoleInfo = console.info;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;

  const setup = () => {
    consoleOutput = [];
    console.debug = (message: string) => consoleOutput.push(`DEBUG: ${message}`);
    console.info = (message: string) => consoleOutput.push(`INFO: ${message}`);
    console.warn = (message: string) => consoleOutput.push(`WARN: ${message}`);
    console.error = (message: string, ...args: unknown[]) => {
      consoleOutput.push(`ERROR: ${message}`);
      if (args.length > 0) {
        consoleOutput.push(`ERROR_EXTRA: ${JSON.stringify(args)}`);
      }
    };
  };

  const teardown = () => {
    console.debug = originalConsoleDebug;
    console.info = originalConsoleInfo;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  };

  await t.step("constructor", async (t) => {
    await t.step("should create logger with default debug level", () => {
      const logger = new Logger({ context: "test" });
      // deno-lint-ignore no-explicit-any
      expect((logger as any).logLevel).toBe("debug");
      // deno-lint-ignore no-explicit-any
      expect((logger as any).context).toBe("test");
    });

    await t.step("should create logger with specified log level", () => {
      const logger = new Logger({ context: "test", logLevel: "debug" });
      // deno-lint-ignore no-explicit-any
      expect((logger as any).logLevel).toBe("debug");
    });

    await t.step("should accept all valid log levels", () => {
      const levels: Array<"debug" | "info" | "warn" | "error"> = ["debug", "info", "warn", "error"];

      for (const level of levels) {
        const logger = new Logger({ context: "test", logLevel: level });
        // deno-lint-ignore no-explicit-any
        expect((logger as any).logLevel).toBe(level);
      }
    });
  });

  await t.step("debug()", async (t) => {
    await t.step("should log debug message when level is debug", () => {
      setup();
      const logger = new Logger({ context: "test", logLevel: "debug" });
      logger.debug("Test debug message");

      expect(consoleOutput.length).toBe(1);
      expect(consoleOutput[0]).toContain("DEBUG:");
      expect(consoleOutput[0]).toContain("[test]");
      expect(consoleOutput[0]).toContain("Test debug message");
      teardown();
    });

    await t.step("should not log debug message when level is info", () => {
      setup();
      const logger = new Logger({ context: "test", logLevel: "info" });
      logger.debug("Test debug message");

      expect(consoleOutput.length).toBe(0);
      teardown();
    });

    await t.step("should include metadata in debug message", () => {
      setup();
      const logger = new Logger({ context: "test", logLevel: "debug" });
      logger.debug("Test message", { key: "value", number: 42 });

      expect(consoleOutput.length).toBe(1);
      expect(consoleOutput[0]).toContain('"key": "value"');
      expect(consoleOutput[0]).toContain('"number": 42');
      teardown();
    });
  });

  await t.step("info()", async (t) => {
    await t.step("should log info message when level allows it", () => {
      setup();
      const logger = new Logger({ context: "test", logLevel: "info" });
      logger.info("Test info message");

      expect(consoleOutput.length).toBe(1);
      expect(consoleOutput[0]).toContain("INFO:");
      expect(consoleOutput[0]).toContain("[test]");
      expect(consoleOutput[0]).toContain("Test info message");
      teardown();
    });

    await t.step("should not log info when level is warn", () => {
      setup();
      const logger = new Logger({ context: "test", logLevel: "warn" });
      logger.info("Test info message");

      expect(consoleOutput.length).toBe(0);
      teardown();
    });
  });

  await t.step("warn()", async (t) => {
    await t.step("should log warning message when level allows it", () => {
      setup();
      const logger = new Logger({ context: "test", logLevel: "warn" });
      logger.warn("Test warning message");

      expect(consoleOutput.length).toBe(1);
      expect(consoleOutput[0]).toContain("WARN:");
      expect(consoleOutput[0]).toContain("[test]");
      expect(consoleOutput[0]).toContain("Test warning message");
      teardown();
    });

    await t.step("should not log warning when level is error", () => {
      setup();
      const logger = new Logger({ context: "test", logLevel: "error" });
      logger.warn("Test warning message");

      expect(consoleOutput.length).toBe(0);
      teardown();
    });
  });

  await t.step("error()", async (t) => {
    await t.step("should log error message always", () => {
      setup();
      const logger = new Logger({ context: "test", logLevel: "debug" });
      logger.error("Test error message");

      expect(consoleOutput.length >= 1).toBe(true);
      expect(consoleOutput[0]).toContain("ERROR:");
      expect(consoleOutput[0]).toContain("[test]");
      expect(consoleOutput[0]).toContain("Test error message");
      teardown();
    });

    await t.step("should handle Error objects in metadata", () => {
      setup();
      const logger = new Logger({ context: "test", logLevel: "error" });
      const testError = new Error("Test error");
      testError.stack = "Error stack trace";
      testError.name = "TestError";

      logger.error("Error occurred", testError);

      expect(consoleOutput.length >= 1).toBe(true);
      expect(consoleOutput[0]).toContain("ERROR:");
      teardown();
    });
  });

  await t.step("warning() alias", async (t) => {
    await t.step("should be alias for warn()", () => {
      setup();
      const logger = new Logger({ context: "test", logLevel: "warn" });
      logger.warning("Test warning");

      expect(consoleOutput.length).toBe(1);
      expect(consoleOutput[0]).toContain("WARN:");
      expect(consoleOutput[0]).toContain("Test warning");
      teardown();
    });
  });

  await t.step("message formatting", async (t) => {
    await t.step("should include timestamp in ISO format", () => {
      setup();
      const logger = new Logger({ context: "test", logLevel: "info" });
      logger.info("Test message");

      expect(consoleOutput.length).toBe(1);
      const message = consoleOutput[0];
      const timestampMatch = message.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(timestampMatch).toBeTruthy();
      teardown();
    });

    await t.step("should format message as [TIMESTAMP] [LEVEL] [CONTEXT] MESSAGE", () => {
      setup();
      const logger = new Logger({ context: "my-context", logLevel: "info" });
      logger.info("Test message");

      expect(consoleOutput.length).toBe(1);
      const message = consoleOutput[0];

      expect(message).toContain("[my-context]");
      expect(message).toContain("Test message");
      expect(/\[INFO\]/.test(message)).toBe(true);
      teardown();
    });
  });

  await t.step("log levels filtering", async (t) => {
    await t.step("should filter messages based on log level", () => {
      setup();
      const logger = new Logger({ context: "test", logLevel: "warn" });

      logger.debug("Debug message");
      logger.info("Info message");
      logger.warn("Warn message");
      logger.error("Error message");

      expect(consoleOutput.length >= 2).toBe(true);
      const warnMessages = consoleOutput.filter(m => m.includes("WARN:"));
      const errorMessages = consoleOutput.filter(m => m.includes("ERROR:"));
      expect(warnMessages.length >= 1).toBe(true);
      expect(errorMessages.length >= 1).toBe(true);
      teardown();
    });
  });
});

Deno.test("global log function", async (t) => {
  let consoleOutput: string[] = [];
  const originalConsoleInfo = console.info;

  const setup = () => {
    consoleOutput = [];
    console.info = (message: string) => consoleOutput.push(message);
  };

  const teardown = () => {
    console.info = originalConsoleInfo;
  };

  await t.step("should format message with mod and event", () => {
    setup();
    log({
      mod: "test-module",
      event: "test-event",
      extra: "data"
    });

    expect(consoleOutput.length).toBe(1);
    expect(consoleOutput[0]).toContain("[test-module] test-event");
    expect(consoleOutput[0]).toContain('"extra": "data"');
    teardown();
  });
});

Deno.test("createContextFromLevelString", async (t) => {
  let consoleOutput: string[] = [];
  const originalConsoleWarn = console.warn;

  const setup = () => {
    consoleOutput = [];
    console.warn = (message: string) => consoleOutput.push(message);
  };

  const teardown = () => {
    console.warn = originalConsoleWarn;
  };

  await t.step("should create logger with matching level without warning", () => {
    setup();
    const logger = createContextFromLevelString({ context: "test", level: "debug" });
    // deno-lint-ignore no-explicit-any
    expect((logger as any).logLevel).toBe("debug");
    expect(consoleOutput.length).toBe(0);
    teardown();
  });

  await t.step("should warn and fallback to debug on unknown level", () => {
    setup();
    const logger = createContextFromLevelString({ context: "test", level: "verbose" });
    // deno-lint-ignore no-explicit-any
    expect((logger as any).logLevel).toBe("debug");
    expect(consoleOutput.length).toBe(1);
    expect(consoleOutput[0]).toContain('Unknown log level "verbose", falling back to "debug".');
    teardown();
  });
});
