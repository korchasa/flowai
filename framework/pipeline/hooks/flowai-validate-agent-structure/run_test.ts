import { assertEquals } from "@std/assert";
import { isPipelineAgent, validateSections } from "./run.ts";

Deno.test("isPipelineAgent: matches framework pipeline agents", () => {
  assertEquals(
    isPipelineAgent("framework/pipeline/agents/flowai-agent-pm.md"),
    true,
  );
  assertEquals(
    isPipelineAgent("framework/pipeline/agents/flowai-agent-qa.md"),
    true,
  );
});

Deno.test("isPipelineAgent: matches installed agents", () => {
  assertEquals(isPipelineAgent(".claude/agents/flowai-agent-pm.md"), true);
  assertEquals(
    isPipelineAgent(".claude/agents/flowai-agent-developer.md"),
    true,
  );
});

Deno.test("isPipelineAgent: rejects non-pipeline agents", () => {
  assertEquals(
    isPipelineAgent("framework/core/agents/flowai-console-expert.md"),
    false,
  );
  assertEquals(isPipelineAgent("flowai-shared-rules.md"), false);
  assertEquals(isPipelineAgent(""), false);
});

Deno.test("validateSections: all sections present", () => {
  const content = `# Agent
## Permissions
- Bash whitelist: [ls]
## Output Schema
- Format: markdown`;
  const result = validateSections(content);
  assertEquals(result.valid, true);
  assertEquals(result.missing, []);
});

Deno.test("validateSections: missing Permissions", () => {
  const content = `# Agent
## Output Schema
- Format: markdown`;
  const result = validateSections(content);
  assertEquals(result.valid, false);
  assertEquals(result.missing, ["## Permissions"]);
});

Deno.test("validateSections: missing both sections", () => {
  const content = `# Agent\nSome content`;
  const result = validateSections(content);
  assertEquals(result.valid, false);
  assertEquals(result.missing.length, 2);
});
