import { assertEquals } from "@std/assert";
import {
  ALLOWED_SUBDIRS,
  parseFrontmatter,
  validateFrontmatter,
  validateProgressiveDisclosure,
  validateStructure,
} from "./check-skills.ts";

// --- parseFrontmatter ---

Deno.test("parseFrontmatter extracts valid YAML", () => {
  const content = `---
name: my-skill
description: A test skill
---
# Body`;
  const result = parseFrontmatter(content);
  assertEquals(result !== null, true);
  assertEquals(result!.data.name, "my-skill");
  assertEquals(result!.data.description, "A test skill");
});

Deno.test("parseFrontmatter returns null for missing frontmatter", () => {
  assertEquals(parseFrontmatter("# No frontmatter"), null);
});

// --- validateStructure (FR-21.1.1) ---

Deno.test("FR-21.1.1: valid structure passes", () => {
  const entries = [
    { name: "SKILL.md", isDirectory: false, isFile: true },
    { name: "scripts", isDirectory: true, isFile: false },
    { name: "references", isDirectory: true, isFile: false },
    { name: "assets", isDirectory: true, isFile: false },
    { name: "evals", isDirectory: true, isFile: false },
  ];
  assertEquals(validateStructure("my-skill", entries), []);
});

Deno.test("FR-21.1.1: SKILL.md only is valid", () => {
  const entries = [{ name: "SKILL.md", isDirectory: false, isFile: true }];
  assertEquals(validateStructure("my-skill", entries), []);
});

Deno.test("FR-21.1.1: missing SKILL.md is error", () => {
  const entries = [{ name: "scripts", isDirectory: true, isFile: false }];
  const errors = validateStructure("my-skill", entries);
  assertEquals(errors.length, 1);
  assertEquals(errors[0].criterion, "FR-21.1.1");
  assertEquals(errors[0].message, "Missing SKILL.md");
});

Deno.test("FR-21.1.1: non-standard file at root is error", () => {
  const entries = [
    { name: "SKILL.md", isDirectory: false, isFile: true },
    { name: "README.md", isDirectory: false, isFile: true },
  ];
  const errors = validateStructure("my-skill", entries);
  assertEquals(errors.length, 1);
  assertEquals(
    errors[0].message,
    "Non-standard entry at skill root: README.md",
  );
});

Deno.test("FR-21.1.1: non-standard directory at root is error", () => {
  const entries = [
    { name: "SKILL.md", isDirectory: false, isFile: true },
    { name: "examples", isDirectory: true, isFile: false },
  ];
  const errors = validateStructure("my-skill", entries);
  assertEquals(errors.length, 1);
  assertEquals(
    errors[0].message,
    "Non-standard entry at skill root: examples",
  );
});

// --- validateFrontmatter (FR-21.1.2) ---

Deno.test("FR-21.1.2: valid frontmatter passes", () => {
  const fm = { name: "my-skill", description: "Does things" };
  assertEquals(validateFrontmatter("my-skill", fm), []);
});

Deno.test("FR-21.1.2: name mismatch is error", () => {
  const fm = { name: "other-name", description: "Does things" };
  const errors = validateFrontmatter("my-skill", fm);
  assertEquals(errors.some((e) => e.message.includes("does not match")), true);
});

Deno.test("FR-21.1.2: name with leading hyphen is error", () => {
  const errors = validateFrontmatter("-bad", {
    name: "-bad",
    description: "x",
  });
  assertEquals(errors.some((e) => e.message.includes("charset")), true);
});

Deno.test("FR-21.1.2: name with consecutive hyphens is error", () => {
  const errors = validateFrontmatter("my--skill", {
    name: "my--skill",
    description: "x",
  });
  assertEquals(errors.some((e) => e.message.includes("charset")), true);
});

Deno.test("FR-21.1.2: name exceeding 64 chars is error", () => {
  const longName = "a".repeat(65);
  const errors = validateFrontmatter(longName, {
    name: longName,
    description: "x",
  });
  assertEquals(errors.some((e) => e.message.includes("exceeds 64")), true);
});

Deno.test("FR-21.1.2: description exceeding 1024 chars is error", () => {
  const longDesc = "x".repeat(1025);
  const errors = validateFrontmatter("my-skill", {
    name: "my-skill",
    description: longDesc,
  });
  assertEquals(errors.some((e) => e.message.includes("exceeds 1024")), true);
});

Deno.test("FR-21.1.2: missing description is error", () => {
  const errors = validateFrontmatter("my-skill", { name: "my-skill" });
  assertEquals(
    errors.some((e) => e.message.includes("Missing or empty 'description'")),
    true,
  );
});

Deno.test("FR-21.1.2: description at exactly 1024 chars passes", () => {
  const desc = "x".repeat(1024);
  const errors = validateFrontmatter("my-skill", {
    name: "my-skill",
    description: desc,
  });
  assertEquals(errors.length, 0);
});

// --- validateProgressiveDisclosure (FR-21.1.3) ---

Deno.test("FR-21.1.3: small file passes", () => {
  const content = "line\n".repeat(100);
  const fm = { name: "x", description: "y" };
  assertEquals(validateProgressiveDisclosure("s", content, fm), []);
});

Deno.test("FR-21.1.3: file at 500+ lines is error", () => {
  const content = "x\n".repeat(500);
  const fm = { name: "x", description: "y" };
  const errors = validateProgressiveDisclosure("s", content, fm);
  assertEquals(errors.some((e) => e.message.includes("lines")), true);
});

Deno.test("FR-21.1.3: file exceeding 5000 tokens is error", () => {
  const content = "x".repeat(20001); // 20001 chars / 4 = 5001 tokens
  const fm = { name: "x", description: "y" };
  const errors = validateProgressiveDisclosure("s", content, fm);
  assertEquals(errors.some((e) => e.message.includes("tokens")), true);
});

Deno.test("FR-21.1.3: catalog metadata exceeding 100 tokens is error", () => {
  const content = "short";
  // name(5) + description(396) = 401 chars / 4 = ~101 tokens
  const fm = { name: "skill", description: "x".repeat(396) };
  const errors = validateProgressiveDisclosure("s", content, fm);
  assertEquals(
    errors.some((e) => e.message.includes("Catalog metadata")),
    true,
  );
});

// --- ALLOWED_SUBDIRS ---

Deno.test("ALLOWED_SUBDIRS contains expected entries", () => {
  assertEquals(ALLOWED_SUBDIRS.has("scripts"), true);
  assertEquals(ALLOWED_SUBDIRS.has("references"), true);
  assertEquals(ALLOWED_SUBDIRS.has("assets"), true);
  assertEquals(ALLOWED_SUBDIRS.has("evals"), true);
  assertEquals(ALLOWED_SUBDIRS.has("examples"), false);
  assertEquals(ALLOWED_SUBDIRS.has("reference"), false);
});
