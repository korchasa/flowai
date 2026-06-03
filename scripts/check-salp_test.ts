/**
 * Unit tests for the SALP validator (`check-salp.ts`).
 *
 * Covers:
 *   - Dead REF (points at non-existent ANC).
 *   - Duplicate ANC within a namespace.
 *   - Unlisted namespace.
 *   - Surviving legacy grammar (with --enforce-no-legacy).
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

Deno.test("rejects-unlisted-namespace", async () => {
  await withTempDir(async (dir) => {
    await writeFile(dir, "a.md", "[ANC:bogus:foo]");
    const findings = await collectFindings({
      rootDir: dir,
      patterns: ["a.md"],
      enforceNoLegacy: false,
    });
    const bad = findingsOfKind(findings, "unlisted-namespace");
    assertEquals(bad.length, 1);
    assertEquals(bad[0].message.includes("bogus"), true);
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
