import { assertEquals } from "@std/assert";
import {
  validateAllNamingPrefixes,
  validateNamingPrefix,
} from "./check-naming-prefix.ts";

const PREFIX = "flowai-";

// --- validateNamingPrefix ---

Deno.test("validateNamingPrefix: skill name flowai-skill-* passes", () => {
  assertEquals(validateNamingPrefix("flowai-skill-fix-tests", "skill"), []);
});

Deno.test("validateNamingPrefix: command name flowai-* passes", () => {
  assertEquals(validateNamingPrefix("flowai-commit", "command"), []);
});

Deno.test("validateNamingPrefix: command name flowai-setup-* passes", () => {
  assertEquals(
    validateNamingPrefix("flowai-setup-agent-code-style-ts-deno", "command"),
    [],
  );
});

Deno.test("validateNamingPrefix: agent name flowai-* passes", () => {
  assertEquals(validateNamingPrefix("flowai-console-expert", "agent"), []);
});

Deno.test("validateNamingPrefix: hook name flowai-* passes", () => {
  assertEquals(validateNamingPrefix("flowai-test-hook", "hook"), []);
});

Deno.test("validateNamingPrefix: skill without prefix is error (NP-1)", () => {
  const errors = validateNamingPrefix("my-custom-skill", "skill");
  assertEquals(errors.length, 1);
  assertEquals(errors[0].criterion, "NP-1");
  assertEquals(errors[0].message.includes(PREFIX), true);
});

Deno.test("validateNamingPrefix: agent without prefix is error (NP-1)", () => {
  const errors = validateNamingPrefix("my-custom-agent", "agent");
  assertEquals(errors.length, 1);
  assertEquals(errors[0].criterion, "NP-1");
});

Deno.test("validateNamingPrefix: hook without prefix is error (NP-1)", () => {
  const errors = validateNamingPrefix("my-custom-hook", "hook");
  assertEquals(errors.length, 1);
  assertEquals(errors[0].criterion, "NP-1");
});

Deno.test("validateNamingPrefix: empty name is error", () => {
  const errors = validateNamingPrefix("", "skill");
  assertEquals(errors.length, 1);
});

// --- NP-2: command prefix convention ---

Deno.test("validateNamingPrefix: command with flowai-skill-* prefix is error (NP-2)", () => {
  // This name pattern belongs under skills/, not commands/.
  const errors = validateNamingPrefix("flowai-skill-foo", "command");
  assertEquals(errors.length, 1);
  assertEquals(errors[0].criterion, "NP-2");
});

// --- NP-3: skill prefix convention ---

Deno.test("validateNamingPrefix: skill with bare flowai-* prefix is error (NP-3)", () => {
  // "flowai-commit" shape is a command, not a skill.
  const errors = validateNamingPrefix("flowai-commit", "skill");
  assertEquals(errors.length, 1);
  assertEquals(errors[0].criterion, "NP-3");
});

Deno.test("validateNamingPrefix: skill with flowai-setup-* prefix is error (NP-3)", () => {
  const errors = validateNamingPrefix("flowai-setup-foo", "skill");
  assertEquals(errors.length, 1);
  assertEquals(errors[0].criterion, "NP-3");
});

// --- validateAllNamingPrefixes (integration with real framework/) ---

Deno.test("validateAllNamingPrefixes: discovers primitives from framework/", async () => {
  const errors = await validateAllNamingPrefixes("framework");
  // Every error must have required fields
  for (const e of errors) {
    assertEquals(typeof e.name, "string");
    assertEquals(typeof e.kind, "string");
    assertEquals(typeof e.criterion, "string");
    assertEquals(typeof e.message, "string");
  }
  // All reported names must NOT start with flowai-
  for (const e of errors) {
    assertEquals(
      e.name.startsWith(PREFIX),
      false,
      `False positive: ${e.name} starts with ${PREFIX} but was reported as error`,
    );
  }
});

Deno.test("validateAllNamingPrefixes: non-existent dir returns empty", async () => {
  const errors = await validateAllNamingPrefixes(
    "/tmp/non-existent-fw-dir-99999",
  );
  assertEquals(errors, []);
});
