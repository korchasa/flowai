#!/usr/bin/env -S deno run -A
/**
 * Validates one IDE slash-command file against the format of its IDE.
 *
 * Usage: deno run -A validate_command.ts <path/to/name.md> --ide <claude|cursor|opencode>
 */

import { basename } from "jsr:@std/path";
import { parse as parseYaml } from "jsr:@std/yaml";

export type CommandIde = "claude" | "cursor" | "opencode";

const ALLOWED_KEYS: Record<Exclude<CommandIde, "cursor">, string[]> = {
  claude: [
    "allowed-tools",
    "argument-hint",
    "description",
    "disable-model-invocation",
    "model",
  ],
  opencode: ["agent", "description", "model", "subtask"],
};

function typeName(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "list";
  if (typeof value === "object") return "mapping";
  return typeof value;
}

function checkName(name: string): string | null {
  if (!/^[a-z0-9-]+$/.test(name)) {
    return `Command name '${name}' should be hyphen-case (lowercase letters, digits, and hyphens only)`;
  }
  if (name.startsWith("-") || name.endsWith("-") || name.includes("--")) {
    return `Command name '${name}' cannot start/end with a hyphen or contain consecutive hyphens`;
  }
  if (name.length > 64) {
    return `Command name is too long (${name.length} characters). Maximum is 64 characters.`;
  }
  return null;
}

/**
 * Claude Code executes a bang-backtick pair preceded by whitespace (or at the
 * start of a line) while it expands the command. That needs `allowed-tools`.
 */
function findShellInterpolation(
  lines: string[],
  offset: number,
): string | null {
  for (let i = 0; i < lines.length; i++) {
    if (/(^|\s)!`/.test(lines[i])) {
      return `Line ${
        i + 1 + offset
      }: Claude Code runs a bang-backtick pair preceded by whitespace while it expands the command. Declare the command in 'allowed-tools', or glue the bang to the preceding character if it is not meant to run.`;
    }
  }
  return null;
}

export function validateCommand(path: string, ide: string): [boolean, string] {
  let stat: Deno.FileInfo;
  try {
    stat = Deno.statSync(path);
  } catch {
    return [false, `Command file not found: ${path}`];
  }
  if (stat.isDirectory) {
    return [
      false,
      "A command is one Markdown file, not a directory. Write .<ide>/commands/<name>.md; a SKILL.md package belongs to skill authoring.",
    ];
  }
  if (!path.endsWith(".md")) return [false, "Command file must end in .md"];
  if (ide !== "claude" && ide !== "cursor" && ide !== "opencode") {
    return [
      false,
      `Unknown IDE '${ide}'. Use one of: claude, cursor, opencode`,
    ];
  }

  const nameError = checkName(basename(path, ".md"));
  if (nameError) return [false, nameError];

  const content = Deno.readTextFileSync(path);
  const match = content.match(/^---\n([\s\S]*?)\n---\n?/);

  if (ide === "cursor") {
    if (content.startsWith("---")) {
      return [
        false,
        "Cursor commands are plain Markdown; remove the YAML frontmatter",
      ];
    }
    if (!content.trim()) return [false, "Command body is empty"];
    return [true, "Command is valid!"];
  }

  if (!match) {
    return [
      false,
      `${ide} commands need YAML frontmatter with a 'description'`,
    ];
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(match[1]);
  } catch (e) {
    return [false, `Invalid YAML in frontmatter: ${e}`];
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return [false, "Frontmatter must be a YAML mapping"];
  }
  const fm = parsed as Record<string, unknown>;

  const allowed = ALLOWED_KEYS[ide];
  const unexpected = Object.keys(fm).filter((k) => !allowed.includes(k)).sort();
  if (unexpected.length > 0) {
    return [
      false,
      `Unexpected key(s) in ${ide} command frontmatter: ${
        unexpected.join(", ")
      }. Allowed: ${allowed.join(", ")}`,
    ];
  }

  if (!("description" in fm)) {
    return [false, "Missing 'description' in frontmatter"];
  }
  if (typeof fm.description !== "string" || !fm.description.trim()) {
    return [
      false,
      `'description' must be a non-empty string, got ${
        typeName(fm.description)
      }`,
    ];
  }
  if ("argument-hint" in fm && typeof fm["argument-hint"] !== "string") {
    return [
      false,
      `'argument-hint' must be a string, got ${
        typeName(fm["argument-hint"])
      }. Quote it: argument-hint: '[action] [service]'`,
    ];
  }

  const body = content.slice(match[0].length);
  if (!body.trim()) return [false, "Command body is empty"];

  if (ide === "claude" && !("allowed-tools" in fm)) {
    const headerLines = match[0].split("\n").length - 1;
    const shellError = findShellInterpolation(body.split("\n"), headerLines);
    if (shellError) return [false, shellError];
  }

  return [true, "Command is valid!"];
}

if (import.meta.main) {
  const args = [...Deno.args];
  const ideFlag = args.indexOf("--ide");
  const ide = ideFlag >= 0 ? args.splice(ideFlag, 2)[1] : undefined;
  if (args.length !== 1 || !ide) {
    console.log(
      "Usage: deno run -A validate_command.ts <path/to/name.md> --ide <claude|cursor|opencode>",
    );
    Deno.exit(1);
  }

  const [valid, message] = validateCommand(args[0], ide);
  if (valid) {
    console.log(JSON.stringify({ ok: true, result: { valid: true, message } }));
  } else {
    console.error(message);
    console.log(JSON.stringify({ ok: false, error: message }));
  }
  Deno.exit(valid ? 0 : 1);
}
