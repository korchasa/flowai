/**
 * Deterministic gate for FR-MAINT-SCAN (Parallel Read-Only Scan Delegation).
 *
 * The maintenance Scan Phase may fan out its 16 audit categories to read-only
 * `maintenance-scan-worker` subagents, one per thematic bucket. Two invariants
 * make that safe, and both are STATIC (no LLM run can verify them more strongly
 * than a parse):
 *
 *   1. The 5 buckets in `scan-buckets.md` partition categories 1..16 exactly
 *      once — no category is dropped (silent coverage loss) or double-owned
 *      (duplicate findings across workers).
 *   2. The worker template is confined to read-only at the tool layer, so a
 *      delegated scan cannot mutate the project regardless of prompt.
 *
 * An LLM agent benchmark was deliberately NOT used: the harness lets the model
 * substitute a generic `Explore` subagent for the named agent, so a green
 * verdict would not depend on the agent definition at all (false test).
 */
import { assert, assertEquals } from "@std/assert";

const BUCKETS_PATH =
  "framework/core/skills/maintenance/references/scan-buckets.md";
const AGENT_PATH = "framework/core/agents/maintenance-scan-worker.md";

/** Parse `## W<n> — <theme> (Cats a, b, c)` headers into [bucket, categories]. */
function parseBuckets(md: string): Map<string, number[]> {
  const out = new Map<string, number[]>();
  const headerRe = /^##\s+(W\d+)\b.*\(Cats?\s+([\d,\s]+)\)/;
  for (const line of md.split("\n")) {
    const m = line.match(headerRe);
    if (!m) continue;
    const cats = m[2]
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => Number(s));
    out.set(m[1], cats);
  }
  return out;
}

/** Extract the YAML frontmatter block (between the first two `---` fences). */
function frontmatter(md: string): string {
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  return m ? m[1] : "";
}

Deno.test("scan-buckets: 5 buckets partition categories 1..16 exactly once", async () => {
  const md = await Deno.readTextFile(BUCKETS_PATH);
  const buckets = parseBuckets(md);

  assertEquals(buckets.size, 5, "expected exactly 5 W<n> bucket headers");

  const seen = new Map<number, string>();
  for (const [bucket, cats] of buckets) {
    for (const c of cats) {
      assert(
        Number.isInteger(c) && c >= 1 && c <= 16,
        `bucket ${bucket} lists out-of-range category ${c}`,
      );
      const prior = seen.get(c);
      assert(
        prior === undefined,
        `category ${c} is in both ${prior} and ${bucket} (must be disjoint)`,
      );
      seen.set(c, bucket);
    }
  }

  const covered = [...seen.keys()].sort((a, b) => a - b);
  const expected = Array.from({ length: 16 }, (_, i) => i + 1);
  assertEquals(
    covered,
    expected,
    "buckets must cover categories 1..16 exactly",
  );
});

Deno.test("maintenance-scan-worker: confined read-only at the tool layer", async () => {
  const md = await Deno.readTextFile(AGENT_PATH);
  const fm = frontmatter(md);
  assert(fm.length > 0, "agent file must have YAML frontmatter");

  const disallow = fm.match(/^disallowedTools:\s*(.+)$/m)?.[1] ?? "";
  assert(
    /\bWrite\b/.test(disallow) && /\bEdit\b/.test(disallow),
    `disallowedTools must include Write and Edit (got: "${disallow}")`,
  );
  assert(
    /^readonly:\s*true\s*$/m.test(fm),
    "frontmatter must set readonly: true",
  );
  assert(
    /^mode:\s*subagent\s*$/m.test(fm),
    "frontmatter must set mode: subagent",
  );
});
