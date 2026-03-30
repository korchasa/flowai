import { assertEquals } from "@std/assert";
import { isAutomationAgent, validateSections } from "./run.ts";

Deno.test("isAutomationAgent: matches framework automation agents", () => {
  assertEquals(
    isAutomationAgent("framework/automation/agents/agent-pm.md"),
    true,
  );
  assertEquals(
    isAutomationAgent("framework/automation/agents/agent-qa.md"),
    true,
  );
});

Deno.test("isAutomationAgent: matches installed agents", () => {
  assertEquals(isAutomationAgent(".claude/agents/agent-pm.md"), true);
  assertEquals(
    isAutomationAgent(".claude/agents/agent-developer.md"),
    true,
  );
});

Deno.test("isAutomationAgent: rejects non-automation agents", () => {
  assertEquals(
    isAutomationAgent("framework/core/agents/flowai-console-expert.md"),
    false,
  );
  assertEquals(isAutomationAgent("shared-rules.md"), false);
  assertEquals(isAutomationAgent(""), false);
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
