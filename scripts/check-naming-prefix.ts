/**
 * Validates that all framework primitives (skills, agents, hooks) use the "flowai-" prefix.
 *
 * Checks:
 * - NP-1: All skill directories, agent .md files, and hook directories must start with "flowai-".
 *
 * Exits with code 1 if any violation is found.
 */
import { join } from "@std/path";

const REQUIRED_PREFIX = "flowai-";

export type NamingError = {
  name: string;
  kind: "skill" | "agent" | "hook";
  criterion: string;
  message: string;
};

/**
 * Validates that a primitive name starts with the required prefix.
 */
export function validateNamingPrefix(
  name: string,
  kind: "skill" | "agent" | "hook",
): NamingError[] {
  if (name.length === 0) {
    return [{
      name,
      kind,
      criterion: "NP-1",
      message: `${kind} name is empty`,
    }];
  }

  if (!name.startsWith(REQUIRED_PREFIX)) {
    return [{
      name,
      kind,
      criterion: "NP-1",
      message: `${kind} '${name}' must start with '${REQUIRED_PREFIX}' prefix`,
    }];
  }

  return [];
}

/**
 * Discovers and validates all primitives in the framework directory.
 */
export async function validateAllNamingPrefixes(
  frameworkDir: string,
): Promise<NamingError[]> {
  const errors: NamingError[] = [];

  let packs: Deno.DirEntry[];
  try {
    packs = [];
    for await (const entry of Deno.readDir(frameworkDir)) {
      if (entry.isDirectory) packs.push(entry);
    }
  } catch {
    return [];
  }

  for (const pack of packs) {
    const packPath = join(frameworkDir, pack.name);

    // Skills: each subdirectory in <pack>/skills/
    const skillsDir = join(packPath, "skills");
    try {
      for await (const entry of Deno.readDir(skillsDir)) {
        if (entry.isDirectory) {
          errors.push(...validateNamingPrefix(entry.name, "skill"));
        }
      }
    } catch { /* no skills/ */ }

    // Agents: each .md file in <pack>/agents/ (excluding non-agent docs)
    const agentsDir = join(packPath, "agents");
    try {
      for await (const entry of Deno.readDir(agentsDir)) {
        if (entry.isFile && entry.name.endsWith(".md")) {
          const stem = entry.name.replace(/\.md$/, "");
          errors.push(...validateNamingPrefix(stem, "agent"));
        }
      }
    } catch { /* no agents/ */ }

    // Hooks: each subdirectory in <pack>/hooks/
    const hooksDir = join(packPath, "hooks");
    try {
      for await (const entry of Deno.readDir(hooksDir)) {
        if (entry.isDirectory) {
          errors.push(...validateNamingPrefix(entry.name, "hook"));
        }
      }
    } catch { /* no hooks/ */ }
  }

  return errors;
}

if (import.meta.main) {
  console.log(
    "Checking naming prefix (NP-1: all primitives must use 'flowai-' prefix)...",
  );

  const errors = await validateAllNamingPrefixes("framework");

  if (errors.length > 0) {
    for (const e of errors) {
      console.error(`❌ [${e.criterion}] ${e.kind} '${e.name}': ${e.message}`);
    }
    console.error(`\n${errors.length} violation(s) found.`);
    Deno.exit(1);
  } else {
    console.log("✅ All primitives use 'flowai-' prefix.");
  }
}
