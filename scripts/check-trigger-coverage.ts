// [FR-BENCH.TRIGGER](../documents/requirements.md#fr-bench.trigger-skill-description-matching-verification) — every skill MUST have 9 trigger scenarios (3 pos + 3 adj + 3 false).
/**
 * Validates that every skill in `framework/<pack>/skills/flowai-skill-*` has
 * the full set of 9 trigger benchmark scenarios required by FR-BENCH.TRIGGER.
 *
 * For each skill the following 9 directories must exist with a `mod.ts`:
 *   benchmarks/trigger-pos-{1,2,3}/mod.ts
 *   benchmarks/trigger-adj-{1,2,3}/mod.ts
 *   benchmarks/trigger-false-{1,2,3}/mod.ts
 *
 * Commands (`framework/<pack>/commands/`) are exempt — they are user-only
 * primitives invoked via `/name` and do not participate in description-matching
 * routing decisions.
 *
 * Exits with code 1 if any skill is missing any of the 9 scenarios.
 */
import { join } from "@std/path";

export const TRIGGER_TYPES = ["pos", "adj", "false"] as const;
export const TRIGGER_INDEXES = [1, 2, 3] as const;

export type TriggerType = typeof TRIGGER_TYPES[number];

/** Returns the 9 expected trigger directory names per skill. */
export function expectedTriggerDirs(): string[] {
  const out: string[] = [];
  for (const type of TRIGGER_TYPES) {
    for (const n of TRIGGER_INDEXES) {
      out.push(`trigger-${type}-${n}`);
    }
  }
  return out;
}

export type CoverageError = {
  pack: string;
  skill: string;
  missing: string;
  message: string;
};

async function exists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch {
    return false;
  }
}

async function listDirs(path: string): Promise<string[]> {
  const out: string[] = [];
  try {
    for await (const entry of Deno.readDir(path)) {
      if (entry.isDirectory) out.push(entry.name);
    }
  } catch { /* missing dir */ }
  return out;
}

/**
 * Checks one skill directory for the 9 expected trigger scenario folders.
 * Each folder must contain a `mod.ts` file.
 */
export async function validateSkillTriggerCoverage(
  pack: string,
  skill: string,
  skillDir: string,
): Promise<CoverageError[]> {
  const errors: CoverageError[] = [];
  const benchDir = join(skillDir, "benchmarks");
  for (const name of expectedTriggerDirs()) {
    const dir = join(benchDir, name);
    const mod = join(dir, "mod.ts");
    if (!(await exists(mod))) {
      errors.push({
        pack,
        skill,
        missing: name,
        message:
          `Missing trigger scenario: ${dir}/mod.ts (required by FR-BENCH.TRIGGER)`,
      });
    }
  }

  // Surface stray trigger-* dirs that don't match the convention.
  const present = new Set(await listDirs(benchDir));
  for (const dir of present) {
    if (!dir.startsWith("trigger-")) continue;
    if (!expectedTriggerDirs().includes(dir)) {
      errors.push({
        pack,
        skill,
        missing: dir,
        message: `Misnamed trigger scenario directory: ${benchDir}/${dir} ` +
          `(allowed: ${expectedTriggerDirs().join(", ")})`,
      });
    }
  }

  return errors;
}

/**
 * Walks `frameworkDir/<pack>/skills/flowai-skill-*` and validates each.
 * Skips packs without a `skills/` subdir, and skill dirs that don't match
 * the `flowai-skill-*` prefix.
 */
export async function validateAllTriggerCoverage(
  frameworkDir: string,
): Promise<CoverageError[]> {
  const errors: CoverageError[] = [];

  const packs: Deno.DirEntry[] = [];
  try {
    for await (const entry of Deno.readDir(frameworkDir)) {
      if (entry.isDirectory) packs.push(entry);
    }
  } catch {
    return errors;
  }

  for (const pack of packs) {
    const skillsDir = join(frameworkDir, pack.name, "skills");
    const skills: Deno.DirEntry[] = [];
    try {
      for await (const entry of Deno.readDir(skillsDir)) {
        if (entry.isDirectory && entry.name.startsWith("flowai-skill-")) {
          skills.push(entry);
        }
      }
    } catch {
      continue;
    }
    for (const skill of skills) {
      const skillDir = join(skillsDir, skill.name);
      errors.push(
        ...(await validateSkillTriggerCoverage(
          pack.name,
          skill.name,
          skillDir,
        )),
      );
    }
  }

  return errors;
}

if (import.meta.main) {
  console.log(
    "Checking trigger benchmark coverage (FR-BENCH.TRIGGER: 9 scenarios per skill)...",
  );
  const errors = await validateAllTriggerCoverage("framework");

  if (errors.length > 0) {
    for (const e of errors) {
      console.error(
        `❌ [FR-BENCH.TRIGGER] ${e.pack}/${e.skill}: ${e.message}`,
      );
    }
    console.error(`\n${errors.length} violation(s) found.`);
    Deno.exit(1);
  } else {
    console.log(
      "✅ All skills have 9 trigger scenarios (3 pos + 3 adj + 3 false).",
    );
  }
}
