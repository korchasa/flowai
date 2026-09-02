/**
 * Tests for audit.ts — the deterministic memex audit script.
 *
 * Fixtures use SALP grammar (`[REF:mx-<type>:<slug>]`) — wikilinks are no
 * longer parsed (post-SALP migration, see FR-DOC-ANCHORS in SRS).
 */

import { assertEquals } from "jsr:@std/assert";
import { audit } from "./audit.ts";

async function makeMemex(layout: Record<string, string>): Promise<string> {
  const dir = await Deno.makeTempDir({ prefix: "audit-test-" });
  await Deno.mkdir(`${dir}/pages`, { recursive: true });
  await Deno.mkdir(`${dir}/pages/answers`, { recursive: true });
  for (const [path, content] of Object.entries(layout)) {
    const full = `${dir}/pages/${path}`;
    const parent = full.substring(0, full.lastIndexOf("/"));
    await Deno.mkdir(parent, { recursive: true });
    await Deno.writeTextFile(full, content);
  }
  return dir;
}

const concept = (title: string, body: string) =>
  `---\ndate: 2026-04-27\ntype: concept\nstatus: active\ntags: [demo]\n---\n# ${title}\n\n${body}\n`;

Deno.test("audit parses SALP references only", async () => {
  // Smoke test: the parser MUST recognise the SALP grammar (with optional
  // display) and ignore residual non-SALP brackets like `[[wikilink]]`.
  const dir = await makeMemex({
    "index.md": "# Index\n## Demo\n- [REF:mx-concept:hello | Hello]\n",
    "hello.md": concept(
      "Hello",
      "Refers to [REF:mx-concept:other-page].\n\n## Counter-Arguments and Gaps\n- none",
    ),
    "other-page.md": concept(
      "Other",
      "Refers to [REF:mx-concept:hello].\n\n## Counter-Arguments and Gaps\n- none",
    ),
  });
  const issues = await audit(`${dir}/pages`);
  // hello / other-page both linked; index only mentions hello → other-page
  // is INDEX_MISSING but otherwise no DEAD_LINK / ORPHAN expected.
  assertEquals(
    issues.some((i) => i.startsWith("DEAD_LINK")),
    false,
    `unexpected DEAD_LINK in ${JSON.stringify(issues)}`,
  );
  await Deno.remove(dir, { recursive: true });
});

Deno.test("audit flags dead links", async () => {
  const dir = await makeMemex({
    "index.md": "# Index\n## Demo\n- [REF:mx-concept:hello]\n",
    "hello.md": concept(
      "Hello",
      "Refers to [REF:mx-concept:ghost].\n\n## Counter-Arguments and Gaps\n- none",
    ),
  });
  const issues = await audit(`${dir}/pages`);
  assertEquals(
    issues.some((i) => i.startsWith("DEAD_LINK") && i.includes("ghost")),
    true,
    `expected DEAD_LINK in ${JSON.stringify(issues)}`,
  );
  await Deno.remove(dir, { recursive: true });
});

Deno.test("audit flags orphan pages", async () => {
  const dir = await makeMemex({
    "index.md":
      "# Index\n## Demo\n- [REF:mx-concept:hub]\n- [REF:mx-concept:orphaned]\n",
    "hub.md": concept(
      "Hub",
      "No links out.\n\n## Counter-Arguments and Gaps\n- none",
    ),
    "orphaned.md": concept(
      "Orphaned",
      "Nothing links to me.\n\n## Counter-Arguments and Gaps\n- none",
    ),
  });
  const issues = await audit(`${dir}/pages`);
  assertEquals(
    issues.some((i) => i.includes("ORPHAN: hub.md")),
    true,
    `expected ORPHAN: hub.md in ${JSON.stringify(issues)}`,
  );
  assertEquals(
    issues.some((i) => i.includes("ORPHAN: orphaned.md")),
    true,
    `expected ORPHAN: orphaned.md in ${JSON.stringify(issues)}`,
  );
  await Deno.remove(dir, { recursive: true });
});

Deno.test("audit flags concept missing Counter-Arguments and Gaps section", async () => {
  const dir = await makeMemex({
    "index.md": "# Index\n## Demo\n- [REF:mx-concept:hello]\n",
    "hello.md":
      "---\ndate: 2026-04-27\ntype: concept\nstatus: active\ntags: [demo]\n---\n# Hello\n\nNo gaps section.\n",
  });
  const issues = await audit(`${dir}/pages`);
  assertEquals(
    issues.some((i) => i.includes("MISSING_SECTION: hello.md")),
    true,
    `expected MISSING_SECTION in ${JSON.stringify(issues)}`,
  );
  await Deno.remove(dir, { recursive: true });
});

Deno.test("audit detects index drift (missing entry and dead row)", async () => {
  const dir = await makeMemex({
    "index.md": "# Index\n## Demo\n- [REF:mx-concept:ghost]\n",
    "real.md": concept(
      "Real",
      "Body.\n\n## Counter-Arguments and Gaps\n- none",
    ),
  });
  const issues = await audit(`${dir}/pages`);
  assertEquals(
    issues.some((i) => i.includes("INDEX_MISSING: real.md")),
    true,
    `expected INDEX_MISSING in ${JSON.stringify(issues)}`,
  );
  assertEquals(
    issues.some((i) => i.includes("INDEX_DEAD") && i.includes("ghost")),
    true,
    `expected INDEX_DEAD in ${JSON.stringify(issues)}`,
  );
  await Deno.remove(dir, { recursive: true });
});

Deno.test("audit passes on a clean memex", async () => {
  const dir = await makeMemex({
    "index.md":
      "# Index\n## Demo\n- [REF:mx-concept:a | A]\n- [REF:mx-concept:b | B]\n",
    "a.md": concept(
      "A",
      "Links to [REF:mx-concept:b].\n\n## Counter-Arguments and Gaps\n- none",
    ),
    "b.md": concept(
      "B",
      "Links back to [REF:mx-concept:a].\n\n## Counter-Arguments and Gaps\n- none",
    ),
  });
  const issues = await audit(`${dir}/pages`);
  assertEquals(issues, [], `expected no issues, got ${JSON.stringify(issues)}`);
  await Deno.remove(dir, { recursive: true });
});

Deno.test("audit flags malformed SALP references", async () => {
  // A `[REF:...]` token that violates the mx-<type>:<slug> grammar should be
  // surfaced as MALFORMED_REF rather than silently dropped.
  const dir = await makeMemex({
    "index.md": "# Index\n## Demo\n- [REF:mx-concept:hello]\n",
    "hello.md": concept(
      "Hello",
      "Bad: [REF:wrong-ns:foo] and [REF:mx-concept:].\n\n## Counter-Arguments and Gaps\n- none",
    ),
  });
  const issues = await audit(`${dir}/pages`);
  assertEquals(
    issues.filter((i) => i.startsWith("MALFORMED_REF")).length >= 2,
    true,
    `expected ≥2 MALFORMED_REF in ${JSON.stringify(issues)}`,
  );
  await Deno.remove(dir, { recursive: true });
});

Deno.test("audit returns error for missing directory", async () => {
  const issues = await audit("/nonexistent-memex-dir-xyz");
  assertEquals(issues.length, 1);
  assertEquals(issues[0].startsWith("ERROR:"), true);
});
