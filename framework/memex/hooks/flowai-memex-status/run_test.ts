/**
 * Tests for flowai-memex-status hook.
 */

import { assertEquals, assertStringIncludes } from "jsr:@std/assert";
import { formatStatus, gatherStatus } from "./run.ts";

async function makeFixture(): Promise<string> {
  const dir = await Deno.makeTempDir({ prefix: "memex-status-test-" });
  await Deno.mkdir(`${dir}/pages`, { recursive: true });
  await Deno.mkdir(`${dir}/raw/articles`, { recursive: true });
  await Deno.writeTextFile(`${dir}/AGENTS.md`, "# Schema\n");
  await Deno.writeTextFile(
    `${dir}/log.md`,
    [
      "# Log",
      "",
      "## [2026-04-25] save | First Source",
      "Saved.",
      "",
      "## [2026-04-26] audit | 2 issues, 1 fixed",
      "Cleaned.",
      "",
    ].join("\n"),
  );
  await Deno.writeTextFile(`${dir}/pages/index.md`, "# Index\n");
  await Deno.writeTextFile(
    `${dir}/pages/concept-a.md`,
    "---\ntype: concept\n---\n# A\nMentions [[2026-04-25-source-one]].\n",
  );
  await Deno.writeTextFile(
    `${dir}/raw/articles/2026-04-25-source-one.md`,
    "# Compiled\n",
  );
  return dir;
}

Deno.test("gatherStatus counts pages, sources, last log, last audit", async () => {
  const dir = await makeFixture();
  const status = await gatherStatus(dir);
  assertEquals(status.pageCount, 1, "expected 1 page (concept-a.md)");
  assertEquals(status.sourceCount, 1, "expected 1 raw source");
  assertEquals(status.lastAuditDate, "2026-04-26");
  assertStringIncludes(status.lastLog ?? "", "audit");
  assertEquals(status.uncompiled, 0, "source IS referenced by concept-a");
  await Deno.remove(dir, { recursive: true });
});

Deno.test("gatherStatus flags uncompiled sources", async () => {
  const dir = await makeFixture();
  for (let i = 0; i < 5; i++) {
    await Deno.writeTextFile(
      `${dir}/raw/articles/2026-04-27-extra-${i}.md`,
      "# Extra\n",
    );
  }
  const status = await gatherStatus(dir);
  assertEquals(status.uncompiled, 5);
  await Deno.remove(dir, { recursive: true });
});

Deno.test("formatStatus includes nudge when 5+ uncompiled", async () => {
  const dir = await makeFixture();
  const status = await gatherStatus(dir);
  // Force uncompiled high.
  status.uncompiled = 7;
  const out = formatStatus(status);
  assertStringIncludes(out, "uncompiled raw sources");
  assertStringIncludes(out, "flowai-memex-save");
  await Deno.remove(dir, { recursive: true });
});

Deno.test("formatStatus omits nudge when uncompiled below threshold", async () => {
  const dir = await makeFixture();
  const status = await gatherStatus(dir);
  status.uncompiled = 2;
  const out = formatStatus(status);
  assertEquals(
    out.includes("uncompiled raw sources"),
    false,
    "should NOT include save nudge below threshold",
  );
  await Deno.remove(dir, { recursive: true });
});
