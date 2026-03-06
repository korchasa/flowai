/**
 * generate_agents.ts — Project analysis tool for flow-init.
 *
 * No external dependencies — uses only Deno built-ins and jsr: imports.
 *
 * Run:
 *   deno run --allow-read generate_agents.ts analyze <dir>
 *
 * Commands:
 *   analyze <dir>   Analyze project directory, detect stack, output JSON to stdout
 *
 * File generation (render/apply) is handled by the agent natively using
 * template files from assets/ as reference. This script only provides
 * structured project metadata.
 */

import { join, resolve } from "jsr:@std/path";

function existsSync(path: string): boolean {
  try {
    Deno.statSync(path);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProjectInfo {
  is_new: boolean;
  stack: string[];
  files_count: number;
  root_dir: string;
  readme_content: string;
  file_tree: string[];
}

// ---------------------------------------------------------------------------
// Analyze
// ---------------------------------------------------------------------------

const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  ".cursor",
  ".claude",
  ".opencode",
  "dist",
  "build",
  "coverage",
  ".dev",
  "__pycache__",
  "vendor",
]);

async function analyzeProject(rootDir: string): Promise<ProjectInfo> {
  const files: string[] = [];
  const fileTree: string[] = [];
  let readmeContent = "";

  async function walk(dir: string): Promise<void> {
    for await (const entry of Deno.readDir(dir)) {
      if (SKIP_DIRS.has(entry.name)) continue;

      const fullPath = join(dir, entry.name);
      if (entry.isDirectory) {
        await walk(fullPath);
      } else if (entry.isFile) {
        files.push(fullPath);
        const rel = fullPath.slice(rootDir.length + 1);
        fileTree.push(rel);

        if (entry.name.toLowerCase() === "readme.md" && !readmeContent) {
          try {
            readmeContent = await Deno.readTextFile(fullPath);
          } catch {
            // ignore
          }
        }
      }
    }
  }

  await walk(rootDir);

  const stack: string[] = [];
  const check = (file: string, name: string) => {
    if (existsSync(join(rootDir, file))) stack.push(name);
  };

  check("package.json", "Node.js");
  check("deno.json", "Deno");
  check("go.mod", "Go");
  check("Cargo.toml", "Rust");
  if (
    existsSync(join(rootDir, "requirements.txt")) ||
    existsSync(join(rootDir, "pyproject.toml"))
  ) {
    stack.push("Python");
  }
  check("Package.swift", "Swift");

  const isNew = stack.length === 0 && files.length < 5;

  return {
    is_new: isNew,
    stack,
    files_count: files.length,
    root_dir: rootDir,
    readme_content: readmeContent,
    file_tree: fileTree.slice(0, 200),
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function printUsage(): void {
  console.log(`Usage: deno run --allow-read generate_agents.ts analyze <dir>

Commands:
  analyze <dir>   Analyze project directory, detect stack, output JSON to stdout
`);
}

async function main(): Promise<void> {
  const args = Deno.args;
  if (args.length < 1) {
    printUsage();
    Deno.exit(1);
  }

  const command = args[0];

  switch (command) {
    case "analyze": {
      const dir = args[1] ?? Deno.cwd();
      const result = await analyzeProject(resolve(dir));
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      printUsage();
      Deno.exit(1);
  }
}

// Export for testing
export { analyzeProject };
export type { ProjectInfo };

if (import.meta.main) {
  main();
}
