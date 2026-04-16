/**
 * Validates narrative `Evidence:` claims in SRS/SDS that reference specific
 * tests by file + test name.
 *
 * Pattern caught (real example from FR-DIST.GLOBAL):
 *
 *   - [x] Global mode installs templates.
 *     Evidence: `cli/src/sync_test.ts::global mode installs templates`
 *
 * When an author writes such a claim but the test does not exist, the SRS
 * makes a false promise. The existing `check-traceability.ts` only checks
 * `// FR-<ID>` code comments; it cannot see narrative prose. This validator
 * closes that gap symmetrically: for each `Evidence:` line that points at a
 * `<file>::<name>` pair, it opens the file and asserts the test name is
 * present as a string literal in a `Deno.test(...)` or `it(...)` call.
 *
 * Supported reference syntaxes:
 *   - Evidence: `cli/src/foo_test.ts::test name`
 *   - Evidence: cli/src/foo_test.ts::test name
 *   - Evidence: `cli/src/foo_test.ts` (file existence only, no test name)
 *
 * Not checked:
 *   - Free-form prose evidence (e.g. "verified by manual probe").
 *   - Benchmark scenarios (runtime-only; covered by deno task bench).
 *   - Evidence that points at files outside the repo.
 *
 * Exits 1 on any unresolved claim; exits 0 otherwise.
 */
import { join } from "@std/path";

export type EvidenceClaim = {
  sourceFile: string;
  sourceLine: number;
  targetFile: string;
  testName: string | null;
};

/** Marks any line we should scan for evidence refs. Anchored to avoid
 * false positives — we only care about explicit `Evidence:` claims,
 * not arbitrary `*_test.ts` mentions in prose. */
const EVIDENCE_LINE = /Evidence:/;

/** On an evidence line, find every test-file reference (possibly with a
 * `::testName` suffix, possibly backticked). Runs independently of where
 * `Evidence:` appears in the line — so a line citing `foo.ts` AND
 * `bar_test.ts::x` produces one claim for `bar_test.ts::x`. */
const TEST_REF = /`?([^`\s]+?_test\.(?:ts|tsx|js|mjs))(?:::([^`\n]+?))?`/g;

/** Fallback for unbacktickled refs: same shape, terminated by period+EOL,
 * comma, or end-of-line. Test names CAN contain whitespace — the terminator
 * is terminal punctuation, not internal spacing. Example:
 *   `Evidence: cli/src/foo_test.ts::my multi word test.` → name="my multi word test". */
const TEST_REF_UNQUOTED =
  /(?<![\w`/])([\w./-]+?_test\.(?:ts|tsx|js|mjs))(?:::([^\n`]+?))?(?=[,;]|\.\s|\.$|$)/g;

/** Extract all evidence claims from a markdown file. */
export function extractEvidenceClaims(
  sourceFile: string,
  content: string,
): EvidenceClaim[] {
  const claims: EvidenceClaim[] = [];
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!EVIDENCE_LINE.test(line)) continue;
    // Scan segment AFTER `Evidence:` so we don't pick up test refs from
    // unrelated prefix text on the same line.
    const tail = line.slice(line.indexOf("Evidence:") + "Evidence:".length);
    const seen = new Set<string>();
    const pushClaim = (targetFile: string, rawTestName: string | null) => {
      const testName = rawTestName?.replace(/[.,;:`]+$/, "").trim() || null;
      const key = `${targetFile}::${testName ?? ""}`;
      if (seen.has(key)) return;
      seen.add(key);
      claims.push({ sourceFile, sourceLine: i + 1, targetFile, testName });
    };
    for (const m of tail.matchAll(TEST_REF)) {
      pushClaim(m[1], m[2] ?? null);
    }
    for (const m of tail.matchAll(TEST_REF_UNQUOTED)) {
      pushClaim(m[1], m[2] ?? null);
    }
  }
  return claims;
}

/** Test-literal patterns: Deno.test("name", ...), it("name", ...),
 * test("name", ...). The validator only needs the string literal to
 * exist somewhere in the file — exact caller shape is not material. */
const TEST_LITERAL_PATTERNS = [
  /Deno\.test\s*\(\s*(["'])([^"']+)\1/g,
  /Deno\.test\s*\(\s*\{\s*name:\s*(["'])([^"']+)\1/g,
  /\b(?:it|test)\s*\(\s*(["'])([^"']+)\1/g,
];

/** Extract every test name literal from a test file body. */
export function extractTestNames(content: string): Set<string> {
  const names = new Set<string>();
  for (const pat of TEST_LITERAL_PATTERNS) {
    for (const m of content.matchAll(pat)) {
      names.add(m[2]);
    }
  }
  return names;
}

/** Resolve each claim: file must exist; test name (if given) must appear. */
export async function validateClaims(
  root: string,
  claims: EvidenceClaim[],
): Promise<string[]> {
  const errors: string[] = [];
  const fileCache = new Map<string, string | null>();
  for (const c of claims) {
    const absPath = join(root, c.targetFile);
    let body = fileCache.get(absPath);
    if (body === undefined) {
      try {
        body = await Deno.readTextFile(absPath);
      } catch {
        body = null;
      }
      fileCache.set(absPath, body);
    }
    if (body === null) {
      errors.push(
        `${c.sourceFile}:${c.sourceLine}: evidence references missing file ${c.targetFile}`,
      );
      continue;
    }
    if (c.testName === null) continue;
    const names = extractTestNames(body);
    // Substring match — test names often appended with filter suffix.
    const hit = [...names].some(
      (n) => n === c.testName || n.includes(c.testName!),
    );
    if (!hit) {
      errors.push(
        `${c.sourceFile}:${c.sourceLine}: evidence references test "${c.testName}" not found in ${c.targetFile}`,
      );
    }
  }
  return errors;
}

if (import.meta.main) {
  console.log("Checking SRS/SDS evidence claims...");
  const root = Deno.cwd();
  const docs = ["documents/requirements.md", "documents/design.md"];
  const claims: EvidenceClaim[] = [];
  for (const doc of docs) {
    const path = join(root, doc);
    let content: string;
    try {
      content = await Deno.readTextFile(path);
    } catch {
      console.warn(`Warning: ${doc} not found, skipping.`);
      continue;
    }
    claims.push(...extractEvidenceClaims(doc, content));
  }
  if (claims.length === 0) {
    console.log("No evidence claims found (nothing to validate).");
    Deno.exit(0);
  }
  const errors = await validateClaims(root, claims);
  if (errors.length > 0) {
    for (const e of errors) {
      console.error(`❌ ${e}`);
    }
    console.error(
      `\n${errors.length} broken evidence claim(s) across ${claims.length} total.`,
    );
    Deno.exit(1);
  }
  console.log(`✅ All ${claims.length} evidence claim(s) resolve.`);
}
