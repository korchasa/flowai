import { assertEquals } from "@std/assert";
import { findCrossPackRefs } from "./check-pack-refs.ts";

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
