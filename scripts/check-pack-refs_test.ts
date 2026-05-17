import { assertEquals } from "@std/assert";
import { join } from "@std/path";
import {
  checkCiExcludes,
  findCrossPackRefs,
  findLeakedFiles,
  LEAKED_DIRNAMES,
  LEAKED_FILENAMES,
} from "./check-pack-refs.ts";

const primitiveMap = new Map([
  ["flowai-commit", "core"],
  ["flowai-plan", "core"],
  ["flowai-fix-tests", "engineering"],
  ["flowai-deep-research", "engineering"],
  ["flowai-engineer-skill", "devtools"],
  ["flowai-deno-cli", "deno"],
]);

// --- Allowed references ---

Deno.test("pack-refs: intra-pack reference is OK", () => {
  const content = "See `flowai-fix-tests` for details.";
  const errors = findCrossPackRefs(
    content,
    "engineering",
    "framework/engineering/skills/x/SKILL.md",
    primitiveMap,
  );
  assertEquals(errors, []);
});

Deno.test("pack-refs: non-core referencing core is OK", () => {
  const content = "Works with `flowai-commit` command.";
  const errors = findCrossPackRefs(
    content,
    "engineering",
    "framework/engineering/skills/x/SKILL.md",
    primitiveMap,
  );
  assertEquals(errors, []);
});

// --- Forbidden references ---

Deno.test("pack-refs: core referencing non-core is ERROR", () => {
  const content = "Delegate to `flowai-fix-tests`.";
  const errors = findCrossPackRefs(
    content,
    "core",
    "framework/core/skills/x/SKILL.md",
    primitiveMap,
  );
  assertEquals(errors.length, 1);
  assertEquals(errors[0].referencedName, "flowai-fix-tests");
  assertEquals(errors[0].referencedPack, "engineering");
  assertEquals(errors[0].pack, "core");
  assertEquals(errors[0].line, 1);
});

Deno.test("pack-refs: non-core-A referencing non-core-B is ERROR", () => {
  const content = "Use `flowai-engineer-skill` to create skills.";
  const errors = findCrossPackRefs(
    content,
    "engineering",
    "framework/engineering/skills/x/SKILL.md",
    primitiveMap,
  );
  assertEquals(errors.length, 1);
  assertEquals(errors[0].referencedName, "flowai-engineer-skill");
  assertEquals(errors[0].referencedPack, "devtools");
});

Deno.test("pack-refs: multiple violations on different lines", () => {
  const content = "Line 1\nUse `flowai-fix-tests`.\nAlso `flowai-deno-cli`.";
  const errors = findCrossPackRefs(
    content,
    "devtools",
    "framework/devtools/skills/x/SKILL.md",
    primitiveMap,
  );
  assertEquals(errors.length, 2);
  assertEquals(errors[0].line, 2);
  assertEquals(errors[0].referencedPack, "engineering");
  assertEquals(errors[1].line, 3);
  assertEquals(errors[1].referencedPack, "deno");
});

Deno.test("pack-refs: no references means no errors", () => {
  const content = "# My Skill\n\nThis skill does generic things.";
  const errors = findCrossPackRefs(
    content,
    "core",
    "framework/core/skills/x/SKILL.md",
    primitiveMap,
  );
  assertEquals(errors, []);
});

Deno.test("pack-refs: core referencing core is OK", () => {
  const content = "See `flowai-plan` for planning.";
  const errors = findCrossPackRefs(
    content,
    "core",
    "framework/core/skills/x/SKILL.md",
    primitiveMap,
  );
  assertEquals(errors, []);
});

// --- Bundle-leakage gate (FR-SKILL-COMPOSE) ---

async function withTempTree<T>(
  layout: Record<string, string>,
  fn: (root: string) => Promise<T>,
): Promise<T> {
  const root = await Deno.makeTempDir({ prefix: "flowai-leak-test-" });
  try {
    for (const [rel, content] of Object.entries(layout)) {
      const full = join(root, rel);
      const parent = full.replace(/\/[^/]+$/, "");
      await Deno.mkdir(parent, { recursive: true });
      await Deno.writeTextFile(full, content);
    }
    return await fn(root);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
}

Deno.test("leakage: detects_leaked_atom in unpacked tree", async () => {
  await withTempTree(
    {
      "framework/core/skills/foo/SKILL.md": "ok",
      "framework/core/skills/foo/_atom.md": "leak",
    },
    async (root) => {
      const leaks = await findLeakedFiles(root);
      assertEquals(leaks, ["framework/core/skills/foo/_atom.md"]);
    },
  );
});

Deno.test("leakage: detects_leaked_composite in unpacked tree", async () => {
  await withTempTree(
    {
      "framework/core/commands/bar/SKILL.md": "ok",
      "framework/core/commands/bar/_composite.md": "leak",
    },
    async (root) => {
      const leaks = await findLeakedFiles(root);
      assertEquals(leaks, ["framework/core/commands/bar/_composite.md"]);
    },
  );
});

Deno.test("leakage: detects_leaked_manifest at top of framework/", async () => {
  await withTempTree(
    {
      "framework/composites.yaml": "schema_version: 1",
      "framework/core/skills/x/SKILL.md": "ok",
    },
    async (root) => {
      const leaks = await findLeakedFiles(root);
      assertEquals(leaks, ["framework/composites.yaml"]);
    },
  );
});

Deno.test("leakage: detects_leaked_atoms_dir at top of framework", async () => {
  await withTempTree(
    {
      "framework/atoms/push.md": "leak",
      "framework/core/skills/x/SKILL.md": "ok",
    },
    async (root) => {
      const leaks = await findLeakedFiles(root);
      assertEquals(leaks, ["framework/atoms/"]);
    },
  );
});

Deno.test("leakage: detects_leaked_composites_dir at top of framework", async () => {
  await withTempTree(
    {
      "framework/composites/ship.md": "leak",
      "framework/core/skills/x/SKILL.md": "ok",
    },
    async (root) => {
      const leaks = await findLeakedFiles(root);
      assertEquals(leaks, ["framework/composites/"]);
    },
  );
});

Deno.test("leakage: passes_on_clean_tarball (no leak files present)", async () => {
  await withTempTree(
    {
      "framework/core/skills/foo/SKILL.md": "ok",
      "framework/core/commands/bar/SKILL.md": "ok",
      "framework/core/pack.yaml": "id: core",
    },
    async (root) => {
      const leaks = await findLeakedFiles(root);
      assertEquals(leaks, []);
    },
  );
});

Deno.test("leakage: LEAKED_FILENAMES list is stable", () => {
  assertEquals([...LEAKED_FILENAMES], [
    "_atom.md",
    "_composite.md",
    "composites.yaml",
  ]);
});

Deno.test("leakage: LEAKED_DIRNAMES list is stable", () => {
  assertEquals([...LEAKED_DIRNAMES], ["atoms", "composites"]);
});

Deno.test("leakage: checkCiExcludes passes on the real .github/workflows/ci.yml", async () => {
  // After Commit 1 wires --exclude into ci.yml, this MUST return [].
  const missing = await checkCiExcludes(".github/workflows/ci.yml");
  assertEquals(missing, []);
});
