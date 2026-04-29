import { assertEquals } from "@std/assert";
import {
  computeAutoSlug,
  detectLegacyFrComments,
  extractCommentLinks,
  extractFrIdsFromSrs,
  extractHeadingSlugs,
  extractImplementsFromTask,
  type TaskRef,
  validateTaskRefs,
} from "./check-traceability.ts";

// --- Auto-slug computation (mirrors GitHub's algorithm) ---

Deno.test("computeAutoSlug — basic lowercasing and space-to-hyphen", () => {
  assertEquals(
    computeAutoSlug("FR-CMD-EXEC: Command Execution"),
    "fr-cmd-exec-command-execution",
  );
});

Deno.test("computeAutoSlug — strips punctuation but keeps period and hyphen", () => {
  assertEquals(
    computeAutoSlug("FR-DIST.SYNC: Sync Command"),
    "fr-dist.sync-sync-command",
  );
  assertEquals(
    computeAutoSlug("FR-INIT (Project Initialization)"),
    "fr-init-project-initialization",
  );
});

Deno.test("computeAutoSlug — Cyrillic heading (matches user's example)", () => {
  assertEquals(computeAutoSlug("Модель RAG"), "модель-rag");
});

Deno.test("computeAutoSlug — does not collapse consecutive hyphens", () => {
  // GitHub keeps consecutive hyphens that come from explicit user text.
  assertEquals(computeAutoSlug("FR-DOC-LINKS"), "fr-doc-links");
});

// --- Heading-slug extraction from a markdown body ---

Deno.test("extractHeadingSlugs — picks up #, ##, ### headings", () => {
  const md = `# Top
## Mid
### Deep
text
## Mid Two`;
  const slugs = extractHeadingSlugs(md);
  assertEquals(slugs.has("top"), true);
  assertEquals(slugs.has("mid"), true);
  assertEquals(slugs.has("deep"), true);
  assertEquals(slugs.has("mid-two"), true);
});

Deno.test("extractHeadingSlugs — duplicate headings get -1, -2 suffixes (GFM rule)", () => {
  const md = `## Same
text
## Same
text
## Same`;
  const slugs = extractHeadingSlugs(md);
  assertEquals(slugs.has("same"), true);
  assertEquals(slugs.has("same-1"), true);
  assertEquals(slugs.has("same-2"), true);
});

// --- GFM link extraction from comments ---

Deno.test("extractCommentLinks — finds GFM links in TS comments", () => {
  // Build via line-array so the fixture is not parsed as real comments by
  // the migration walker / validator scanning this source file.
  const ts = [
    "// implements [FR-CMD-EXEC](../docs/requirements.md#fr-cmd-exec-command-execution)",
    "const x = 1;",
    "// see [Pack System](docs/design.md#sds-packs--product-packs)",
  ].join("\n");
  const links = extractCommentLinks("foo.ts", ts);
  assertEquals(links.length, 2);
  assertEquals(links[0].text, "FR-CMD-EXEC");
  assertEquals(links[0].path, "../docs/requirements.md");
  assertEquals(links[0].anchor, "fr-cmd-exec-command-execution");
  assertEquals(links[0].line, 1);
  assertEquals(links[1].text, "Pack System");
  assertEquals(links[1].anchor, "sds-packs--product-packs");
  assertEquals(links[1].line, 3);
});

Deno.test("extractCommentLinks — ignores GFM links outside comments", () => {
  const ts =
    `const link = "[Pack System](docs/design.md#sds-packs--product-packs)";`;
  const links = extractCommentLinks("foo.ts", ts);
  assertEquals(links.length, 0);
});

Deno.test("extractCommentLinks — finds GFM links in YAML/shell `#` comments", () => {
  const yml = [
    "name: CI",
    "# implements [FR-CICD.PIN](../docs/requirements.md#fr-cicd-pin-sha-pinning)",
    "steps: []",
  ].join("\n");
  const links = extractCommentLinks("ci.yml", yml);
  assertEquals(links.length, 1);
  assertEquals(links[0].text, "FR-CICD.PIN");
  assertEquals(links[0].file, "ci.yml");
});

Deno.test("extractCommentLinks — handles links without anchor", () => {
  const ts = `// see [the SDS](../docs/design.md)`;
  const links = extractCommentLinks("foo.ts", ts);
  assertEquals(links.length, 1);
  assertEquals(links[0].path, "../docs/design.md");
  assertEquals(links[0].anchor, "");
});

// --- Legacy `// FR-<ID>` detection (deprecation gate) ---

Deno.test("detectLegacyFrComments — flags `// FR-XXX` without GFM link", () => {
  // Build fixture by line-array to avoid the migration script (which scans
  // for `^// FR-` as legacy markers) treating these test inputs as real
  // comments needing migration.
  const ts = [
    "// FR-CMD-EXEC — bare legacy form",
    "const x = 1;",
    "// FR-DIST.SYNC",
  ].join("\n");
  const refs = detectLegacyFrComments("foo.ts", ts);
  assertEquals(refs.length, 2);
  assertEquals(refs[0].id, "FR-CMD-EXEC");
  assertEquals(refs[0].line, 1);
  assertEquals(refs[1].id, "FR-DIST.SYNC");
});

Deno.test("detectLegacyFrComments — does NOT flag migrated comments (GFM link present)", () => {
  // Migrated form: link-text echoes the FR-ID, but a GFM link is also on
  // the line — that satisfies the rule, so do not flag.
  const ts =
    `// implements [FR-CMD-EXEC](../docs/requirements.md#fr-cmd-exec-command-execution)`;
  const refs = detectLegacyFrComments("foo.ts", ts);
  assertEquals(refs.length, 0);
});

Deno.test("detectLegacyFrComments — does NOT flag prose containing FR-XXX (not a comment)", () => {
  const ts = `const msg = "see FR-DIST.SYNC for details";`;
  const refs = detectLegacyFrComments("foo.ts", ts);
  assertEquals(refs.length, 0);
});

// --- SRS-side FR-ID extraction (for task-ref validation) ---

Deno.test("extractFrIdsFromSrs — extracts FR-* IDs from headings and bold criteria", () => {
  const srs = `
### FR-DIST: Global Framework Distribution
#### FR-DIST.SYNC Sync Command
### FR-CMD-EXEC: Command Execution

- [x] **FR-INIT.STACK Stack detection**
`;
  const ids = extractFrIdsFromSrs(srs);
  assertEquals(ids.has("FR-DIST"), true);
  assertEquals(ids.has("FR-DIST.SYNC"), true);
  assertEquals(ids.has("FR-CMD-EXEC"), true);
  assertEquals(ids.has("FR-INIT.STACK"), true);
});

Deno.test("extractFrIdsFromSrs — ignores inline FR references in prose", () => {
  const srs = `
### FR-DOCS: Documentation
- **Description:** Enforced by FR-MAINT.
`;
  const ids = extractFrIdsFromSrs(srs);
  assertEquals(ids.has("FR-DOCS"), true);
  assertEquals(ids.has("FR-MAINT"), false);
});

// --- Task frontmatter ---

Deno.test("extractImplementsFromTask — extracts FR-IDs from YAML frontmatter", () => {
  const md = `---
implements:
  - FR-DOCS
  - FR-CMD-EXEC
---
# My Task
`;
  const refs = extractImplementsFromTask("task.md", md);
  assertEquals(refs.length, 2);
  assertEquals(refs[0].id, "FR-DOCS");
  assertEquals(refs[1].id, "FR-CMD-EXEC");
});

Deno.test("extractImplementsFromTask — empty implements", () => {
  const md = `---
implements: []
---
# Task
`;
  assertEquals(extractImplementsFromTask("t.md", md).length, 0);
});

Deno.test("validateTaskRefs — detects task refs not in SRS", () => {
  const srsIds = new Set(["FR-DOCS"]);
  const taskRefs: TaskRef[] = [
    { id: "FR-DOCS", file: "t1.md" },
    { id: "FR-NOPE", file: "t1.md" },
  ];
  const invalid = validateTaskRefs(srsIds, taskRefs);
  assertEquals(invalid.length, 1);
  assertEquals(invalid[0].id, "FR-NOPE");
});
