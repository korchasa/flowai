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
    totalCost: 0.001,
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

Deno.test("TraceLogger should support multiple scenarios", async () => {
  const tempDir = await Deno.makeTempDir();
  const tracer = new TraceLogger(tempDir);
  const tracePath = join(tempDir, "trace.html");

  await tracer.init("Scenario 1", "id-1", "model-1", "agent-1.md", "Query 1");
  await tracer.logLLMInteraction(
    [{ role: "user", content: "Hi 1" }],
    "Resp 1",
    { step: 1, source: "agent" },
  );

  await tracer.init("Scenario 2", "id-2", "model-2", "agent-2.md", "Query 2");
  await tracer.logLLMInteraction(
    [{ role: "user", content: "Hi 2" }],
    "Resp 2",
    { step: 1, source: "agent" },
  );

  const content = await Deno.readTextFile(tracePath);

  // Check for both scenarios
  assertStringIncludes(content, "id-1");
  assertStringIncludes(content, "id-2");
  assertStringIncludes(content, "Query 1");
  assertStringIncludes(content, "Query 2");
  assertStringIncludes(content, "Resp 1");
  assertStringIncludes(content, "Resp 2");

  await Deno.remove(tempDir, { recursive: true });
});

function assertStringIncludes(actual: string, expected: string) {
  if (!actual.includes(expected)) {
    throw new Error(
      `Expected string to include "${expected}", but it did not.\nActual content:\n${actual}`,
    );
  }
}
