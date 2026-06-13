/**
 * Deterministic gate for FR-MAINT-SCAN (Parallel Read-Only Scan Delegation).
 *
 * The maintenance Scan Phase fans out its 16 audit categories to 5 specialized
 * SELF-CONTAINED read-only `maintenance-scan-*` subagents, one per thematic
 * bucket. Four invariants make that safe, and all are STATIC (no LLM run can
 * verify them more strongly than a parse):
 *
 *   1. The 5 agents' declared category sets (the `(Cats …)` clause in each
 *      description) partition categories 1..16 exactly once — no category is
 *      dropped (silent coverage loss) or double-owned (duplicate findings
 *      across workers).
 *   2. Each agent is confined to read-only at the tool layer, so a delegated
 *      scan cannot mutate the project regardless of prompt.
 *   3. Each agent is self-contained: its body embeds a `### Cat <n>` check
 *      block for EVERY declared category and references no skill file and no
 *      spawn-time payload placeholder — agents work with zero dependency on
 *      the maintenance skill's files.
 *   4. The superseded sources are gone: the legacy single-template worker and
 *      the skill-side detail files (`scan-buckets.md`,
 *      `architectural-categories.md`) do not exist, and SKILL.md no longer
 *      points at them (no inline fallback — unavailable workers are reported
 *      loudly, never silently re-scanned from a stale copy).
 *
 * An LLM agent benchmark was deliberately NOT used: the harness lets the model
 * substitute a generic `Explore` subagent for the named agent, so a green
 * verdict would not depend on the agent definition at all (false test).
 */
import { assert, assertEquals } from "@std/assert";

const AGENTS_DIR = "framework/core/agents";
const SKILL_PATH = "framework/core/skills/maintenance/SKILL.md";
const REMOVED_PATHS = [
  `${AGENTS_DIR}/maintenance-scan-worker.md`,
  "framework/core/skills/maintenance/references/scan-buckets.md",
  "framework/core/skills/maintenance/references/architectural-categories.md",
];

/** Bucket → specialized agent file (5 agents, one per thematic bucket). */
const SCAN_AGENTS: Record<string, string> = {
  W1: `${AGENTS_DIR}/maintenance-scan-hygiene.md`,
  W2: `${AGENTS_DIR}/maintenance-scan-dependencies.md`,
  W3: `${AGENTS_DIR}/maintenance-scan-contracts.md`,
  W4: `${AGENTS_DIR}/maintenance-scan-docs.md`,
  W5: `${AGENTS_DIR}/maintenance-scan-coverage.md`,
};

/** Markers of dependency on skill files or spawn-time payloads. */
const DEPENDENCY_MARKERS = [
  "references/",
  "scan-buckets",
  "architectural-categories",
  "{categories}",
  "{reference_excerpts}",
];

/** Extract the YAML frontmatter block (between the first two `---` fences). */
function frontmatter(md: string): string {
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  return m ? m[1] : "";
}

/** Parse the `(Cats a, b, c)` clause from an agent's description line. */
function parseDeclaredCats(fm: string): number[] {
  const desc = fm.match(/^description:\s*(.+)$/m)?.[1] ?? "";
  const m = desc.match(/\(Cats?\s+([\d,\s]+)\)/);
  if (!m) return [];
  return m[1]
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => Number(s));
}

async function readAgent(bucket: string, path: string): Promise<string> {
  return await Deno.readTextFile(path).catch(() => {
    throw new Error(`missing specialized scan agent for ${bucket}: ${path}`);
  });
}

Deno.test("scan agents: declared categories partition 1..16 exactly once", async () => {
  const seen = new Map<number, string>();
  for (const [bucket, path] of Object.entries(SCAN_AGENTS)) {
    const cats = parseDeclaredCats(frontmatter(await readAgent(bucket, path)));
    assert(
      cats.length > 0,
      `${path}: description must carry a (Cats …) clause`,
    );
    for (const c of cats) {
      assert(
        Number.isInteger(c) && c >= 1 && c <= 16,
        `${bucket} declares out-of-range category ${c}`,
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
    "agent descriptions must cover categories 1..16 exactly",
  );
});

Deno.test("scan agents: confined read-only at the tool layer", async () => {
  for (const [bucket, path] of Object.entries(SCAN_AGENTS)) {
    const fm = frontmatter(await readAgent(bucket, path));
    assert(fm.length > 0, `${path}: agent file must have YAML frontmatter`);

    const disallow = fm.match(/^disallowedTools:\s*(.+)$/m)?.[1] ?? "";
    assert(
      /\bWrite\b/.test(disallow) && /\bEdit\b/.test(disallow),
      `${path}: disallowedTools must include Write and Edit (got: "${disallow}")`,
    );
    assert(
      /^readonly:\s*true\s*$/m.test(fm),
      `${path}: frontmatter must set readonly: true`,
    );
    assert(
      /^mode:\s*subagent\s*$/m.test(fm),
      `${path}: frontmatter must set mode: subagent`,
    );
  }
});

Deno.test("scan agents: self-contained — embedded check detail, zero skill-file dependencies", async () => {
  for (const [bucket, path] of Object.entries(SCAN_AGENTS)) {
    const md = await readAgent(bucket, path);
    const fm = frontmatter(md);

    assert(
      new RegExp(`\\b${bucket}\\b`).test(fm),
      `${path}: description must name its bucket ${bucket}`,
    );
    for (const c of parseDeclaredCats(fm)) {
      assert(
        new RegExp(`^###\\s+Cat\\s+${c}\\b`, "m").test(md),
        `${path}: body must embed a "### Cat ${c}" check block (self-contained detail)`,
      );
    }
    for (const marker of DEPENDENCY_MARKERS) {
      assert(
        !md.includes(marker),
        `${path}: must not depend on skill files or spawn payloads (found "${marker}")`,
      );
    }
  }
});

Deno.test("scan delegation: superseded sources removed, SKILL.md decoupled", async () => {
  for (const path of REMOVED_PATHS) {
    const exists = await Deno.stat(path).then(() => true).catch(() => false);
    assert(
      !exists,
      `${path} must not exist — detail lives in the 5 self-contained maintenance-scan-* agents`,
    );
  }

  const skill = await Deno.readTextFile(SKILL_PATH);
  for (const marker of ["scan-buckets", "architectural-categories"]) {
    assert(
      !skill.includes(marker),
      `${SKILL_PATH} must not reference removed detail file "${marker}"`,
    );
  }
});
