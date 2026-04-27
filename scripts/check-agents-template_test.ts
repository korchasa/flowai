/**
 * Validates that framework/core/assets/AGENTS.template.md declares the
 * Interconnectedness Principle (FR-DOC-LINKS) — the abstract rule that any
 * linkable doc artifact carries a stable ID, code references it via `// <NS>-<ID>`
 * comment, and doc-to-doc links use GFM markdown anchors.
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

Deno.test("AGENTS.template.md — Interconnectedness Principle lists all namespaces (FR, ADR, SDS, NFR)", async () => {
  const content = await readTemplate();
  // The principle section MUST enumerate each namespace so the agent knows
  // the legal NS values when assigning new IDs.
  for (const ns of ["FR-", "ADR-", "SDS-", "NFR-"]) {
    assert(
      content.includes(ns),
      `Template missing namespace '${ns}' in Interconnectedness Principle`,
    );
  }
});

Deno.test("AGENTS.template.md — declares ID-comment convention for code (`// <NS>-<ID>`)", async () => {
  const content = await readTemplate();
  // The principle MUST tell the agent that code references docs via comment markers.
  assertStringIncludes(content, "// <NS>-<ID>");
});

Deno.test("AGENTS.template.md — declares GFM-link convention for doc-to-doc references", async () => {
  const content = await readTemplate();
  // The principle MUST show the canonical GFM-anchor link form so agents stop
  // inventing custom slug syntaxes.
  assertStringIncludes(content, "](");
  assertStringIncludes(content, ".md#");
});

Deno.test("AGENTS.template.md — declares heading-includes-ID rule (auto-slug stability)", async () => {
  const content = await readTemplate();
  // Headings must embed the ID so the auto-generated GFM slug carries it,
  // which keeps cross-doc links stable when section text is rewritten.
  // We accept either "heading" or "header" as wording.
  const re = /heading[s]?[^\n]*ID|ID[^\n]*heading[s]?/i;
  assert(
    re.test(content),
    "Template missing heading-includes-ID rule (auto-slug stability)",
  );
});
