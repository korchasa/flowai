// [REF:fr:accept.trigger | FR-ACCEPT.TRIGGER] — every skill MUST have 3 trigger scenarios (1 pos + 1 adj + 1 false).
/**
 * Validates that every skill in `framework/<pack>/skills/*` has
 * the full set of 3 trigger benchmark scenarios required by FR-ACCEPT.TRIGGER.
 *
 * For each skill the following 3 directories must exist with a `mod.ts`:
 *   acceptance-tests/trigger-pos-1/mod.ts
 *   acceptance-tests/trigger-adj-1/mod.ts
 *   acceptance-tests/trigger-false-1/mod.ts
 *
 * Commands (`framework/<pack>/commands/`) are exempt — they are user-only
 * primitives invoked via `/name` and do not participate in description-matching
 * routing decisions.
 *
 * Exits with code 1 if any skill is missing any of the 3 scenarios. Stray
 * `trigger-{type}-{2,3,...}` directories are reported as misnamed (the
 * previous 3+3+3 layout was reduced to 1+1+1 on 2026-05-10).
 */
import { join } from "@std/path";

export const TRIGGER_TYPES = ["pos", "adj", "false"] as const;
export const TRIGGER_INDEXES = [1] as const;

export type TriggerType = typeof TRIGGER_TYPES[number];

/** Returns the 3 expected trigger directory names per skill. */
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
 * Checks one skill directory for the 3 expected trigger scenario folders.
 * Each folder must contain a `mod.ts` file.
 */
export async function validateSkillTriggerCoverage(
  pack: string,
  skill: string,
  skillDir: string,
): Promise<CoverageError[]> {
  const errors: CoverageError[] = [];
  const benchDir = join(skillDir, "acceptance-tests");
  for (const name of expectedTriggerDirs()) {
    const dir = join(benchDir, name);
    const mod = join(dir, "mod.ts");
    if (!(await exists(mod))) {
      errors.push({
        pack,
        skill,
        missing: name,
        message:
          `Missing trigger scenario: ${dir}/mod.ts (required by FR-ACCEPT.TRIGGER)`,
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
 * Walks `frameworkDir/<pack>/skills/*` and validates each.
 * Skips packs without a `skills/` subdir.
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
        if (entry.isDirectory) {
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

/** Minimum characters of evidence a `noPositiveTrigger` declaration must carry. */
export const NO_POSITIVE_TRIGGER_MIN_EVIDENCE = 80;

/**
 * Guard the `noPositiveTrigger` escape hatch.
 *
 * It retires a positive trigger as an accepted decision, so it must be hard to
 * reach by accident and impossible to reach silently. Two rules: it belongs
 * only on a `trigger-pos-*` scenario, and it must state the evidence — which
 * sweeps, how many runs, what the raw sessions showed. A one-word reason turns
 * a measured finding into a shrug, and the next reader cannot tell whether
 * anyone looked.
 *
 * Pure on purpose: takes the path and the source text, returns messages.
 */
export function validateNoPositiveTrigger(
  modPath: string,
  source: string,
): string[] {
  const match = source.match(/noPositiveTrigger\s*=\s*(["`'])/);
  if (!match) return [];

  const out: string[] = [];
  if (!/\/trigger-pos-\d+\/mod\.ts$/.test(modPath.replaceAll("\\", "/"))) {
    out.push(
      `${modPath}: noPositiveTrigger is only legitimate on a trigger-pos-* scenario. ` +
        `A failing adjacent, false-use or execution scenario is a defect to fix, not a trigger to retire.`,
    );
  }

  const quote = match[1];
  const start = (match.index ?? 0) + match[0].length;
  const end = source.indexOf(quote, start);
  const reason = end === -1 ? "" : source.slice(start, end);
  if (reason.trim().length < NO_POSITIVE_TRIGGER_MIN_EVIDENCE) {
    out.push(
      `${modPath}: noPositiveTrigger needs the evidence, not a label — name the sweeps, ` +
        `the run count and what the raw sessions showed (at least ${NO_POSITIVE_TRIGGER_MIN_EVIDENCE} characters).`,
    );
  }
  return out;
}

/** Walk every scenario `mod.ts` under framework/ and guard the escape hatch. */
export async function validateAllNoPositiveTrigger(
  frameworkDir: string,
): Promise<string[]> {
  const out: string[] = [];
  const walk = async (dir: string): Promise<void> => {
    let entries: Deno.DirEntry[];
    try {
      entries = [];
      for await (const e of Deno.readDir(dir)) entries.push(e);
    } catch {
      return;
    }
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory) {
        await walk(full);
      } else if (e.name === "mod.ts") {
        out.push(
          ...validateNoPositiveTrigger(full, await Deno.readTextFile(full)),
        );
      }
    }
  };
  await walk(frameworkDir);
  return out;
}

if (import.meta.main) {
  console.log(
    "Checking trigger benchmark coverage (FR-ACCEPT.TRIGGER: 3 scenarios per skill)...",
  );
  const errors = await validateAllTriggerCoverage("framework");
  const hatchErrors = await validateAllNoPositiveTrigger("framework");
  for (const m of hatchErrors) {
    console.error(`❌ [FR-ACCEPT.TRIGGER] ${m}`);
  }

  if (errors.length > 0 || hatchErrors.length > 0) {
    for (const e of errors) {
      console.error(
        `❌ [FR-ACCEPT.TRIGGER] ${e.pack}/${e.skill}: ${e.message}`,
      );
    }
    console.error(
      `\n${errors.length + hatchErrors.length} violation(s) found.`,
    );
    Deno.exit(1);
  } else {
    console.log(
      "✅ All skills have 3 trigger scenarios (1 pos + 1 adj + 1 false).",
    );
  }
}
