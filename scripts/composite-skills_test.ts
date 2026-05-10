import { assertEquals } from "@std/assert";
import { COMPOSITE_SKILLS, isComposite } from "./composite-skills.ts";

Deno.test("COMPOSITE_SKILLS list matches SYNC_CHECKS in check-skill-sync.ts", async () => {
  // Source-of-truth check: COMPOSITE_SKILLS is the canonical list consumed by
  // check-skills.ts; SYNC_CHECKS in check-skill-sync.ts is the canonical list
  // consumed by the sync verifier. They must agree, otherwise a composite
  // could either (a) be exempted from the token cap without sync coverage, or
  // (b) be sync-checked while still hitting the token cap. Drift = silent bug.
  const syncSource = await Deno.readTextFile("scripts/check-skill-sync.ts");
  const compositeNames = new Set<string>();
  // Each SYNC_CHECKS entry has the form `composite: "<name>"`.
  const re = /composite:\s*"([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(syncSource)) !== null) {
    compositeNames.add(m[1]);
  }

  const declared = new Set<string>(COMPOSITE_SKILLS);
  assertEquals(
    [...compositeNames].sort(),
    [...declared].sort(),
    "COMPOSITE_SKILLS in composite-skills.ts must match the `composite:` keys in SYNC_CHECKS",
  );
});

Deno.test("isComposite returns true for known composites", () => {
  for (const name of COMPOSITE_SKILLS) {
    assertEquals(isComposite(name), true, `${name} should be composite`);
  }
});

Deno.test("isComposite returns false for non-composites", () => {
  assertEquals(isComposite("flowai-skill-plan"), false);
  assertEquals(isComposite("flowai-commit"), false);
  assertEquals(isComposite("nonexistent-skill"), false);
});

Deno.test("COMPOSITE_SKILLS contains the expected skills", () => {
  // Lock the current composite roster so accidental additions/removals fail
  // loudly. Update this when intentionally adding a new composite.
  assertEquals(
    [...COMPOSITE_SKILLS].sort(),
    [
      "flowai-do-with-plan",
      "flowai-review-and-commit",
      "flowai-review-and-commit-beta",
    ].sort(),
  );
});
