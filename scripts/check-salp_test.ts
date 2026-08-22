/**
 * Unit tests for the SALP validator (`check-salp.ts`).
 *
 * Covers:
 *   - Dead REF (points at non-existent ANC).
 *   - Duplicate ANC within a namespace.
 *   - Open namespace set (any grammar-conformant value accepted).
 *   - Surviving legacy grammar (with --enforce-no-legacy).
 *   - `.ts` scanning boundaries: comments are read, string and
 *     template-literal bytes are not.
 *
 * Each test builds a temp directory with markdown fixtures, invokes the
 * collector, and asserts the returned `Finding[]`.
 */
import { assertEquals } from "@std/assert";
import { join } from "@std/path";
import { collectFindings, type Finding } from "./check-salp.ts";

async function withTempDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = await Deno.makeTempDir({ prefix: "salp-test-" });
  try {
    await fn(dir);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
}

async function writeFile(
  dir: string,
  rel: string,
  content: string,
): Promise<void> {
  const abs = join(dir, rel);
  await Deno.mkdir(join(abs, ".."), { recursive: true });
  await Deno.writeTextFile(abs, content);
}

function findingsOfKind(
  findings: Finding[],
  kind: Finding["kind"],
): Finding[] {
  return findings.filter((f) => f.kind === kind);
}

Deno.test("detects-dead-ref", async () => {
  await withTempDir(async (dir) => {
    await writeFile(
      dir,
      "a.md",
      "[ANC:fr:cmd-exec]\nSee [REF:fr:nope].",
    );
    const findings = await collectFindings({
      rootDir: dir,
      patterns: ["a.md"],
      enforceNoLegacy: false,
    });
    const dead = findingsOfKind(findings, "dead-ref");
    assertEquals(dead.length, 1);
    assertEquals(dead[0].message.includes("fr:nope"), true);
  });
});

Deno.test("detects-duplicate-anchor", async () => {
  await withTempDir(async (dir) => {
    await writeFile(dir, "a.md", "[ANC:fr:cmd-exec]");
    await writeFile(dir, "b.md", "[ANC:fr:cmd-exec]");
    const findings = await collectFindings({
      rootDir: dir,
      patterns: ["a.md", "b.md"],
      enforceNoLegacy: false,
    });
    const dups = findingsOfKind(findings, "duplicate-anchor");
    assertEquals(dups.length, 1);
    assertEquals(dups[0].message.includes("fr:cmd-exec"), true);
  });
});

Deno.test("accepts-any-grammar-conformant-namespace", async () => {
  // No closed allowlist: a novel namespace passes as long as it conforms to
  // the grammar and its REF resolves to an ANC.
  await withTempDir(async (dir) => {
    await writeFile(
      dir,
      "a.md",
      "[ANC:custom-ns:foo]\nSee [REF:custom-ns:foo].",
    );
    const findings = await collectFindings({
      rootDir: dir,
      patterns: ["a.md"],
      enforceNoLegacy: false,
    });
    assertEquals(findings.length, 0);
  });
});

Deno.test("detects-surviving-legacy-grammar", async () => {
  await withTempDir(async (dir) => {
    await writeFile(
      dir,
      "a.md",
      "See [FR-CMD-EXEC](requirements.md#fr-cmd-exec).",
    );
    await writeFile(dir, "b.ts", "// FR-CMD-EXEC: command execution\n");
    await writeFile(dir, "c.md", "[[wikilink]] reference.");
    const findings = await collectFindings({
      rootDir: dir,
      patterns: ["a.md", "b.ts", "c.md"],
      enforceNoLegacy: true,
    });
    const legacy = findingsOfKind(findings, "legacy-grammar");
    assertEquals(legacy.length, 3);
  });
});

Deno.test("no-findings-on-clean-fixture", async () => {
  await withTempDir(async (dir) => {
    await writeFile(
      dir,
      "a.md",
      "# Heading [ANC:fr:cmd-exec]\n\nSee [REF:fr:cmd-exec | FR-CMD-EXEC].",
    );
    const findings = await collectFindings({
      rootDir: dir,
      patterns: ["a.md"],
      enforceNoLegacy: true,
    });
    assertEquals(findings.length, 0);
  });
});

Deno.test("resolves-ref-across-files", async () => {
  await withTempDir(async (dir) => {
    await writeFile(dir, "src.md", "[ANC:fr:cmd-exec]");
    await writeFile(dir, "tgt.md", "Refers to [REF:fr:cmd-exec].");
    const findings = await collectFindings({
      rootDir: dir,
      patterns: ["src.md", "tgt.md"],
      enforceNoLegacy: false,
    });
    assertEquals(findings.length, 0);
  });
});

Deno.test("legacy-grammar-not-reported-when-flag-off", async () => {
  await withTempDir(async (dir) => {
    await writeFile(
      dir,
      "a.md",
      "See [FR-X](r.md#fr-x).",
    );
    const findings = await collectFindings({
      rootDir: dir,
      patterns: ["a.md"],
      enforceNoLegacy: false,
    });
    assertEquals(findings.length, 0);
  });
});

Deno.test("ignores-salp-tokens-inside-template-literals", async () => {
  // Shape borrowed from an acceptance-test scenario: `setup()` writes two
  // sandbox files out of template literals — a source file whose comment
  // carries a REF, and an SRS whose heading carries the matching ANC. Both
  // are cross-references of the SANDBOX project, not of this repo, so the
  // validator must read NEITHER. Reading only the REF (its line starts with
  // `//`, so a per-line shape test mistook it for a comment) while dropping
  // the ANC (its line does not) reported the pair as a dead ref.
  await withTempDir(async (dir) => {
    await writeFile(
      dir,
      "mod.ts",
      [
        "export async function setup(sandbox: string) {",
        "  await Deno.writeTextFile(",
        "    `${sandbox}/cli.ts`,",
        "    `/** CLI. */",
        "",
        "// [REF:fr:render] — the render subcommand.",
        "export function run(argv: string[]): string {",
        "  throw new Error(\\`unknown: \\${argv[0]}\\`);",
        "}",
        "`,",
        "  );",
        "  await Deno.writeTextFile(",
        "    `${sandbox}/documents/requirements.md`,",
        "    `# SRS",
        "",
        "### 3.1 FR-RENDER: Render to stdout [ANC:fr:render]",
        "`,",
        "  );",
        "}",
      ].join("\n"),
    );
    const findings = await collectFindings({
      rootDir: dir,
      patterns: ["mod.ts"],
      enforceNoLegacy: false,
    });
    assertEquals(findings, []);
  });
});

Deno.test("still-reads-salp-tokens-in-real-ts-comments", async () => {
  // Regression guard for the scan above: genuine line and block comments in
  // `.ts` source remain a cross-reference surface.
  await withTempDir(async (dir) => {
    await writeFile(
      dir,
      "impl.ts",
      [
        "/** Implements [REF:fr:render]. */",
        "export const x = 1;",
        "// [REF:fr:nope] — no anchor anywhere.",
      ].join("\n"),
    );
    await writeFile(dir, "srs.md", "### FR-RENDER [ANC:fr:render]");
    const findings = await collectFindings({
      rootDir: dir,
      patterns: ["impl.ts", "srs.md"],
      enforceNoLegacy: false,
    });
    const dead = findingsOfKind(findings, "dead-ref");
    assertEquals(dead.length, 1);
    assertEquals(dead[0].line, 3);
    assertEquals(dead[0].message.includes("fr:nope"), true);
  });
});

Deno.test("ignores-salp-anchors-in-ts-string-literals", async () => {
  // An ANC inside a quoted string is data too: it must not satisfy a REF.
  await withTempDir(async (dir) => {
    await writeFile(
      dir,
      "impl.ts",
      [
        'const banner = "[ANC:fr:ghost]";',
        "// [REF:fr:ghost] — points at a token that exists only in a string.",
        "export default banner;",
      ].join("\n"),
    );
    const findings = await collectFindings({
      rootDir: dir,
      patterns: ["impl.ts"],
      enforceNoLegacy: false,
    });
    const dead = findingsOfKind(findings, "dead-ref");
    assertEquals(dead.length, 1);
    assertEquals(dead[0].message.includes("fr:ghost"), true);
  });
});
