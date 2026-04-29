/**
 * Validates that framework/core/assets/AGENTS.template.md declares the
 * Interconnectedness Principle (FR-DOC-LINKS) — the abstract rule that
 * cross-references in BOTH docs and code use standard GFM markdown links
 * with relative paths and heading anchors. Slug-style identifiers in code
 * comments (`// FR-XXX`) and custom anchor mechanisms are explicitly rejected.
 */
import { assert, assertStringIncludes } from "@std/assert";

const TEMPLATE_PATH = "framework/core/assets/AGENTS.template.md";

async function readTemplate(): Promise<string> {
  return await Deno.readTextFile(TEMPLATE_PATH);
}

Deno.test("AGENTS.template.md — declares Interconnectedness Principle section", async () => {
  const content = await readTemplate();
  assertStringIncludes(content, "## Interconnectedness Principle");
});

Deno.test("AGENTS.template.md — declares GFM-link convention with concrete example", async () => {
  const content = await readTemplate();
  // The principle MUST show the canonical GFM-link form: `[text](path.md#anchor)`.
  // Pattern matches: `[<anything>](<anything>.md#<anything>)`.
  const gfmLinkRe = /\[[^\]]+\]\([^)]+\.md#[^)]+\)/;
  assert(
    gfmLinkRe.test(content),
    "Template missing concrete GFM-link example `[text](path.md#anchor)`",
  );
});

Deno.test("AGENTS.template.md — applies GFM-link rule to BOTH docs and code (not docs-only)", async () => {
  const content = await readTemplate();
  // The rule MUST cover code references explicitly. Either by saying "in code
  // and in docs", or by explicitly inverting the legacy `// FR-<ID>` form.
  // We accept either phrasing.
  const coversCode =
    /code[^\n]{0,60}(GFM|markdown link|standard link)|in code and in docs|both code and docs|in code or in docs|even in code|even from code/i;
  assert(
    coversCode.test(content),
    "Template's principle does not state that GFM-links apply to code as well as docs",
  );
});

Deno.test("AGENTS.template.md — explicitly rejects ID-only / slug-style cross-reference syntax", async () => {
  const content = await readTemplate();
  // The principle MUST tell the agent NOT to invent shortcut syntaxes like
  // `[FR-XXX]` or bare ID strings like `// FR-XXX` as cross-reference markers.
  const rejectsIdOnly =
    /(do\s+not|don't|no)[^\n]{0,80}(ID-only|slug|bare ID|raw ID|`\/\/\s*FR|legacy|shortcut)/i;
  assert(
    rejectsIdOnly.test(content),
    "Template does not explicitly reject ID-only / slug-style cross-reference syntax",
  );
});

Deno.test("AGENTS.template.md — does NOT carry the old namespace table (FR/ADR/SDS/NFR)", async () => {
  const content = await readTemplate();
  // The earlier slug-based draft introduced a namespace table listing
  // `FR-<MNEMONIC>`, `SDS-<MNEMONIC>`, `ADR-<NNNN>`, `NFR-<NUMBER>` as
  // linkable identifier shapes. The GFM-everywhere principle replaces this.
  // Heuristic: presence of THREE such ID-shape literals signals the old table.
  let shapeHits = 0;
  if (content.includes("`SDS-<MNEMONIC>`")) shapeHits++;
  if (content.includes("`ADR-<NNNN>`")) shapeHits++;
  if (content.includes("`NFR-<NUMBER>`")) shapeHits++;
  if (content.includes("`FR-<MNEMONIC>`")) shapeHits++;
  assert(
    shapeHits < 2,
    `Template still declares the slug-style namespace table (${shapeHits} ID-shape literals found)`,
  );
});

Deno.test("AGENTS.template.md — does NOT mandate `// <NS>-<ID>` code-comment marker", async () => {
  const content = await readTemplate();
  // Under the GFM-everywhere principle, code comments use GFM links, not
  // legacy `// <NS>-<ID>` shortcuts. The template MUST NOT prescribe the
  // `// <NS>-<ID>` shape as the canonical code-to-doc reference.
  // Acceptable: mention as legacy-deprecated. Unacceptable: declared as the rule.
  const mandatesNsId =
    /(use|MUST use|MUST contain|reference\w*\s+via|via\s+line-comment\s+markers?)[^\n]{0,80}`\/\/\s*<NS>-<ID>`/i;
  assert(
    !mandatesNsId.test(content),
    "Template still mandates `// <NS>-<ID>` code-comment marker as the canonical code-to-doc reference",
  );
});
