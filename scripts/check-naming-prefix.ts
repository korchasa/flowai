/**
 * Validates framework primitive source names.
 *
 * Checks:
 * - NP-1: Skills, agents and hooks must NOT use the retired "flowai-" source prefix.
 * - NP-2: retired with the user-only `commands/` kind (FR-PACKS.AGENT-COMMIT).
 * - NP-3: Skills under `<pack>/skills/` must not use the retired skill-name infix.
 * - NP-4: Installed skill names must be unique across packs because every pack installs into `.{ide}/skills/`.
 * - NP-5: Primitive names must not repeat their owning pack prefix.
 *
 * NP-3 keeps the retired skill-name namespace out of new primitives after the
 * naming migration.
 *
 * Exits with code 1 if any violation is found.
 */
import { join } from "@std/path";

const RETIRED_SKILL_PREFIX = "flowai-" + "skill-";
const RETIRED_SOURCE_PREFIX = "flowai-";
const SHORT_NAME_RE = /^[a-z0-9][a-z0-9-]*$/;
const PACK_ALIAS_SEGMENTS: Readonly<Record<string, readonly string[]>> = {
  typescript: ["ts"],
};

export type NamingError = {
  name: string;
  kind: "skill" | "agent" | "hook";
  criterion: string;
  message: string;
};

/**
 * Validates that a primitive source name is short and matches the
 * kind-specific convention.
 */
export function validateNamingPrefix(
  name: string,
  kind: "skill" | "agent" | "hook",
  packName?: string,
): NamingError[] {
  if (name.length === 0) {
    return [{
      name,
      kind,
      criterion: "NP-1",
      message: `${kind} name is empty`,
    }];
  }

  if (!SHORT_NAME_RE.test(name)) {
    return [{
      name,
      kind,
      criterion: "NP-1",
      message:
        `${kind} '${name}' must be kebab-case lowercase alphanumeric with hyphens`,
    }];
  }

  // NP-3: the retired skill-name namespace stays out of new skills.
  if (kind === "skill" && name.startsWith(RETIRED_SKILL_PREFIX)) {
    return [{
      name,
      kind,
      criterion: "NP-3",
      message: `skill '${name}' must not use the retired skill-name infix`,
    }];
  }

  if (
    name.startsWith(RETIRED_SOURCE_PREFIX)
  ) {
    return [{
      name,
      kind,
      criterion: "NP-1",
      message:
        `${kind} '${name}' must not use retired source prefix '${RETIRED_SOURCE_PREFIX}'`,
    }];
  }

  if (packName && name.startsWith(`${packName}-`)) {
    return [{
      name,
      kind,
      criterion: "NP-5",
      message:
        `${kind} '${name}' must not repeat owning pack prefix '${packName}-'`,
    }];
  }

  const aliases = packName ? PACK_ALIAS_SEGMENTS[packName] ?? [] : [];
  const nameSegments = name.split("-");
  for (const alias of aliases) {
    if (nameSegments.includes(alias)) {
      return [{
        name,
        kind,
        criterion: "NP-5",
        message:
          `${kind} '${name}' must not repeat owning pack alias '${alias}'`,
      }];
    }
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
          errors.push(...validateNamingPrefix(entry.name, "skill", pack.name));
          const owners = installedSkillNames.get(entry.name) ?? [];
          owners.push(`${pack.name}/skills`);
          installedSkillNames.set(entry.name, owners);
        }
      }
    } catch { /* no skills/ */ }

    // Agents: each .md file in <pack>/agents/ (excluding non-agent docs)
    const agentsDir = join(packPath, "agents");
    try {
      for await (const entry of Deno.readDir(agentsDir)) {
        if (entry.isFile && entry.name.endsWith(".md")) {
          const stem = entry.name.replace(/\.md$/, "");
          errors.push(...validateNamingPrefix(stem, "agent", pack.name));
        }
      }
    } catch { /* no agents/ */ }

    // Hooks: each subdirectory in <pack>/hooks/
    const hooksDir = join(packPath, "hooks");
    try {
      for await (const entry of Deno.readDir(hooksDir)) {
        if (entry.isDirectory) {
          errors.push(...validateNamingPrefix(entry.name, "hook", pack.name));
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
    "Checking primitive source names (NP-1/NP-5: primitives must be unprefixed)...",
  );

  const errors = await validateAllNamingPrefixes("framework");

  if (errors.length > 0) {
    for (const e of errors) {
      console.error(`❌ [${e.criterion}] ${e.kind} '${e.name}': ${e.message}`);
    }
    console.error(`\n${errors.length} violation(s) found.`);
    Deno.exit(1);
  } else {
    console.log(
      "✅ All primitive source names follow the short-name contract.",
    );
  }
}
