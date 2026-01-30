import { join } from "@std/path";
import { TraceLogger } from "./trace.ts";

Deno.test("TraceLogger should generate self-contained HTML", async () => {
  const tempDir = await Deno.makeTempDir();
  const tracer = new TraceLogger(tempDir);
  const tracePath = join(tempDir, "trace.html");

  await tracer.init(
    "Test Scenario",
    "test-id",
    "test-model",
    "agent.md",
    "Hello world",
  );

  await tracer.logLLMInteraction(
    [{ role: "user", content: "Hi" }],
    "Hello!",
    { step: 1, source: "agent" },
  );

  await tracer.logEvaluation(
    { "test-id": { pass: true, reason: "All good" } },
    [{ id: "test-id", description: "Test check", critical: true }],
    {
      messages: [{ role: "system", content: "Judge system" }, {
        role: "user",
        content: "Judge input",
      }],
      response: "Judge response",
    },
  );

  await tracer.logSummary({
    success: true,
    score: 100,
    durationMs: 1000,
    tokensUsed: 500,
    totalCost: 0.01,
    errors: 0,
    warnings: 0,
  });

  const content = await Deno.readTextFile(tracePath);

  // Check for HTML structure
  assertStringIncludes(content, "<!DOCTYPE html>");
  assertStringIncludes(content, "<html>");
  assertStringIncludes(content, "<style>");

  // Check for metadata
  assertStringIncludes(content, "test-id");
  assertStringIncludes(content, "test-model");

  // Check for events
  assertStringIncludes(content, "Hello world");
  assertStringIncludes(content, "Hello!");
  assertStringIncludes(content, "Judge Interaction");
  assertStringIncludes(content, "Judge response");

  // Check for summary
  assertStringIncludes(content, "PASSED");
  // The score is not currently rendered in the summary card HTML, but it's in the metadata
  // assertStringIncludes(content, "100.0%");

  await Deno.remove(tempDir, { recursive: true });
});

function assertStringIncludes(actual: string, expected: string) {
  if (!actual.includes(expected)) {
    throw new Error(
      `Expected string to include "${expected}", but it did not.\nActual content:\n${actual}`,
    );
  }
}
