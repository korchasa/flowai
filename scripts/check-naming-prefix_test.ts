import { assertEquals } from "@std/assert";
import { join } from "@std/path";
import {
  validateAllNamingPrefixes,
  validateNamingPrefix,
} from "./check-naming-prefix.ts";

const RETIRED_PREFIX = "flowai-" + "skill-";
const RETIRED_SOURCE_PREFIX = "flowai-";

// --- validateNamingPrefix ---

Deno.test("validateNamingPrefix: unprefixed skill name passes", () => {
  assertEquals(validateNamingPrefix("fix-tests", "skill"), []);
});

Deno.test("validateNamingPrefix: setup-style skill name passes", () => {
  assertEquals(
    validateNamingPrefix(
      "setup-agent-code-style-deno",
      "skill",
    ),
    [],
  );
});

Deno.test("validateNamingPrefix: unprefixed agent name passes", () => {
  assertEquals(validateNamingPrefix("console-expert", "agent"), []);
});

Deno.test("validateNamingPrefix: hook name passes", () => {
  assertEquals(validateNamingPrefix("test-hook", "hook"), []);
});

Deno.test("validateNamingPrefix: prefixed skill is error (NP-1)", () => {
  const errors = validateNamingPrefix(
    `${RETIRED_SOURCE_PREFIX}fix-tests`,
    "skill",
  );
  assertEquals(errors.length, 1);
  assertEquals(errors[0].criterion, "NP-1");
  assertEquals(errors[0].message.includes("flowai-"), true);
});

Deno.test("validateNamingPrefix: prefixed agent is error (NP-1)", () => {
  const errors = validateNamingPrefix(
    `${RETIRED_SOURCE_PREFIX}console-expert`,
    "agent",
  );
  assertEquals(errors.length, 1);
  assertEquals(errors[0].criterion, "NP-1");
});

Deno.test("validateNamingPrefix: empty name is error", () => {
  const errors = validateNamingPrefix("", "skill");
  assertEquals(errors.length, 1);
});

// --- NP-3: skill prefix convention ---

Deno.test("validateNamingPrefix: skill with retired skill-name prefix is error (NP-3)", () => {
  const errors = validateNamingPrefix(`${RETIRED_PREFIX}foo`, "skill");
  assertEquals(errors.length, 1);
  assertEquals(errors[0].criterion, "NP-3");
});

// --- NP-5: owning pack prefix convention ---

Deno.test("validateNamingPrefix: skill with owning pack prefix is error (NP-5)", () => {
  const errors = validateNamingPrefix("memex-" + "save", "skill", "memex");
  assertEquals(errors.length, 1);
  assertEquals(errors[0].criterion, "NP-5");
});

Deno.test("validateNamingPrefix: skill with owning pack alias segment is error (NP-5)", () => {
  const errors = validateNamingPrefix(
    "setup-agent-code-style-ts-deno",
    "skill",
    "typescript",
  );
  assertEquals(errors.length, 1);
  assertEquals(errors[0].criterion, "NP-5");
});

Deno.test("validateNamingPrefix: agent with owning pack prefix is error (NP-5)", () => {
  const errors = validateNamingPrefix(
    "devtools-" + "subagent",
    "agent",
    "devtools",
  );
  assertEquals(errors.length, 1);
  assertEquals(errors[0].criterion, "NP-5");
});

Deno.test("validateNamingPrefix: hook with owning pack prefix is error (NP-5)", () => {
  const errors = validateNamingPrefix("memex-status", "hook", "memex");
  assertEquals(errors.length, 1);
  assertEquals(errors[0].criterion, "NP-5");
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
  assertEquals(errors, []);
});

Deno.test("validateAllNamingPrefixes: non-existent dir returns empty", async () => {
  const errors = await validateAllNamingPrefixes(
    "/tmp/non-existent-fw-dir-99999",
  );
  assertEquals(errors, []);
});

Deno.test("validateAllNamingPrefixes: skill name duplicated across packs is error (NP-4)", async () => {
  const tmp = await Deno.makeTempDir();
  try {
    const fw = join(tmp, "framework");
    await Deno.mkdir(join(fw, "engineering", "skills", "review"), {
      recursive: true,
    });
    await Deno.mkdir(join(fw, "core", "skills", "review"), {
      recursive: true,
    });
    const errors = await validateAllNamingPrefixes(fw);
    assertEquals(errors.length, 1);
    assertEquals(errors[0].criterion, "NP-4");
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});
