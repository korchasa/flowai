/**
 * Tests for flowai-memex-audit.ts — the deterministic memex audit script.
 */

import { assertEquals } from "jsr:@std/assert";
import { audit } from "./flowai-memex-audit.ts";

async function makeMemex(layout: Record<string, string>): Promise<string> {
  const dir = await Deno.makeTempDir({ prefix: "memex-audit-test-" });
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

Deno.test("audit flags dead links", async () => {
  const dir = await makeMemex({
    "index.md": "# Index\n## Demo\n- [[hello]]\n",
    "hello.md": concept(
      "Hello",
      "Refers to [[ghost]].\n\n## Counter-Arguments and Gaps\n- none",
    ),
  });
  const issues = await audit(`${dir}/pages`);
  assertEquals(
    issues.some((i) => i.startsWith("DEAD_LINK: [[ghost]]")),
    true,
    `expected DEAD_LINK in ${JSON.stringify(issues)}`,
  );
  await Deno.remove(dir, { recursive: true });
});

Deno.test("audit flags orphan pages", async () => {
  const dir = await makeMemex({
    "index.md": "# Index\n## Demo\n- [[hub]]\n- [[orphaned]]\n",
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
    "index.md": "# Index\n## Demo\n- [[hello]]\n",
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
    "index.md": "# Index\n## Demo\n- [[ghost]]\n",
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
    issues.some((i) => i.includes("INDEX_DEAD: index.md references [[ghost]]")),
    true,
    `expected INDEX_DEAD in ${JSON.stringify(issues)}`,
  );
  await Deno.remove(dir, { recursive: true });
});

Deno.test("audit passes on a clean memex", async () => {
  const dir = await makeMemex({
    "index.md": "# Index\n## Demo\n- [[a]]\n- [[b]]\n",
    "a.md": concept(
      "A",
      "Links to [[b]].\n\n## Counter-Arguments and Gaps\n- none",
    ),
    "b.md": concept(
      "B",
      "Links back to [[a]].\n\n## Counter-Arguments and Gaps\n- none",
    ),
  });
  const issues = await audit(`${dir}/pages`);
  assertEquals(issues, [], `expected no issues, got ${JSON.stringify(issues)}`);
  await Deno.remove(dir, { recursive: true });
});

Deno.test("audit returns error for missing directory", async () => {
  const issues = await audit("/nonexistent-memex-dir-xyz");
  assertEquals(issues.length, 1);
  assertEquals(issues[0].startsWith("ERROR:"), true);
});
