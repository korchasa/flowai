import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { join } from "@std/path";
import {
  DEFAULT_DIST_DIR,
  findCrossPackRefs,
  findDistLeaks,
  findLeakedFiles,
  LEAKED_DIRNAMES,
  LEAKED_FILENAMES,
  parseDistArg,
} from "./check-pack-refs.ts";

const primitiveMap = new Map([
  ["commit", "core"],
  ["plan", "core"],
  ["fix-tests", "engineering"],
  ["deep-research", "engineering"],
  ["engineer-skill", "devtools"],
  ["cli", "deno"],
]);

// --- Allowed references ---

Deno.test("pack-refs: intra-pack reference is OK", () => {
  const content = "See `fix-tests` for details.";
  const errors = findCrossPackRefs(
    content,
    "engineering",
    "framework/engineering/skills/x/SKILL.md",
    primitiveMap,
  );
  assertEquals(errors, []);
});

Deno.test("pack-refs: non-core referencing core is OK", () => {
  const content = "Works with `commit` command.";
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
  const content = "Delegate to `fix-tests`.";
  const errors = findCrossPackRefs(
    content,
    "core",
    "framework/core/skills/x/SKILL.md",
    primitiveMap,
  );
  assertEquals(errors.length, 1);
  assertEquals(errors[0].referencedName, "fix-tests");
  assertEquals(errors[0].referencedPack, "engineering");
  assertEquals(errors[0].pack, "core");
  assertEquals(errors[0].line, 1);
});

Deno.test("pack-refs: non-core-A referencing non-core-B is ERROR", () => {
  const content = "Use `engineer-skill` to create skills.";
  const errors = findCrossPackRefs(
    content,
    "engineering",
    "framework/engineering/skills/x/SKILL.md",
    primitiveMap,
  );
  assertEquals(errors.length, 1);
  assertEquals(errors[0].referencedName, "engineer-skill");
  assertEquals(errors[0].referencedPack, "devtools");
});

Deno.test("pack-refs: multiple violations on different lines", () => {
  const content = "Line 1\nUse `fix-tests`.\nAlso `deep-research`.";
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
  assertEquals(errors[1].referencedPack, "engineering");
});

Deno.test("pack-refs: one-word backticked names are ignored", () => {
  const content = "Set permission to `ask`; do not auto-`save` results.";
  const map = new Map([
    ["ask", "memex"],
    ["save", "memex"],
  ]);
  const errors = findCrossPackRefs(
    content,
    "devtools",
    "framework/devtools/skills/x/SKILL.md",
    map,
  );
  assertEquals(errors, []);
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

Deno.test("pack-refs: bare short names in prose are ignored", () => {
  const content = "Do a review, then commit the work. Do not pre-scaffold.";
  const errors = findCrossPackRefs(
    content,
    "core",
    "framework/core/skills/x/SKILL.md",
    primitiveMap,
  );
  assertEquals(errors, []);
});

Deno.test("pack-refs: core referencing core is OK", () => {
  const content = "See `plan` for planning.";
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

// --- Leakage gate over the rendered marketplace tree ---

Deno.test("leakage: dist gate reports a generator input left in the tree", async () => {
  await withTempTree(
    {
      "plugins/flowai/skills/commit/SKILL.md": "ok",
      "plugins/flowai/skills/_atom.md": "leak",
    },
    async (root) => {
      assertEquals(await findDistLeaks(root), [
        "plugins/flowai/skills/_atom.md",
      ]);
    },
  );
});

Deno.test("leakage: dist gate passes on a rendered tree with no inputs", async () => {
  await withTempTree(
    {
      "plugins/flowai/skills/commit/SKILL.md": "ok",
      ".claude-plugin/marketplace.json": "{}",
    },
    async (root) => {
      assertEquals(await findDistLeaks(root), []);
    },
  );
});

Deno.test("leakage: dist gate errors when the tree was never built", async () => {
  const root = await Deno.makeTempDir({ prefix: "flowai-dist-missing-" });
  await Deno.remove(root);
  await assertRejects(
    () => findDistLeaks(root),
    Error,
    "run `deno task build-plugins` first",
  );
});

Deno.test("leakage: default dist dir matches the build-plugins output path", () => {
  assertEquals(DEFAULT_DIST_DIR, "dist/claude-plugins");
});

Deno.test("leakage: no --dist flag selects the default tree", () => {
  assertEquals(parseDistArg(["--leakage"]), DEFAULT_DIST_DIR);
});

Deno.test("leakage: --dist takes the path that follows it", () => {
  assertEquals(
    parseDistArg(["--leakage", "--dist", "build/tree"]),
    "build/tree",
  );
});

Deno.test("leakage: a bare --dist is an error, not a silent default", () => {
  assertThrows(
    () => parseDistArg(["--leakage", "--dist"]),
    Error,
    "--dist needs a path",
  );
});

Deno.test("leakage: --dist does not swallow the next flag as its path", () => {
  assertThrows(
    () => parseDistArg(["--dist", "--leakage"]),
    Error,
    "--dist needs a path",
  );
});
