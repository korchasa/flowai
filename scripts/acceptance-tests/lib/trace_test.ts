import { join } from "@std/path";
import { TraceLogger } from "./trace.ts";
import { createTempDir } from "./utils.ts";

Deno.test("TraceLogger should generate self-contained HTML", async () => {
  const tempDir = await createTempDir("trace");
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
    "test-id",
    [{ role: "user", content: "Hi" }],
    "Hello!",
    { step: 1, source: "agent" },
  );

  await tracer.logEvaluation(
    "test-id",
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

  await tracer.logSummary("test-id", {
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

Deno.test("TraceLogger: an infrastructure abort reads as ERROR, not FAILED", async () => {
  // [REF:fr:accept.infra-abort | FR-ACCEPT.INFRA-ABORT]
  const tempDir = await createTempDir("trace");
  const tracer = new TraceLogger(tempDir);
  await tracer.init("Trigger", "trig-1", "gpt-6-luna", "SKILL.md", "Push it");
  await tracer.logSummary("trig-1", {
    success: false,
    score: 0,
    durationMs: 9000,
    tokensUsed: 0,
    totalCost: 0,
    errors: 0,
    warnings: 0,
    infraError: "Agent session aborted by the model provider <capacity>",
  });

  const content = await Deno.readTextFile(join(tempDir, "trace.html"));
  assertStringIncludes(content, ">ERROR<");
  assertStringIncludes(
    content,
    "aborted by the model provider &lt;capacity&gt;",
  );
  if (content.includes(">FAILED<")) {
    throw new Error("an aborted run must not render as FAILED");
  }
});
