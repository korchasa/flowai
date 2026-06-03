/**
 * Unit tests for the SALP (Semantic Anchor / Link Protocol) parser.
 *
 * Pins the grammar:
 *   - ANC: `[ANC:<ns>:<id>]`
 *   - REF: `[REF:<ns>:<id>]` or `[REF:<ns>:<id> | <display>]`
 *   - ns: `[a-z][a-z0-9-]*` (seed allowlist enforced separately)
 *   - id: `[a-z0-9][a-z0-9-]*`
 *
 * SALP-short (`[ANC:id]` / `[REF:id]`, no namespace) is REJECTED.
 * Legacy grammars (GFM-link `[X](path.md#a)`, wikilink `[[slug]]`,
 * bare `// FR-X` comment) are detected separately by `detectLegacyGrammars`.
 */
import { assertEquals, assertThrows } from "@std/assert";
import {
  detectLegacyGrammars,
  parseAnchors,
  parseRefs,
  SalpSyntaxError,
  SEED_NAMESPACE_ALLOWLIST,
  serializeAnchor,
  serializeRef,
  validateNamespace,
} from "./salp.ts";

Deno.test("parses-anc-with-namespace", () => {
  const ancs = parseAnchors("Body text [ANC:fr:cmd-exec] more text.");
  assertEquals(ancs.length, 1);
  assertEquals(ancs[0].ns, "fr");
  assertEquals(ancs[0].id, "cmd-exec");
  assertEquals(ancs[0].pos.line, 1);
});

Deno.test("parses-ref-with-namespace-only", () => {
  const refs = parseRefs("See [REF:fr:cmd-exec] for details.");
  assertEquals(refs.length, 1);
  assertEquals(refs[0].ns, "fr");
  assertEquals(refs[0].id, "cmd-exec");
  assertEquals(refs[0].display, undefined);
});

Deno.test("parses-ref-with-display", () => {
  const refs = parseRefs("See [REF:fr:cmd-exec | FR-CMD-EXEC] for details.");
  assertEquals(refs.length, 1);
  assertEquals(refs[0].ns, "fr");
  assertEquals(refs[0].id, "cmd-exec");
  assertEquals(refs[0].display, "FR-CMD-EXEC");
});

Deno.test("parses-ref-with-display-no-spaces-around-pipe", () => {
  const refs = parseRefs("[REF:fr:cmd-exec|FR-CMD-EXEC]");
  assertEquals(refs.length, 1);
  assertEquals(refs[0].display, "FR-CMD-EXEC");
});

Deno.test("parses-multiple-anchors-and-refs-on-separate-lines", () => {
  const text = [
    "# Heading",
    "[ANC:fr:cmd-exec]",
    "",
    "Body referring to [REF:sds:3-1-1 | SDS §3.1.1] and",
    "another [REF:task:adopt-salp-anchors].",
  ].join("\n");
  const ancs = parseAnchors(text);
  const refs = parseRefs(text);
  assertEquals(ancs.length, 1);
  assertEquals(ancs[0].pos.line, 2);
  assertEquals(refs.length, 2);
  assertEquals(refs[0].ns, "sds");
  assertEquals(refs[0].id, "3-1-1");
  assertEquals(refs[1].ns, "task");
  assertEquals(refs[1].id, "adopt-salp-anchors");
});

Deno.test("rejects-salp-short-form-anchor", () => {
  // `[ANC:cmd-exec]` (one colon → bare id, no namespace) is REJECTED.
  assertThrows(
    () => parseAnchors("Bad: [ANC:cmd-exec]"),
    SalpSyntaxError,
    "salp-short form",
  );
});

Deno.test("rejects-salp-short-form-ref", () => {
  assertThrows(
    () => parseRefs("Bad: [REF:cmd-exec | display]"),
    SalpSyntaxError,
    "salp-short form",
  );
});

Deno.test("rejects-uppercase-namespace", () => {
  assertThrows(
    () => parseAnchors("[ANC:FR:cmd-exec]"),
    SalpSyntaxError,
  );
});

Deno.test("rejects-uppercase-id", () => {
  assertThrows(
    () => parseAnchors("[ANC:fr:CMD-EXEC]"),
    SalpSyntaxError,
  );
});

Deno.test("parses-mx-namespaces-with-hyphen", () => {
  const ancs = parseAnchors("[ANC:mx-concept:oauth-flow]");
  assertEquals(ancs[0].ns, "mx-concept");
  assertEquals(ancs[0].id, "oauth-flow");
});

Deno.test("validateNamespace-allows-seed-list", () => {
  for (const ns of SEED_NAMESPACE_ALLOWLIST) {
    if (!validateNamespace(ns)) throw new Error(`expected ${ns} allowed`);
  }
});

Deno.test("validateNamespace-rejects-deferred-namespaces", () => {
  // `nfr` and `code` are intentionally deferred until first consumer lands.
  assertEquals(validateNamespace("nfr"), false);
  assertEquals(validateNamespace("code"), false);
  assertEquals(validateNamespace("random"), false);
});

Deno.test("serializeAnchor-round-trips", () => {
  const s = serializeAnchor({ ns: "fr", id: "cmd-exec" });
  assertEquals(s, "[ANC:fr:cmd-exec]");
  const back = parseAnchors(s);
  assertEquals(back[0].ns, "fr");
  assertEquals(back[0].id, "cmd-exec");
});

Deno.test("serializeRef-with-display-round-trips", () => {
  const s = serializeRef({ ns: "fr", id: "cmd-exec", display: "FR-CMD-EXEC" });
  assertEquals(s, "[REF:fr:cmd-exec | FR-CMD-EXEC]");
  const back = parseRefs(s);
  assertEquals(back[0].display, "FR-CMD-EXEC");
});

Deno.test("serializeRef-without-display", () => {
  const s = serializeRef({ ns: "fr", id: "cmd-exec" });
  assertEquals(s, "[REF:fr:cmd-exec]");
});

Deno.test("detectLegacyGrammars-finds-gfm-fr-link", () => {
  const text = "See [FR-CMD-EXEC](requirements.md#fr-cmd-exec) for details.";
  const hits = detectLegacyGrammars(text);
  assertEquals(hits.length, 1);
  assertEquals(hits[0].kind, "gfm-fr-link");
  assertEquals(hits[0].pos.line, 1);
});

Deno.test("detectLegacyGrammars-finds-wikilink", () => {
  const text = "See [[oauth-flow]] and [[other-page|Other Page]].";
  const hits = detectLegacyGrammars(text);
  assertEquals(hits.length, 2);
  assertEquals(hits[0].kind, "wikilink");
  assertEquals(hits[1].kind, "wikilink");
});

Deno.test("detectLegacyGrammars-finds-bare-fr-comment", () => {
  const text = "// FR-CMD-EXEC: command execution\nconst x = 1;";
  const hits = detectLegacyGrammars(text);
  assertEquals(hits.length, 1);
  assertEquals(hits[0].kind, "bare-fr-comment");
});

Deno.test("detectLegacyGrammars-ignores-salp-grammar", () => {
  const text = "Body [ANC:fr:cmd-exec] and [REF:fr:cmd-exec | FR-CMD-EXEC].";
  const hits = detectLegacyGrammars(text);
  assertEquals(hits.length, 0);
});

Deno.test("detectLegacyGrammars-ignores-gfm-link-without-fr-prefix", () => {
  // Generic markdown links (non-FR) are NOT a legacy violation — they may be
  // external links, README links, etc. Only the FR-shaped GFM is migrated.
  const text = "See [the README](README.md) for details.";
  const hits = detectLegacyGrammars(text);
  assertEquals(hits.length, 0);
});

Deno.test("parses-anchor-at-end-of-line-with-trailing-text", () => {
  const text = "# FR-CMD-EXEC: Command Execution [ANC:fr:cmd-exec]";
  const ancs = parseAnchors(text);
  assertEquals(ancs.length, 1);
  assertEquals(ancs[0].ns, "fr");
});

Deno.test("parses-no-anchors-or-refs-in-empty-text", () => {
  assertEquals(parseAnchors(""), []);
  assertEquals(parseRefs(""), []);
});
