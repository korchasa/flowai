import { assertEquals, assertStringIncludes } from "@std/assert";
import {
  ALLOWED_SUBDIRS,
  collectDocumentationSchemaIndirectionErrors,
  descriptionHasWhenTrigger,
  inferKind,
  isFrameworkSkillsDir,
  validateDescriptionWhenTrigger,
  validateDocumentationSchemaIndirection,
  validateIdeNeutrality,
  validateKindInvariants,
  validatePathResolution,
  validateProgressiveDisclosure,
  validateSkillFrontmatter,
  validateStructure,
} from "./check-skills.ts";
import { parseFrontmatter } from "./resource-types.ts";
import { SKILL_MAX_LINES } from "./lib/skill-limits.ts";

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

Deno.test("FR-UNIVERSAL.STRUCT: generator inputs at root are errors", () => {
  // implements [REF:fr:skill-compose | FR-SKILL-COMPOSE]
  const entries = [
    { name: "SKILL.md", isDirectory: false, isFile: true },
    { name: "_atom.md", isDirectory: false, isFile: true },
    { name: "_composite.md", isDirectory: false, isFile: true },
  ];
  const errors = validateStructure("my-skill", entries);
  assertEquals(errors.map((e) => e.message), [
    "Non-standard entry at skill root: _atom.md",
    "Non-standard entry at skill root: _composite.md",
  ]);
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

Deno.test("FR-UNIVERSAL.DISCLOSURE: file at SKILL_MAX_LINES is error", () => {
  const content = "x\n".repeat(SKILL_MAX_LINES);
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

Deno.test("FR-UNIVERSAL.DISCLOSURE: composite skills are exempt from 5000-token cap", () => {
  const content = "x".repeat(40000); // 10000 tokens — would fail for non-composite
  const fm = { name: "ship", description: "y" };
  const errors = validateProgressiveDisclosure(
    "ship",
    content,
    fm,
  );
  assertEquals(
    errors.some((e) => e.message.includes("tokens")),
    false,
    "composite must not raise the token error",
  );
});

Deno.test("FR-UNIVERSAL.DISCLOSURE: composite skills still hit the SKILL_MAX_LINES cap", () => {
  const content = "x\n".repeat(SKILL_MAX_LINES); // line cap exactly
  const fm = { name: "ship", description: "y" };
  const errors = validateProgressiveDisclosure(
    "ship",
    content,
    fm,
  );
  assertEquals(
    errors.some((e) => e.message.includes("lines")),
    true,
    "composite must still hit the line cap",
  );
});

Deno.test("FR-UNIVERSAL.DISCLOSURE: composite skills still hit the catalog (frontmatter) cap", () => {
  const content = "short";
  const fm = {
    name: "ship",
    description: "x".repeat(500), // > 100 tokens
  };
  const errors = validateProgressiveDisclosure(
    "ship",
    content,
    fm,
  );
  assertEquals(
    errors.some((e) => e.message.includes("Catalog metadata")),
    true,
    "composite must still hit the catalog cap",
  );
});

Deno.test("token_cap_exempts_composites_from_manifest: every composite in framework/composites.yaml is exempt", async () => {
  // implements [REF:fr:skill-compose | FR-SKILL-COMPOSE] — the exemption list is now derived live from the
  // manifest via scripts/lib/composite-list.ts, not a hardcoded TS array.
  const { compositeNames } = await import("./lib/composite-list.ts");
  const content = "x".repeat(40000); // 10000 tokens — would fail without exemption
  for (const name of compositeNames()) {
    const errors = validateProgressiveDisclosure(name, content, {
      name,
      description: "y",
    });
    assertEquals(
      errors.some((e) => e.message.includes("tokens")),
      false,
      `${name} (from manifest) must be exempt from the 5000-token cap`,
    );
  }
});

Deno.test("FR-UNIVERSAL.DISCLOSURE: regular skill (not in composites manifest) still hits the token cap", () => {
  const content = "x".repeat(20001);
  const fm = { name: "regular-skill", description: "y" };
  const errors = validateProgressiveDisclosure(
    "regular-skill",
    content,
    fm,
  );
  assertEquals(
    errors.some((e) => e.message.includes("tokens")),
    true,
    "non-composite must continue to hit the token cap",
  );
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

// --- validateDocumentationSchemaIndirection (FR-UNIVERSAL.DOC-SCHEMA) ---

Deno.test("doc schema indirection: rejects concrete documentation paths in non-asset skills", () => {
  const content = [
    "Read `documents/requirements.md` before coding.",
    "Update `documents/design.md` after architecture changes.",
    "Write `documents/tasks/2026/05/example.md`.",
    "Refresh `documents/index.md`.",
  ].join("\n");
  const errors = validateDocumentationSchemaIndirection(
    "framework/core/skills/plan/SKILL.md",
    content,
  );

  assertEquals(errors.map((e) => e.criterion), [
    "FR-UNIVERSAL.DOC-SCHEMA",
    "FR-UNIVERSAL.DOC-SCHEMA",
    "FR-UNIVERSAL.DOC-SCHEMA",
    "FR-UNIVERSAL.DOC-SCHEMA",
  ]);
  assertEquals(errors.map((e) => e.skill), [
    "framework/core/skills/plan/SKILL.md",
    "framework/core/skills/plan/SKILL.md",
    "framework/core/skills/plan/SKILL.md",
    "framework/core/skills/plan/SKILL.md",
  ]);
  assertStringIncludes(errors[0].message, "documents/requirements.md");
  assertStringIncludes(
    errors[0].message,
    "resolve role SRS/SDS/tasks/index from project instructions",
  );
});

Deno.test("doc schema indirection: rejects embedded SRS/SDS/task schema blocks in non-asset skills", () => {
  const content = [
    "### SRS Format (`documents/requirements.md`)",
    "```markdown",
    "# SRS",
    "## 3. Functional Reqs",
    "```",
    "### SDS Format (`documents/design.md`)",
    "### Tasks (`documents/tasks/`)",
  ].join("\n");
  const errors = validateDocumentationSchemaIndirection(
    "framework/core/skills/plan/SKILL.md",
    content,
  );

  assertEquals(errors.length >= 3, true);
  assertEquals(
    errors.every((e) => e.criterion === "FR-UNIVERSAL.DOC-SCHEMA"),
    true,
  );
  assertStringIncludes(errors[0].message, "matched");
});

Deno.test("doc schema indirection: allows concrete paths in AGENTS and CLAUDE templates", () => {
  const template = [
    "### SRS Format (`documents/requirements.md`)",
    "### SDS Format (`documents/design.md`)",
    "### Tasks (`documents/tasks/`)",
    "Use `documents/index.md` for navigation.",
  ].join("\n");

  assertEquals(
    validateDocumentationSchemaIndirection(
      "framework/core/assets/AGENTS.template.md",
      template,
    ),
    [],
  );
  assertEquals(
    validateDocumentationSchemaIndirection(
      "framework/core/assets/CLAUDE.template.md",
      template,
    ),
    [],
  );
});

Deno.test("doc schema indirection: allows scaffold defaults in pack metadata only", () => {
  const content = [
    'name: "core"',
    "scaffolds:",
    "  init:",
    "    - documents/requirements.md",
    "    - documents/design.md",
    "    - documents/tasks/",
    "notes: documents/requirements.md",
  ].join("\n");
  const errors = validateDocumentationSchemaIndirection(
    "framework/core/pack.yaml",
    content,
  );

  assertEquals(errors.length, 1);
  assertStringIncludes(errors[0].message, "documents/requirements.md");
});

Deno.test("doc schema indirection: allows SALP traceability links in source comments only", () => {
  // Post-SALP migration: traceability comments use `// [REF:fr:init]`
  // (no doc path encoded). The validator must continue to allow them and
  // still reject string literals that hard-code the doc path.
  assertEquals(
    validateDocumentationSchemaIndirection(
      "framework/core/commands/init/scripts/generate_agents.ts",
      "// [REF:fr:init | FR-INIT] — init\n",
    ),
    [],
  );

  const errors = validateDocumentationSchemaIndirection(
    "framework/core/commands/init/scripts/generate_agents.ts",
    'const path = "documents/requirements.md";\n',
  );
  assertEquals(errors.length, 1);
});

Deno.test("doc schema indirection: scans distributed primitive resources", async () => {
  const root = await Deno.makeTempDir();
  try {
    const files = [
      "framework/core/skills/example/SKILL.md",
      "framework/core/commands/example/SKILL.md",
      "framework/core/agents/example.md",
      "framework/core/hooks/pre_tool_use.ts",
      "framework/core/pack.yaml",
      "framework/atoms/plan.md",
      "framework/composites/ship.md",
      "framework/core/skills/example/references/notes.md",
    ];
    for (const file of files) {
      const path = `${root}/${file}`;
      await Deno.mkdir(path.slice(0, path.lastIndexOf("/")), {
        recursive: true,
      });
      await Deno.writeTextFile(path, "Read `documents/requirements.md`.");
    }

    await Deno.mkdir(`${root}/framework/core/assets`, { recursive: true });
    await Deno.writeTextFile(
      `${root}/framework/core/assets/AGENTS.template.md`,
      "Read `documents/requirements.md`.",
    );
    const acceptancePath =
      `${root}/framework/core/skills/example/acceptance-tests/case/mod.ts`;
    await Deno.mkdir(acceptancePath.slice(0, acceptancePath.lastIndexOf("/")), {
      recursive: true,
    });
    await Deno.writeTextFile(
      acceptancePath,
      'assert("documents/requirements.md");',
    );

    const errors = await collectDocumentationSchemaIndirectionErrors(
      `${root}/framework`,
    );

    assertEquals(errors.map((e) => e.skill).sort(), files.sort());
  } finally {
    await Deno.remove(root, { recursive: true });
  }
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
  const errors = validateKindInvariants("commit", "command", {
    name: "commit",
    description: "x",
  });
  assertEquals(errors, []);
});

Deno.test("validateKindInvariants: command WITH flag fails", () => {
  const errors = validateKindInvariants("commit", "command", {
    name: "commit",
    description: "x",
    "disable-model-invocation": true,
  });
  assertEquals(errors.length, 1);
  assertEquals(errors[0].criterion, "FR-PACKS.CMD-INVARIANT");
});

Deno.test("validateKindInvariants: skill without flag passes", () => {
  const errors = validateKindInvariants("flowai-foo", "skill", {
    name: "flowai-foo",
    description: "y",
  });
  assertEquals(errors, []);
});

Deno.test("validateKindInvariants: skill WITH flag fails", () => {
  const errors = validateKindInvariants("flowai-bar", "skill", {
    name: "flowai-bar",
    description: "y",
    "disable-model-invocation": true,
  });
  assertEquals(errors.length, 1);
  assertEquals(errors[0].criterion, "FR-PACKS.SKILL-INVARIANT");
});

// --- isFrameworkSkillsDir (framework-only check guard) ---

Deno.test("isFrameworkSkillsDir: relative framework path matches", () => {
  assertEquals(isFrameworkSkillsDir("framework/engineering/skills"), true);
  assertEquals(isFrameworkSkillsDir("framework/core/commands"), true);
});

Deno.test("isFrameworkSkillsDir: absolute framework path matches", () => {
  assertEquals(
    isFrameworkSkillsDir("/Users/x/repo/framework/core/skills"),
    true,
  );
  assertEquals(isFrameworkSkillsDir("C:\\repo\\framework\\core\\skills"), true);
});

Deno.test("isFrameworkSkillsDir: non-framework path does not match", () => {
  assertEquals(isFrameworkSkillsDir(".claude/skills"), false);
  assertEquals(isFrameworkSkillsDir("/abs/.claude/skills"), false);
});

// --- validateDescriptionWhenTrigger (FR-DESC-QUALITY) ---

Deno.test("FR-DESC-QUALITY: skill description without WHEN phrase errors", () => {
  const errors = validateDescriptionWhenTrigger("my-skill", "skill", {
    name: "my-skill",
    description: "Rewrites text in a dense factual style with no fluff.",
  });
  assertEquals(errors.length, 1);
  assertEquals(errors[0].criterion, "FR-DESC-QUALITY");
  assertStringIncludes(errors[0].message, "WHEN-trigger");
});

Deno.test("FR-DESC-QUALITY: skill description with WHEN phrase passes", () => {
  const errors = validateDescriptionWhenTrigger("my-skill", "skill", {
    name: "my-skill",
    description:
      "Rewrites text in a dense factual style. Use when the user asks to " +
      "tighten docs.",
  });
  assertEquals(errors, []);
});

Deno.test("FR-DESC-QUALITY: command description without WHEN phrase is exempt", () => {
  const errors = validateDescriptionWhenTrigger("commit", "command", {
    name: "commit",
    description: "Commit current changes as atomic conventional commits.",
  });
  assertEquals(errors, []);
});

Deno.test("FR-DESC-QUALITY: descriptionHasWhenTrigger recognizes allowlist phrases", () => {
  for (
    const phrase of [
      "Foo. Use when bar.",
      "Foo. Use this to bar.",
      "Use for bar.",
      "Use to bar.",
      "Use after bar.",
      "Use proactively when bar.",
      "Use on bar.",
      "Triggers on bar.",
      "Used when bar.",
      "Should be used when bar.",
      "Fires when the user asks.",
      "Apply when you need bar.",
    ]
  ) {
    assertEquals(
      descriptionHasWhenTrigger(phrase),
      true,
      `expected WHEN trigger in: ${phrase}`,
    );
  }
  assertEquals(descriptionHasWhenTrigger("Does things efficiently."), false);
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

Deno.test("validateIdeNeutrality: ai-ide-runner is exempt (intentional provider model IDs)", () => {
  const body = `---
name: ai-ide-runner
description: bar
---

Prefer the native provider: openai/gpt-5.4, anthropic/claude-sonnet-4.6.
`;
  assertEquals(validateIdeNeutrality("ai-ide-runner", body), []);
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
