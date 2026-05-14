/**
 * Validates that all framework primitives (skills, commands, agents, hooks) use the expected name prefix.
 *
 * Checks:
 * - NP-1: All primitives must start with "flowai-".
 * - NP-2: Commands under `<pack>/commands/` must match `/^flowai-/` AND must not use the retired skill-name infix.
 * - NP-3: Skills under `<pack>/skills/` must match `/^flowai-/` AND must not use the retired skill-name infix.
 * - NP-4: Installed names must be unique across commands and skills because both install into `.{ide}/skills/`.
 *
 * NP-2 and NP-3 keep the retired skill-name namespace out of new
 * primitives after the naming migration.
 *
 * Exits with code 1 if any violation is found.
 */
import { join } from "@std/path";

const REQUIRED_PREFIX = "flowai-";
const RETIRED_SKILL_PREFIX = "flowai-" + "skill-";
// Command and skill names share `flowai-`; their kind is determined by path.
const COMMAND_PREFIX_RE = /^flowai-/;
const SKILL_PREFIX_RE = /^flowai-/;

export type NamingError = {
  name: string;
  kind: "skill" | "command" | "agent" | "hook";
  criterion: string;
  message: string;
};

/**
 * Validates that a primitive name starts with the required prefix and matches
 * the kind-specific convention.
 */
export function validateNamingPrefix(
  name: string,
  kind: "skill" | "command" | "agent" | "hook",
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

  // NP-2 / NP-3: kind-specific prefix conventions for commands vs skills.
  // Commands are user-invoked workflows; skills are agent-invocable capabilities.
  // A name in the wrong shape for its directory is almost always a misplaced
  // primitive — surface it loudly at validation time.
  if (
    kind === "command" &&
    (!COMMAND_PREFIX_RE.test(name) || name.startsWith(RETIRED_SKILL_PREFIX))
  ) {
    return [{
      name,
      kind,
      criterion: "NP-2",
      message:
        `command '${name}' must start with 'flowai-' without the retired ` +
        `skill-name infix ` +
        `(retired skill-name prefix)`,
    }];
  }
  if (
    kind === "skill" &&
    (!SKILL_PREFIX_RE.test(name) || name.startsWith(RETIRED_SKILL_PREFIX))
  ) {
    return [{
      name,
      kind,
      criterion: "NP-3",
      message:
        `skill '${name}' must start with 'flowai-' without the retired ` +
        `skill-name infix ` +
        `(agent-invocable capability; kind is determined by skills/)`,
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
  const installedSkillNames = new Map<string, string[]>();

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
          const owners = installedSkillNames.get(entry.name) ?? [];
          owners.push(`${pack.name}/skills`);
          installedSkillNames.set(entry.name, owners);
        }
      }
    } catch { /* no skills/ */ }

    // Commands: each subdirectory in <pack>/commands/ (user-only primitives)
    const commandsDir = join(packPath, "commands");
    try {
      for await (const entry of Deno.readDir(commandsDir)) {
        if (entry.isDirectory) {
          errors.push(...validateNamingPrefix(entry.name, "command"));
          const owners = installedSkillNames.get(entry.name) ?? [];
          owners.push(`${pack.name}/commands`);
          installedSkillNames.set(entry.name, owners);
        }
      }
    } catch { /* no commands/ */ }

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

  for (const [name, owners] of installedSkillNames.entries()) {
    if (owners.length <= 1) continue;
    errors.push({
      name,
      kind: "skill",
      criterion: "NP-4",
      message: `installed skill name '${name}' is duplicated across ${
        owners.join(", ")
      }`,
    });
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
