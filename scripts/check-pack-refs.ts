/**
 * Validates that skills/agents do not have cross-pack references.
 *
 * Rules:
 * - Any pack may reference core primitives: OK
 * - Intra-pack references (same pack): OK
 * - Core referencing non-core: ERROR
 * - Non-core-A referencing non-core-B: ERROR
 *
 * Scans SKILL.md and agent .md files for backtick-quoted primitive names.
 */
import { join } from "@std/path";

export interface PackRefError {
  file: string;
  pack: string;
  referencedName: string;
  referencedPack: string;
  line: number;
}

/**
 * Builds a map of primitive name -> pack name.
 * Primitives: skill directory names + agent file stems.
 */
export async function buildPrimitiveMap(
  frameworkDir: string,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();

  for await (const pack of Deno.readDir(frameworkDir)) {
    if (!pack.isDirectory) continue;
    const packDir = join(frameworkDir, pack.name);

    // Check it's a real pack (has pack.yaml)
    try {
      await Deno.stat(join(packDir, "pack.yaml"));
    } catch {
      continue;
    }

    // Skills: directory names under skills/
    const skillsDir = join(packDir, "skills");
    try {
      for await (const skill of Deno.readDir(skillsDir)) {
        if (skill.isDirectory) {
          map.set(skill.name, pack.name);
        }
      }
    } catch { /* no skills/ */ }

    // Agents: file stems under agents/
    const agentsDir = join(packDir, "agents");
    try {
      for await (const agent of Deno.readDir(agentsDir)) {
        if (agent.isFile && agent.name.endsWith(".md")) {
          const stem = agent.name.replace(/\.md$/, "");
          map.set(stem, pack.name);
        }
      }
    } catch { /* no agents/ */ }
  }

  return map;
}

/**
 * Scans a file for references to primitives from forbidden packs.
 */
export function findCrossPackRefs(
  fileContent: string,
  filePack: string,
  filePath: string,
  primitiveMap: Map<string, string>,
): PackRefError[] {
  const errors: PackRefError[] = [];
  const lines = fileContent.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const [name, refPack] of primitiveMap) {
      // Skip same-pack and core references (non-core may reference core)
      if (refPack === filePack) continue;
      if (refPack === "core" && filePack !== "core") continue;

      // Match word-boundary references in any context (code, prose, comments).
      // NOTE: This catches references in prose text too, not just code/imports.
      // To avoid false positives, do not mention other packs' skill/agent names
      // verbatim — use generic descriptions instead.
      const pattern = new RegExp(`\\b${escapeRegex(name)}\\b`);
      if (pattern.test(line)) {
        errors.push({
          file: filePath,
          pack: filePack,
          referencedName: name,
          referencedPack: refPack,
          line: i + 1,
        });
      }
    }
  }

  return errors;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Validates all packs for cross-pack references.
 */
export async function validatePackRefs(
  frameworkDir: string,
): Promise<PackRefError[]> {
  const primitiveMap = await buildPrimitiveMap(frameworkDir);
  const allErrors: PackRefError[] = [];

  for await (const pack of Deno.readDir(frameworkDir)) {
    if (!pack.isDirectory) continue;
    const packDir = join(frameworkDir, pack.name);

    try {
      await Deno.stat(join(packDir, "pack.yaml"));
    } catch {
      continue;
    }

    // Scan SKILL.md files
    const skillsDir = join(packDir, "skills");
    try {
      for await (const skill of Deno.readDir(skillsDir)) {
        if (!skill.isDirectory) continue;
        const skillMdPath = join(skillsDir, skill.name, "SKILL.md");
        try {
          const content = await Deno.readTextFile(skillMdPath);
          const relPath =
            `framework/${pack.name}/skills/${skill.name}/SKILL.md`;
          allErrors.push(
            ...findCrossPackRefs(content, pack.name, relPath, primitiveMap),
          );
        } catch { /* no SKILL.md */ }
      }
    } catch { /* no skills/ */ }

    // Scan agent .md files
    const agentsDir = join(packDir, "agents");
    try {
      for await (const agent of Deno.readDir(agentsDir)) {
        if (!agent.isFile || !agent.name.endsWith(".md")) continue;
        const agentPath = join(agentsDir, agent.name);
        const content = await Deno.readTextFile(agentPath);
        const relPath = `framework/${pack.name}/agents/${agent.name}`;
        allErrors.push(
          ...findCrossPackRefs(content, pack.name, relPath, primitiveMap),
        );
      }
    } catch { /* no agents/ */ }
  }

  return allErrors;
}

if (import.meta.main) {
  console.log("Checking cross-pack references...");

  const errors = await validatePackRefs("framework");

  if (errors.length > 0) {
    for (const e of errors) {
      console.error(
        `[pack-ref] ${e.file}:${e.line}: '${e.referencedName}' (${e.referencedPack}) referenced from ${e.pack}`,
      );
    }
    console.error(`\n${errors.length} cross-pack reference violation(s).`);
    Deno.exit(1);
  } else {
    console.log("All pack references are valid.");
  }
}
