/**
 * Tests for `scripts/migrate-to-salp.ts`.
 *
 * Each test exercises a single grammar:
 *   - GFM-form FR link → SALP REF.
 *   - Wikilink (single + dual form) → SALP REF.
 *   - Bare `// FR-X` comment / `// [FR-X](...)` comment → SALP REF in
 *     comment.
 *
 * Plus invariants:
 *   - Idempotency: running the migration twice yields identical output.
 *   - Fail-fast: unresolvable target throws `SalpMigrationError`.
 */
import { assertEquals, assertThrows } from "@std/assert";
import {
  type AnchorMap,
  migrateText,
  SalpMigrationError,
} from "./migrate-to-salp.ts";

function mockMap(): AnchorMap {
  return new Map<string, { ns: string; id: string }>([
    ["documents/requirements.md#fr-cmd-exec-command-execution", {
      ns: "fr",
      id: "cmd-exec",
    }],
    [
      "documents/requirements.md#fr-doc-anchors-salp-as-canonical-anchor-mechanism",
      {
        ns: "fr",
        id: "doc-anchors",
      },
    ],
    ["documents/design.md#3-1-1-product-packs-framework", {
      ns: "sds",
      id: "3-1-1",
    }],
  ]);
}

Deno.test("converts-gfm-fr-link", () => {
  const input =
    "See [FR-CMD-EXEC](documents/requirements.md#fr-cmd-exec-command-execution) for details.";
  const out = migrateText(input, {
    file: "AGENTS.md",
    map: mockMap(),
    pageType: null,
  });
  assertEquals(
    out,
    "See [REF:fr:cmd-exec | FR-CMD-EXEC] for details.",
  );
});

Deno.test("converts-gfm-link-with-relative-path", () => {
  // Migration must resolve relative paths against the source file's
  // directory before lookup.
  const input =
    "See [FR-CMD-EXEC](requirements.md#fr-cmd-exec-command-execution) for details.";
  const out = migrateText(input, {
    file: "documents/srs-helper.md",
    map: mockMap(),
    pageType: null,
  });
  assertEquals(
    out,
    "See [REF:fr:cmd-exec | FR-CMD-EXEC] for details.",
  );
});

Deno.test("converts-sds-gfm-link", () => {
  const input =
    "See [SDS §3.1.1](documents/design.md#3-1-1-product-packs-framework) for details.";
  const out = migrateText(input, {
    file: "AGENTS.md",
    map: mockMap(),
    pageType: null,
  });
  assertEquals(
    out,
    "See [REF:sds:3-1-1 | SDS §3.1.1] for details.",
  );
});

Deno.test("converts-wikilink-with-display", () => {
  // Wikilink target slug + page type → ns from page type.
  const input = "See [[oauth-flow|OAuth Flow]] for details.";
  const out = migrateText(input, {
    file: "framework/memex/pages/concept-x.md",
    map: mockMap(),
    pageType: "concept",
  });
  assertEquals(
    out,
    "See [REF:mx-concept:oauth-flow | OAuth Flow] for details.",
  );
});

Deno.test("converts-bare-wikilink", () => {
  const input = "See [[oauth-flow]] for details.";
  const out = migrateText(input, {
    file: "framework/memex/pages/concept-x.md",
    map: mockMap(),
    pageType: "concept",
  });
  assertEquals(out, "See [REF:mx-concept:oauth-flow] for details.");
});

Deno.test("converts-dual-link", () => {
  // Existing dual-form: `[[slug|Display]] ([Display](slug.md))` → keep only
  // the SALP REF; drop the trailing parenthetical GFM link.
  const input =
    "See [[oauth-flow|OAuth Flow]] ([OAuth Flow](oauth-flow.md)) for details.";
  const out = migrateText(input, {
    file: "framework/memex/pages/concept-x.md",
    map: mockMap(),
    pageType: "concept",
  });
  assertEquals(
    out,
    "See [REF:mx-concept:oauth-flow | OAuth Flow] for details.",
  );
});

Deno.test("converts-legacy-fr-comment", () => {
  const input = "// FR-CMD-EXEC: command execution gate\nconst x = 1;";
  const out = migrateText(input, {
    file: "scripts/example.ts",
    map: mockMap(),
    pageType: null,
  });
  assertEquals(
    out,
    "// [REF:fr:cmd-exec] command execution gate\nconst x = 1;",
  );
});

Deno.test("converts-gfm-link-in-comment", () => {
  // `// [FR-CMD-EXEC](documents/requirements.md#...)` → `// [REF:fr:cmd-exec]`.
  const input =
    "// [FR-CMD-EXEC](documents/requirements.md#fr-cmd-exec-command-execution) gate\nconst x = 1;";
  const out = migrateText(input, {
    file: "scripts/example.ts",
    map: mockMap(),
    pageType: null,
  });
  assertEquals(
    out,
    "// [REF:fr:cmd-exec | FR-CMD-EXEC] gate\nconst x = 1;",
  );
});

Deno.test("is-idempotent", () => {
  const input =
    "See [FR-CMD-EXEC](documents/requirements.md#fr-cmd-exec-command-execution) and [[oauth-flow]].";
  const opts = {
    file: "framework/memex/pages/concept-x.md",
    map: mockMap(),
    pageType: "concept" as const,
  };
  const once = migrateText(input, opts);
  const twice = migrateText(once, opts);
  assertEquals(twice, once);
});

Deno.test("fails-fast-on-unresolvable-target", () => {
  const input = "See [FR-UNKNOWN](documents/requirements.md#fr-unknown-foo).";
  assertThrows(
    () =>
      migrateText(input, {
        file: "AGENTS.md",
        map: mockMap(),
        pageType: null,
      }),
    SalpMigrationError,
    "fr-unknown",
  );
});

Deno.test("fails-fast-on-wikilink-without-page-type", () => {
  const input = "See [[oauth-flow]].";
  assertThrows(
    () =>
      migrateText(input, {
        file: "documents/spec.md",
        map: mockMap(),
        pageType: null,
      }),
    SalpMigrationError,
    "page type",
  );
});

Deno.test("preserves-template-variable-in-display", () => {
  // `{{VARIABLE}}` placeholders inside AGENTS.template.md must end up in the
  // `| display` segment, never in `ns` or `id`.
  const input =
    "See [{{COMMAND_NAME}}](documents/requirements.md#fr-cmd-exec-command-execution).";
  const out = migrateText(input, {
    file: "framework/core/assets/AGENTS.template.md",
    map: mockMap(),
    pageType: null,
  });
  assertEquals(
    out,
    "See [REF:fr:cmd-exec | {{COMMAND_NAME}}].",
  );
});

Deno.test("ignores-gfm-links-inside-backtick-spans", () => {
  // Backtick-wrapped GFM-link examples are markdown code-spans (the SRS
  // quotes the banned legacy grammar inline like `[FR-X](path.md#…)`).
  // They are illustrative text, not real references — leave untouched.
  const input =
    "Forbidden: `[FR-X](path.md#…)` and `[[slug]]` shortcuts are rejected.";
  const out = migrateText(input, {
    file: "documents/requirements.md",
    map: mockMap(),
    pageType: null,
  });
  assertEquals(out, input);
});

Deno.test("ignores-bare-fr-comment-inside-backtick-span", () => {
  // Same principle for inline code-spans on prose lines that quote
  // `// FR-X` as an illustration of the banned grammar.
  const input =
    "The legacy form `// FR-CMD-EXEC` is rejected by the validator.";
  const out = migrateText(input, {
    file: "documents/requirements.md",
    map: mockMap(),
    pageType: null,
  });
  assertEquals(out, input);
});

Deno.test("ignores-non-fr-gfm-links", () => {
  // Generic markdown links (e.g. README.md → external repo) must NOT be
  // touched. The migration only handles FR-shaped link text.
  const input = "See [the README](README.md) for details.";
  const out = migrateText(input, {
    file: "AGENTS.md",
    map: mockMap(),
    pageType: null,
  });
  assertEquals(out, input);
});
