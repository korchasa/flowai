import { assertEquals } from "@std/assert";
import {
  validateAllNamingPrefixes,
  validateNamingPrefix,
} from "./check-naming-prefix.ts";

const PREFIX = "flowai-";

// --- validateNamingPrefix ---

Deno.test("validateNamingPrefix: name with flowai- prefix passes", () => {
  assertEquals(validateNamingPrefix("flowai-commit", "skill"), []);
});

Deno.test("validateNamingPrefix: skill name flowai-skill-* passes", () => {
  assertEquals(validateNamingPrefix("flowai-skill-fix-tests", "skill"), []);
});

Deno.test("validateNamingPrefix: agent name flowai-* passes", () => {
  assertEquals(validateNamingPrefix("flowai-console-expert", "agent"), []);
});

Deno.test("validateNamingPrefix: hook name flowai-* passes", () => {
  assertEquals(validateNamingPrefix("flowai-lint-on-write", "hook"), []);
});

Deno.test("validateNamingPrefix: skill without prefix is error", () => {
  const errors = validateNamingPrefix("my-custom-skill", "skill");
  assertEquals(errors.length, 1);
  assertEquals(errors[0].criterion, "NP-1");
  assertEquals(errors[0].message.includes(PREFIX), true);
});

Deno.test("validateNamingPrefix: agent without prefix is error", () => {
  const errors = validateNamingPrefix("my-custom-agent", "agent");
  assertEquals(errors.length, 1);
  assertEquals(errors[0].criterion, "NP-1");
});

Deno.test("validateNamingPrefix: hook without prefix is error", () => {
  const errors = validateNamingPrefix("my-custom-hook", "hook");
  assertEquals(errors.length, 1);
  assertEquals(errors[0].criterion, "NP-1");
});

Deno.test("validateNamingPrefix: empty name is error", () => {
  const errors = validateNamingPrefix("", "skill");
  assertEquals(errors.length, 1);
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
