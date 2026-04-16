import { assertEquals } from "@std/assert";
import {
  ALLOWED_SUBDIRS,
  inferKind,
  validateIdeNeutrality,
  validateKindInvariants,
  validatePathResolution,
  validateProgressiveDisclosure,
  validateSkillFrontmatter,
  validateStructure,
} from "./check-skills.ts";
import { parseFrontmatter } from "./resource-types.ts";

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

// --- validateStructure (FR-UNIVERSAL.STRUCT) ---

Deno.test("FR-UNIVERSAL.STRUCT: valid structure passes", () => {
  const entries = [
    { name: "SKILL.md", isDirectory: false, isFile: true },
    { name: "scripts", isDirectory: true, isFile: false },
    { name: "references", isDirectory: true, isFile: false },
    { name: "assets", isDirectory: true, isFile: false },
    { name: "evals", isDirectory: true, isFile: false },
  ];
  assertEquals(validateStructure("my-skill", entries), []);
});

Deno.test("FR-UNIVERSAL.STRUCT: SKILL.md only is valid", () => {
  const entries = [{ name: "SKILL.md", isDirectory: false, isFile: true }];
  assertEquals(validateStructure("my-skill", entries), []);
});

Deno.test("FR-UNIVERSAL.STRUCT: missing SKILL.md is error", () => {
  const entries = [{ name: "scripts", isDirectory: true, isFile: false }];
  const errors = validateStructure("my-skill", entries);
  assertEquals(errors.length, 1);
  assertEquals(errors[0].criterion, "FR-UNIVERSAL.STRUCT");
  assertEquals(errors[0].message, "Missing SKILL.md");
});

Deno.test("FR-UNIVERSAL.STRUCT: non-standard file at root is error", () => {
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

Deno.test("FR-UNIVERSAL.STRUCT: non-standard directory at root is error", () => {
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

// --- validateSkillFrontmatter (FR-UNIVERSAL.FRONTMATTER) ---

Deno.test("FR-UNIVERSAL.FRONTMATTER: valid frontmatter passes", () => {
  const fm = { name: "my-skill", description: "Does things" };
  assertEquals(validateSkillFrontmatter("my-skill", fm), []);
});

Deno.test("FR-UNIVERSAL.FRONTMATTER: name mismatch is error", () => {
  const fm = { name: "other-name", description: "Does things" };
  const errors = validateSkillFrontmatter("my-skill", fm);
  assertEquals(errors.some((e) => e.message.includes("does not match")), true);
});

Deno.test("FR-UNIVERSAL.FRONTMATTER: name with leading hyphen is error", () => {
  const errors = validateSkillFrontmatter("-bad", {
    name: "-bad",
    description: "x",
  });
  assertEquals(
    errors.some((e) => e.message.includes("leading/trailing/consecutive")),
    true,
  );
});

Deno.test("FR-UNIVERSAL.FRONTMATTER: name with consecutive hyphens is error", () => {
  const errors = validateSkillFrontmatter("my--skill", {
    name: "my--skill",
    description: "x",
  });
  assertEquals(
    errors.some((e) => e.message.includes("leading/trailing/consecutive")),
    true,
  );
});

Deno.test("FR-UNIVERSAL.FRONTMATTER: name exceeding 64 chars is error", () => {
  const longName = "a".repeat(65);
  const errors = validateSkillFrontmatter(longName, {
    name: longName,
    description: "x",
  });
  assertEquals(errors.some((e) => e.message.includes("≤64")), true);
});

Deno.test("FR-UNIVERSAL.FRONTMATTER: description exceeding 1024 chars is error", () => {
  const longDesc = "x".repeat(1025);
  const errors = validateSkillFrontmatter("my-skill", {
    name: "my-skill",
    description: longDesc,
  });
  assertEquals(errors.some((e) => e.message.includes("≤1024")), true);
});

Deno.test("FR-UNIVERSAL.FRONTMATTER: missing description is error", () => {
  const errors = validateSkillFrontmatter("my-skill", { name: "my-skill" });
  assertEquals(
    errors.some((e) => e.message.includes("Required")),
    true,
  );
});

Deno.test("FR-UNIVERSAL.FRONTMATTER: description at exactly 1024 chars passes", () => {
  const desc = "x".repeat(1024);
  const errors = validateSkillFrontmatter("my-skill", {
    name: "my-skill",
    description: desc,
  });
  assertEquals(errors.length, 0);
});

Deno.test("FR-UNIVERSAL.FRONTMATTER: unknown field is error", () => {
  const errors = validateSkillFrontmatter("my-skill", {
    name: "my-skill",
    description: "desc",
    unknown: "value",
  });
  assertEquals(
    errors.some((e) => e.message.includes("Unrecognized key")),
    true,
  );
});

Deno.test("FR-UNIVERSAL.FRONTMATTER: valid optional fields pass", () => {
  const errors = validateSkillFrontmatter("my-skill", {
    name: "my-skill",
    description: "desc",
    "disable-model-invocation": true,
    license: "MIT",
  });
  assertEquals(errors, []);
});

// --- validateProgressiveDisclosure (FR-UNIVERSAL.DISCLOSURE) ---

Deno.test("FR-UNIVERSAL.DISCLOSURE: small file passes", () => {
  const content = "line\n".repeat(100);
  const fm = { name: "x", description: "y" };
  assertEquals(validateProgressiveDisclosure("s", content, fm), []);
});

Deno.test("FR-UNIVERSAL.DISCLOSURE: file at 500+ lines is error", () => {
  const content = "x\n".repeat(500);
  const fm = { name: "x", description: "y" };
  const errors = validateProgressiveDisclosure("s", content, fm);
  assertEquals(errors.some((e) => e.message.includes("lines")), true);
});

Deno.test("FR-UNIVERSAL.DISCLOSURE: file exceeding 5000 tokens is error", () => {
  const content = "x".repeat(20001); // 20001 chars / 4 = 5001 tokens
  const fm = { name: "x", description: "y" };
  const errors = validateProgressiveDisclosure("s", content, fm);
  assertEquals(errors.some((e) => e.message.includes("tokens")), true);
});

Deno.test("FR-UNIVERSAL.DISCLOSURE: catalog metadata exceeding 100 tokens is error", () => {
  const content = "short";
  // name(5) + description(396) = 401 chars / 4 = ~101 tokens
  const fm = { name: "skill", description: "x".repeat(396) };
  const errors = validateProgressiveDisclosure("s", content, fm);
  assertEquals(
    errors.some((e) => e.message.includes("Catalog metadata")),
    true,
  );
});

// --- validatePathResolution (FR-UNIVERSAL.XIDE-PATHS) ---

Deno.test("FR-UNIVERSAL.PLACEHOLDERS: content with <this-skill-dir> is error", () => {
  const content = "Run `deno run -A <this-skill-dir>/scripts/validate.ts`";
  const errors = validatePathResolution("my-skill", content);
  assertEquals(errors.length, 1);
  assertEquals(errors[0].criterion, "FR-UNIVERSAL.PLACEHOLDERS");
  assertEquals(
    errors[0].message.includes("<this-skill-dir>"),
    true,
  );
});

Deno.test("FR-UNIVERSAL.IDE-VARS: content with ${CLAUDE_SKILL_DIR} is error", () => {
  const content = "Run `deno run -A ${CLAUDE_SKILL_DIR}/scripts/validate.ts`";
  const errors = validatePathResolution("my-skill", content);
  assertEquals(errors.length, 1);
  assertEquals(errors[0].criterion, "FR-UNIVERSAL.IDE-VARS");
});

Deno.test("FR-UNIVERSAL.IDE-VARS: content with ${CURSOR_SKILL_DIR} is error", () => {
  const content = "Run `${CURSOR_SKILL_DIR}/scripts/run.sh`";
  const errors = validatePathResolution("my-skill", content);
  assertEquals(errors.length, 1);
  assertEquals(errors[0].criterion, "FR-UNIVERSAL.IDE-VARS");
});

Deno.test("FR-UNIVERSAL.IDE-VARS: content with ${SKILL_DIR} is error", () => {
  const content = "Run `${SKILL_DIR}/scripts/run.sh`";
  const errors = validatePathResolution("my-skill", content);
  assertEquals(errors.length, 1);
  assertEquals(errors[0].criterion, "FR-UNIVERSAL.IDE-VARS");
});

Deno.test("FR-UNIVERSAL.REL-PATHS: content with relative paths passes", () => {
  const content = "Run `deno run -A scripts/validate.ts path/to/dir`";
  const errors = validatePathResolution("my-skill", content);
  assertEquals(errors, []);
});

Deno.test("FR-UNIVERSAL.XIDE-PATHS: content with no script references passes", () => {
  const content = "# My Skill\n\nThis skill does things.";
  const errors = validatePathResolution("my-skill", content);
  assertEquals(errors, []);
});

Deno.test("FR-UNIVERSAL.XIDE-PATHS: multiple violations reported separately", () => {
  const content = [
    "Run `<this-skill-dir>/scripts/a.ts`",
    "Also `${CLAUDE_SKILL_DIR}/scripts/b.ts`",
  ].join("\n");
  const errors = validatePathResolution("my-skill", content);
  assertEquals(errors.length, 2);
  assertEquals(errors[0].criterion, "FR-UNIVERSAL.PLACEHOLDERS");
  assertEquals(errors[1].criterion, "FR-UNIVERSAL.IDE-VARS");
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

// --- inferKind ---

Deno.test("inferKind: commands/ directory → command", () => {
  assertEquals(inferKind("framework/core/commands"), "command");
  assertEquals(inferKind("/abs/framework/core/commands"), "command");
});

Deno.test("inferKind: skills/ directory → skill", () => {
  assertEquals(inferKind("framework/core/skills"), "skill");
  assertEquals(inferKind("/abs/framework/engineering/skills"), "skill");
});

// --- validateKindInvariants (FR-PACKS.{CMD,SKILL}-INVARIANT) ---

Deno.test("validateKindInvariants: command without flag passes", () => {
  const errors = validateKindInvariants("flowai-commit", "command", {
    name: "flowai-commit",
    description: "x",
  });
  assertEquals(errors, []);
});

Deno.test("validateKindInvariants: command WITH flag fails", () => {
  const errors = validateKindInvariants("flowai-commit", "command", {
    name: "flowai-commit",
    description: "x",
    "disable-model-invocation": true,
  });
  assertEquals(errors.length, 1);
  assertEquals(errors[0].criterion, "FR-PACKS.CMD-INVARIANT");
});

Deno.test("validateKindInvariants: skill without flag passes", () => {
  const errors = validateKindInvariants("flowai-skill-foo", "skill", {
    name: "flowai-skill-foo",
    description: "y",
  });
  assertEquals(errors, []);
});

Deno.test("validateKindInvariants: skill WITH flag fails", () => {
  const errors = validateKindInvariants("flowai-skill-bar", "skill", {
    name: "flowai-skill-bar",
    description: "y",
    "disable-model-invocation": true,
  });
  assertEquals(errors.length, 1);
  assertEquals(errors[0].criterion, "FR-PACKS.SKILL-INVARIANT");
});

// --- validateIdeNeutrality (FR-UNIVERSAL.IDE-NEUTRAL) ---

Deno.test("validateIdeNeutrality: generic body passes", () => {
  const body = `---
name: foo
description: bar
---

# Body

Use model tiers like max/smart/fast/cheap and let flowai resolve per IDE.
`;
  assertEquals(validateIdeNeutrality("foo", body), []);
});

Deno.test("validateIdeNeutrality: gpt-5 in body fails", () => {
  const body = `---
name: foo
description: bar
---

Run with gpt-5.4 model.
`;
  const errors = validateIdeNeutrality("foo", body);
  assertEquals(errors.length, 1);
  assertEquals(errors[0].criterion, "FR-UNIVERSAL.IDE-NEUTRAL");
});

Deno.test("validateIdeNeutrality: claude-opus-4 in body fails", () => {
  const body = `---
name: foo
description: bar
---

Configure claude-opus-4-6 as the default.
`;
  const errors = validateIdeNeutrality("foo", body);
  assertEquals(errors.length, 1);
});

Deno.test("validateIdeNeutrality: frontmatter-only model tier is allowed", () => {
  // Abstract tier `smart` in frontmatter must NOT trigger. Body is clean.
  const body = `---
name: foo
description: bar
model: smart
---

Call the configured model.
`;
  assertEquals(validateIdeNeutrality("foo", body), []);
});

// --- FR-PACKS.SCOPE: scope frontmatter field ---

Deno.test("validateScopeField: scope absent is valid (both modes)", () => {
  const errors = validateSkillFrontmatter("foo", {
    name: "foo",
    description: "bar",
  });
  assertEquals(errors, []);
});

Deno.test("validateScopeField: scope: project-only is valid", () => {
  const errors = validateSkillFrontmatter("foo", {
    name: "foo",
    description: "bar",
    scope: "project-only",
  });
  assertEquals(errors, []);
});

Deno.test("validateScopeField: scope: global-only is valid", () => {
  const errors = validateSkillFrontmatter("foo", {
    name: "foo",
    description: "bar",
    scope: "global-only",
  });
  assertEquals(errors, []);
});

Deno.test("validateScopeField: invalid scope value is rejected", () => {
  const errors = validateSkillFrontmatter("foo", {
    name: "foo",
    description: "bar",
    scope: "both",
  });
  assertEquals(errors.length > 0, true);
  assertEquals(
    errors.some((e) => e.criterion === "FR-UNIVERSAL.FRONTMATTER"),
    true,
  );
});
