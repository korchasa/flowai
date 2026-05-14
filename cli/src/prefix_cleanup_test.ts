// [FR-DIST.CLEAN-PREFIX](../../documents/requirements.md#fr-dist.clean-prefix-prefix-based-orphan-cleanup) — unit tests for prefix-based orphan scan
import { assertEquals } from "@std/assert";
import { InMemoryFsAdapter } from "./adapters/fs.ts";
import { computePrefixOrphansPlan } from "./sync.ts";

Deno.test("computePrefixOrphansPlan - removes renamed skill dir", async () => {
  const fs = new InMemoryFsAdapter();
  // Old renamed primitive still on disk. writeFile auto-populates ancestor
  // dirs so /ide/skills exists for the readDir scan.
  await fs.writeFile("/ide/skills/flowai-old-plan/SKILL.md", "old");
  // Current bundle contains only the new name.
  await fs.writeFile("/ide/skills/flowai-plan/SKILL.md", "new");

  const plan = await computePrefixOrphansPlan(
    "/ide/skills",
    new Set(["flowai-plan"]),
    fs,
    "skill",
  );

  assertEquals(plan.length, 1);
  assertEquals(plan[0].name, "flowai-old-plan");
  assertEquals(plan[0].action, "delete");
  assertEquals(plan[0].targetPath, "/ide/skills/flowai-old-plan");
});

Deno.test("computePrefixOrphansPlan - removes renamed agent file (.md)", async () => {
  const fs = new InMemoryFsAdapter();
  await fs.writeFile("/ide/agents/flowai-old-agent.md", "old body");
  await fs.writeFile("/ide/agents/flowai-kept.md", "kept body");

  const plan = await computePrefixOrphansPlan(
    "/ide/agents",
    new Set(["flowai-kept"]),
    fs,
    "agent",
    { ext: ".md" },
  );

  assertEquals(plan.length, 1);
  assertEquals(plan[0].name, "flowai-old-agent");
  assertEquals(plan[0].action, "delete");
  assertEquals(plan[0].targetPath, "/ide/agents/flowai-old-agent.md");
});

Deno.test("computePrefixOrphansPlan - removes renamed codex sidecar (.toml)", async () => {
  const fs = new InMemoryFsAdapter();
  await fs.writeFile("/codex/agents/flowai-stale.toml", "stale");
  await fs.writeFile("/codex/agents/flowai-kept.toml", "kept");

  const plan = await computePrefixOrphansPlan(
    "/codex/agents",
    new Set(["flowai-kept"]),
    fs,
    "agent",
    { ext: ".toml" },
  );

  assertEquals(plan.length, 1);
  assertEquals(plan[0].name, "flowai-stale");
  assertEquals(plan[0].targetPath, "/codex/agents/flowai-stale.toml");
});

Deno.test("computePrefixOrphansPlan - preserves non-flowai entries", async () => {
  const fs = new InMemoryFsAdapter();
  // User-owned skill
  await fs.writeFile("/ide/skills/my-custom/SKILL.md", "x");
  // Third-party (paperclip)
  await fs.writeFile("/ide/skills/paperclip/SKILL.md", "y");

  const plan = await computePrefixOrphansPlan(
    "/ide/skills",
    new Set<string>(), // nothing to keep
    fs,
    "skill",
  );

  // Neither matches flowai- prefix → no deletions.
  assertEquals(plan.length, 0);
});

Deno.test("computePrefixOrphansPlan - skips symlinks", async () => {
  const fs = new InMemoryFsAdapter();
  await fs.mkdir("/ide/skills");
  await fs.symlink(
    "/elsewhere/flowai-foo",
    "/ide/skills/flowai-foo",
  );

  const plan = await computePrefixOrphansPlan(
    "/ide/skills",
    new Set<string>(), // nothing kept → would delete if not symlink
    fs,
    "skill",
  );

  assertEquals(
    plan.length,
    0,
    "symlink with flowai- prefix must not be deleted",
  );
});

Deno.test("computePrefixOrphansPlan - empty plan when no orphans", async () => {
  const fs = new InMemoryFsAdapter();
  await fs.writeFile("/ide/skills/flowai-a/SKILL.md", "a");

  const plan = await computePrefixOrphansPlan(
    "/ide/skills",
    new Set(["flowai-a"]),
    fs,
    "skill",
  );

  assertEquals(plan.length, 0);
});

Deno.test("computePrefixOrphansPlan - empty plan when target dir missing", async () => {
  const fs = new InMemoryFsAdapter();
  const plan = await computePrefixOrphansPlan(
    "/nope",
    new Set<string>(),
    fs,
    "skill",
  );
  assertEquals(plan.length, 0);
});

Deno.test("computePrefixOrphansPlan - custom prefix", async () => {
  const fs = new InMemoryFsAdapter();
  await fs.writeFile("/ide/skills/custom-old/SKILL.md", "x");
  await fs.writeFile("/ide/skills/flowai-plan/SKILL.md", "y");

  const plan = await computePrefixOrphansPlan(
    "/ide/skills",
    new Set<string>(),
    fs,
    "skill",
    { prefix: "custom-" },
  );

  assertEquals(plan.length, 1);
  assertEquals(plan[0].name, "custom-old");
});
