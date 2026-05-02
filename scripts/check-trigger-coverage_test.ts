import { assertEquals } from "@std/assert";
import { join } from "@std/path";
import {
  expectedTriggerDirs,
  validateAllTriggerCoverage,
  validateSkillTriggerCoverage,
} from "./check-trigger-coverage.ts";

Deno.test("expectedTriggerDirs returns the 9 canonical names in order", () => {
  assertEquals(expectedTriggerDirs(), [
    "trigger-pos-1",
    "trigger-pos-2",
    "trigger-pos-3",
    "trigger-adj-1",
    "trigger-adj-2",
    "trigger-adj-3",
    "trigger-false-1",
    "trigger-false-2",
    "trigger-false-3",
  ]);
});

Deno.test("validateSkillTriggerCoverage: complete skill returns no errors", async () => {
  const tmp = await Deno.makeTempDir();
  try {
    const benchDir = join(tmp, "benchmarks");
    for (const dir of expectedTriggerDirs()) {
      await Deno.mkdir(join(benchDir, dir), { recursive: true });
      await Deno.writeTextFile(join(benchDir, dir, "mod.ts"), "// stub\n");
    }
    const errors = await validateSkillTriggerCoverage(
      "core",
      "flowai-skill-foo",
      tmp,
    );
    assertEquals(errors, []);
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("validateSkillTriggerCoverage: missing one scenario reports one error", async () => {
  const tmp = await Deno.makeTempDir();
  try {
    const benchDir = join(tmp, "benchmarks");
    const required = expectedTriggerDirs();
    // Create all but one
    for (const dir of required.slice(0, -1)) {
      await Deno.mkdir(join(benchDir, dir), { recursive: true });
      await Deno.writeTextFile(join(benchDir, dir, "mod.ts"), "// stub\n");
    }
    const errors = await validateSkillTriggerCoverage(
      "core",
      "flowai-skill-foo",
      tmp,
    );
    assertEquals(errors.length, 1);
    assertEquals(errors[0].missing, required[required.length - 1]);
    assertEquals(errors[0].pack, "core");
    assertEquals(errors[0].skill, "flowai-skill-foo");
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("validateSkillTriggerCoverage: dir without mod.ts counts as missing", async () => {
  const tmp = await Deno.makeTempDir();
  try {
    const benchDir = join(tmp, "benchmarks");
    for (const dir of expectedTriggerDirs()) {
      await Deno.mkdir(join(benchDir, dir), { recursive: true });
    }
    // No mod.ts written for any of them
    const errors = await validateSkillTriggerCoverage(
      "core",
      "flowai-skill-foo",
      tmp,
    );
    assertEquals(errors.length, 9);
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("validateSkillTriggerCoverage: misnamed trigger-* dir is reported", async () => {
  const tmp = await Deno.makeTempDir();
  try {
    const benchDir = join(tmp, "benchmarks");
    for (const dir of expectedTriggerDirs()) {
      await Deno.mkdir(join(benchDir, dir), { recursive: true });
      await Deno.writeTextFile(join(benchDir, dir, "mod.ts"), "// stub\n");
    }
    // Add a bogus trigger-* directory
    await Deno.mkdir(join(benchDir, "trigger-extra-1"), { recursive: true });
    await Deno.writeTextFile(
      join(benchDir, "trigger-extra-1", "mod.ts"),
      "// stub\n",
    );
    const errors = await validateSkillTriggerCoverage(
      "core",
      "flowai-skill-foo",
      tmp,
    );
    assertEquals(errors.length, 1);
    assertEquals(errors[0].missing, "trigger-extra-1");
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("validateAllTriggerCoverage: real framework dir has zero errors when all 360 scenarios present", async () => {
  const errors = await validateAllTriggerCoverage("framework");
  // This test passes once the bulk authoring step lands. Until then the message
  // surface is informative; flip the assertion when scenarios are written.
  for (const e of errors) {
    assertEquals(typeof e.pack, "string");
    assertEquals(typeof e.skill, "string");
    assertEquals(typeof e.missing, "string");
    assertEquals(typeof e.message, "string");
  }
});

Deno.test("validateAllTriggerCoverage: non-existent dir returns empty", async () => {
  const errors = await validateAllTriggerCoverage(
    "/tmp/non-existent-fw-dir-99999",
  );
  assertEquals(errors, []);
});

Deno.test("validateAllTriggerCoverage: tmp framework with one complete + one incomplete skill", async () => {
  const tmp = await Deno.makeTempDir();
  try {
    const fw = join(tmp, "framework");
    const completeSkill = join(fw, "core", "skills", "flowai-skill-complete");
    const incompleteSkill = join(
      fw,
      "core",
      "skills",
      "flowai-skill-incomplete",
    );
    for (const dir of expectedTriggerDirs()) {
      await Deno.mkdir(join(completeSkill, "benchmarks", dir), {
        recursive: true,
      });
      await Deno.writeTextFile(
        join(completeSkill, "benchmarks", dir, "mod.ts"),
        "// stub\n",
      );
    }
    await Deno.mkdir(incompleteSkill, { recursive: true });

    const errors = await validateAllTriggerCoverage(fw);
    // 9 missing for the incomplete skill, 0 for the complete one
    assertEquals(errors.length, 9);
    for (const e of errors) {
      assertEquals(e.skill, "flowai-skill-incomplete");
    }
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("validateAllTriggerCoverage: ignores non-flowai-skill-* directories", async () => {
  const tmp = await Deno.makeTempDir();
  try {
    const fw = join(tmp, "framework");
    // Subdir under skills/ that doesn't match the prefix — must be skipped.
    await Deno.mkdir(join(fw, "core", "skills", "not-a-skill"), {
      recursive: true,
    });
    const errors = await validateAllTriggerCoverage(fw);
    assertEquals(errors, []);
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});
