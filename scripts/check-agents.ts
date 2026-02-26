/**
 * check-agents.ts — Validate agent file sync and IDE-specific frontmatter correctness.
 *
 * Checks:
 * 1. Completeness: all IDE subdirs have identical sets of agent files.
 * 2. Body sync: system prompt (after frontmatter) is identical across IDE variants.
 * 3. Description sync: `description` field is identical across IDE variants.
 * 4. ID sync: Claude/Cursor `name` matches filename; OpenCode has no `name`.
 * 5. IDE-specific frontmatter correctness (required/forbidden fields per IDE).
 *
 * Usage: deno run -A scripts/check-agents.ts
 */

import { parse } from "@std/yaml";
import { join } from "@std/path";

const AGENTS_DIR = "framework/agents";
const IDE_SUBDIRS = ["claude", "cursor", "opencode"] as const;
type IDE = (typeof IDE_SUBDIRS)[number];

const errors: string[] = [];

function err(msg: string): void {
  errors.push(msg);
  console.error(`  \u274C ${msg}`);
}

/** Parse frontmatter and body from markdown file content. */
function parseFrontmatterAndBody(
  content: string,
): { fm: Record<string, unknown>; body: string } | null {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return null;
  const fm = parse(match[1]) as Record<string, unknown>;
  const body = match[2].trim();
  return { fm, body };
}

/** Read all .md files from an IDE agent subdir. Returns map: filename -> content. */
async function readAgentDir(
  ide: IDE,
): Promise<Map<string, string>> {
  const dir = join(AGENTS_DIR, ide);
  const files = new Map<string, string>();
  try {
    for await (const entry of Deno.readDir(dir)) {
      if (entry.isFile && entry.name.endsWith(".md")) {
        const content = await Deno.readTextFile(join(dir, entry.name));
        files.set(entry.name, content);
      }
    }
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      err(`IDE agent directory not found: ${dir}`);
    } else {
      throw e;
    }
  }
  return files;
}

/** Validate IDE-specific frontmatter fields. */
function validateFrontmatter(
  ide: IDE,
  filename: string,
  fm: Record<string, unknown>,
): void {
  const agentId = filename.replace(/\.md$/, "");
  const prefix = `${ide}/${filename}`;

  // Common: description is required everywhere
  if (typeof fm.description !== "string" || fm.description.trim() === "") {
    err(`${prefix}: missing or empty 'description'`);
  }

  switch (ide) {
    case "claude": {
      // Required: name
      if (typeof fm.name !== "string" || fm.name.trim() === "") {
        err(`${prefix}: missing or empty 'name'`);
      } else if (fm.name !== agentId) {
        err(`${prefix}: 'name' is '${fm.name}', expected '${agentId}'`);
      }
      // Forbidden
      if ("mode" in fm) err(`${prefix}: forbidden field 'mode' (Claude Code)`);
      if ("readonly" in fm) {
        err(`${prefix}: forbidden field 'readonly' (Claude Code)`);
      }
      break;
    }
    case "cursor": {
      // Required: name
      if (typeof fm.name !== "string" || fm.name.trim() === "") {
        err(`${prefix}: missing or empty 'name'`);
      } else if (fm.name !== agentId) {
        err(`${prefix}: 'name' is '${fm.name}', expected '${agentId}'`);
      }
      // Forbidden
      if ("mode" in fm) err(`${prefix}: forbidden field 'mode' (Cursor)`);
      if ("disallowedTools" in fm) {
        err(`${prefix}: forbidden field 'disallowedTools' (Cursor)`);
      }
      // tools as object map is forbidden (only readonly bool is valid for Cursor)
      if ("tools" in fm && typeof fm.tools === "object" && fm.tools !== null) {
        err(
          `${prefix}: 'tools' must not be an object map (Cursor uses 'readonly' instead)`,
        );
      }
      break;
    }
    case "opencode": {
      // Forbidden: name (filename is the identifier)
      if ("name" in fm) {
        err(
          `${prefix}: forbidden field 'name' (OpenCode uses filename as ID)`,
        );
      }
      // Required: mode = subagent
      if (fm.mode !== "subagent") {
        err(
          `${prefix}: 'mode' must be 'subagent', got '${fm.mode ?? "missing"}'`,
        );
      }
      // Forbidden
      if ("readonly" in fm) {
        err(`${prefix}: forbidden field 'readonly' (OpenCode)`);
      }
      if ("disallowedTools" in fm) {
        err(`${prefix}: forbidden field 'disallowedTools' (OpenCode)`);
      }
      break;
    }
  }
}

async function main(): Promise<void> {
  console.log("Checking agent sync and frontmatter...");

  // 1. Read all IDE dirs
  const ideFiles = new Map<IDE, Map<string, string>>();
  for (const ide of IDE_SUBDIRS) {
    ideFiles.set(ide, await readAgentDir(ide));
  }

  // 2. Completeness: all IDEs must have the same set of filenames
  const fileSets = new Map<IDE, Set<string>>();
  for (const ide of IDE_SUBDIRS) {
    fileSets.set(ide, new Set(ideFiles.get(ide)!.keys()));
  }

  const allFiles = new Set<string>();
  for (const files of fileSets.values()) {
    for (const f of files) allFiles.add(f);
  }

  for (const filename of [...allFiles].sort()) {
    const missing: IDE[] = [];
    for (const ide of IDE_SUBDIRS) {
      if (!fileSets.get(ide)!.has(filename)) {
        missing.push(ide);
      }
    }
    if (missing.length > 0) {
      err(`'${filename}' missing in: ${missing.join(", ")}`);
    }
  }

  // 3. Per-file checks (only for files present in all IDEs)
  for (const filename of [...allFiles].sort()) {
    const parsed = new Map<
      IDE,
      { fm: Record<string, unknown>; body: string }
    >();

    for (const ide of IDE_SUBDIRS) {
      const content = ideFiles.get(ide)?.get(filename);
      if (!content) continue;

      const result = parseFrontmatterAndBody(content);
      if (!result) {
        err(`${ide}/${filename}: invalid or missing frontmatter`);
        continue;
      }
      parsed.set(ide, result);
    }

    if (parsed.size < IDE_SUBDIRS.length) continue; // skip incomplete sets

    // 3a. Body sync
    const bodies = [...parsed.values()].map((p) => p.body);
    const referenceBody = bodies[0];
    for (let i = 1; i < bodies.length; i++) {
      if (bodies[i] !== referenceBody) {
        const ideA = IDE_SUBDIRS[0];
        const ideB = IDE_SUBDIRS[i];
        err(
          `'${filename}': body differs between ${ideA} and ${ideB}`,
        );
        break; // one error per file is enough
      }
    }

    // 3b. Description sync
    const descriptions = [...parsed.entries()].map(([ide, p]) => ({
      ide,
      desc: p.fm.description,
    }));
    const refDesc = descriptions[0].desc;
    for (let i = 1; i < descriptions.length; i++) {
      if (descriptions[i].desc !== refDesc) {
        err(
          `'${filename}': description differs between ${
            descriptions[0].ide
          } and ${descriptions[i].ide}`,
        );
        break;
      }
    }

    // 3c. IDE-specific frontmatter validation
    for (const ide of IDE_SUBDIRS) {
      const p = parsed.get(ide);
      if (p) validateFrontmatter(ide, filename, p.fm);
    }
  }

  // Summary
  if (errors.length > 0) {
    console.error(`\n${errors.length} agent check error(s) found.`);
    Deno.exit(1);
  } else {
    const agentCount = fileSets.get("claude")?.size ?? 0;
    console.log(
      `\u2705 All agents valid: ${agentCount} agents x ${IDE_SUBDIRS.length} IDEs, bodies and descriptions in sync.`,
    );
  }
}

main();
