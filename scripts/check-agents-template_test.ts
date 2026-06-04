/**
 * Validates that framework/core/assets/AGENTS.template.md declares the
 * Interconnectedness Principle under SALP ([REF:fr:doc-anchors | FR-DOC-ANCHORS])
 * — the abstract rule that cross-references in BOTH docs and code use the
 * SALP `[ANC:ns:id]` / `[REF:ns:id | display]` grammar with namespace
 * disambiguation. GFM-form cross-references, wikilinks, salp-short, and bare
 * ID-string code comments (`// FR-XXX`) are explicitly rejected. A downstream
 * migration path is documented for projects initialised pre-SALP.
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

Deno.test("AGENTS.template.md — mandates SALP anchor syntax with concrete example", async () => {
  const content = await readTemplate();
  // The principle MUST show the canonical SALP form `[ANC:<ns>:<id>]`
  // and `[REF:<ns>:<id> | <display>]` as the only allowed cross-reference
  // grammar. Pattern matches both tokens.
  const ancRe = /\[ANC:[a-z][a-z0-9-]*:[a-z0-9][a-z0-9.-]*\]/;
  const refRe = /\[REF:[a-z][a-z0-9-]*:[a-z0-9][a-z0-9.-]*/;
  assert(
    ancRe.test(content),
    "Template missing concrete SALP ANC example `[ANC:ns:id]`",
  );
  assert(
    refRe.test(content),
    "Template missing concrete SALP REF example `[REF:ns:id | display]`",
  );
});

Deno.test("AGENTS.template.md — declares SALP namespace allowlist", async () => {
  const content = await readTemplate();
  // The allowlist MUST enumerate the seed namespaces so downstream users
  // know what `<ns>` values the validator accepts.
  const allowlist =
    /(allowlist|allowed|namespace)[^\n]{0,300}fr[^\n]{0,200}sds[^\n]{0,200}task/i;
  assert(
    allowlist.test(content),
    "Template does not declare the SALP namespace allowlist (fr, sds, task, mx-*)",
  );
});

Deno.test("AGENTS.template.md — applies SALP rule to BOTH docs and code (not docs-only)", async () => {
  const content = await readTemplate();
  // The rule MUST state SALP applies to code references too — either via
  // an explicit "in code too" clause OR by giving a `// [REF:...]` example.
  const coversCode =
    /(applies\s+in\s+code|in code and in docs|both code and docs|even in code|even from code|`\/\/\s*\[REF:)/i;
  assert(
    coversCode.test(content),
    "Template's principle does not state that SALP applies to code as well as docs",
  );
});

Deno.test("AGENTS.template.md — rejects GFM-form cross-references for FR/SDS targets", async () => {
  const content = await readTemplate();
  // The principle MUST explicitly mention that GFM-form cross-references
  // (`[FR-X](path.md#…)`) are rejected by the validator.
  const rejectsGfm =
    /(reject|do\s+not|don't|no|forbidden|banned)[^\n]{0,200}(GFM-form|GFM-link|GFM\s+cross|`\[FR-)/i;
  assert(
    rejectsGfm.test(content),
    "Template does not explicitly reject GFM-form cross-references",
  );
});

Deno.test("AGENTS.template.md — explicitly rejects ID-only / slug-style cross-reference syntax", async () => {
  const content = await readTemplate();
  // The principle MUST tell the agent NOT to invent shortcut syntaxes like
  // `[FR-XXX]`, wikilinks `[[X]]`, salp-short `[ANC:id]`, or bare ID strings
  // like `// FR-XXX` as cross-reference markers.
  const rejectsIdOnly =
    /(do\s+not|don't|no|reject)[^\n]{0,200}(ID-only|slug|bare ID|raw ID|wikilink|salp-short|`\/\/\s*FR|legacy|shortcut)/i;
  assert(
    rejectsIdOnly.test(content),
    "Template does not explicitly reject ID-only / wikilink / salp-short / bare-comment shortcuts",
  );
});

Deno.test("AGENTS.template.md — declares downstream migration path from GFM to SALP", async () => {
  const content = await readTemplate();
  // Projects initialised pre-SALP need a documented one-shot conversion.
  // The template MUST point at `scripts/migrate-to-salp.ts` and call out the
  // `--write` invocation.
  assertStringIncludes(content, "migrate-to-salp.ts");
  const invokesWrite = /migrate-to-salp\.ts[^\n]{0,100}--write/;
  assert(
    invokesWrite.test(content),
    "Template's migration section does not show the `--write` invocation",
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

Deno.test("AGENTS.template.md — declares forward-motion rule with named exception", async () => {
  const content = await readTemplate();
  // The rule MUST tell the agent that once a plan is authorized, it should
  // execute through phases without re-confirming each one. AND it MUST
  // name the exception class (genuinely irreversible side-effects).
  // We anchor on the rule's trigger-word and require an exception-word
  // within ±300 characters of it (same bullet / same paragraph).
  const ruleAnchor =
    /(authoriz(?:e|ed|ation)|forward motion|re-confirm|confirmation discipline|already authorized|do not re-ask|do not ask again)/i;
  const match = content.match(ruleAnchor);
  assert(
    match !== null,
    "Template missing forward-motion / no-re-confirmation rule",
  );
  const idx = match!.index!;
  const window = content.slice(Math.max(0, idx - 300), idx + 300);
  const exceptionPattern =
    /(irreversible|force\s+push|prod\s+deploy|drop\s+(?:table|database)|external\s+message|external\s+side-effect|side[- ]effect)/i;
  assert(
    exceptionPattern.test(window),
    "Template's forward-motion rule does not name the irreversible-action exception in the same vicinity",
  );
});
