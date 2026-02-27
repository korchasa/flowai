/**
 * generate_agents.ts — AssistFlow project initialization tool.
 *
 * Commands:
 *   analyze <dir>                 Analyze project, output JSON to stdout
 *   render <manifest> <data>      Render all templates, output diff results as JSON
 *   apply <manifest> <data> <path> Apply rendered template to a specific file
 *
 * Replaces generate_agents.py and analyze_project.py.
 */

import { join, dirname, resolve } from "@std/path";
import { existsSync } from "@std/fs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ManifestFileEntry {
  path: string;
  template: string;
  vars: string[];
  preserve: {
    type: "markers";
    start: string;
    end: string;
    inject_as: string;
  } | null;
  update: "diff-confirm";
}

interface Manifest {
  version: number;
  files: ManifestFileEntry[];
  generated_by_llm: { path: string; skip_if_lines_gt: number; description: string }[];
  ide_compat: Record<string, unknown>;
}

interface InterviewData {
  project_name?: string;
  vision_statement?: string;
  target_audience?: string;
  problem_statement?: string;
  solution_differentiators?: string;
  risks_assumptions?: string;
  stack?: string[];
  architecture?: string;
  key_decisions?: string;
  preferences?: string[];
  project_rules?: string;
  command_scripts?: string;
  [key: string]: unknown;
}

interface ProjectInfo {
  is_new: boolean;
  stack: string[];
  files_count: number;
  root_dir: string;
  readme_content: string;
  file_tree: string[];
}

interface RenderResult {
  path: string;
  status: "created" | "up-to-date" | "diff";
  diff?: string;
  content?: string;
}

// ---------------------------------------------------------------------------
// Analyze
// ---------------------------------------------------------------------------

const SKIP_DIRS = new Set([
  ".git", "node_modules", ".cursor", ".claude", ".opencode",
  "dist", "build", "coverage", ".dev", "__pycache__", "vendor",
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
  if (existsSync(join(rootDir, "requirements.txt")) || existsSync(join(rootDir, "pyproject.toml"))) {
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
// Template rendering
// ---------------------------------------------------------------------------

function buildVisionContent(data: InterviewData): string {
  const parts: string[] = [];
  if (data.vision_statement) parts.push(`### Vision Statement\n\n${data.vision_statement}`);
  if (data.target_audience) parts.push(`### Target Audience\n\n${data.target_audience}`);
  if (data.problem_statement) parts.push(`### Problem Statement\n\n${data.problem_statement}`);
  if (data.solution_differentiators) parts.push(`### Solution & Differentiators\n\n${data.solution_differentiators}`);
  if (data.risks_assumptions) parts.push(`### Risks & Assumptions\n\n${data.risks_assumptions}`);
  return parts.length > 0 ? parts.join("\n\n") : "No vision provided.";
}

function buildDevCommands(stack: string[]): string {
  const cmds: string[] = [];
  if (stack.includes("Deno")) {
    cmds.push("- `deno task start` (check deno.json)");
    cmds.push("- `deno task check` (check deno.json)");
    cmds.push("- `deno task test` (check deno.json)");
  }
  if (stack.includes("Node.js")) {
    cmds.push("- `npm start` (check package.json)");
    cmds.push("- `npm test` (check package.json)");
  }
  if (stack.includes("Go")) {
    cmds.push("- `go run .`");
    cmds.push("- `go test ./...`");
  }
  return cmds.length > 0 ? cmds.join("\n") : "- No commands detected";
}

function buildToolingStack(stack: string[]): string {
  return stack.length > 0 ? stack.map(s => `- ${s}`).join("\n") : "- Unknown";
}

/**
 * Build the variable map from interview data and project info.
 */
function buildVarMap(data: InterviewData, projectInfo: ProjectInfo): Record<string, string> {
  // Merge stacks
  const mergedStack = [...new Set([...projectInfo.stack, ...(data.stack ?? [])])];

  return {
    PROJECT_NAME: data.project_name ?? Deno.cwd().split("/").pop() ?? "Unknown",
    PROJECT_VISION: buildVisionContent(data),
    TOOLING_STACK: buildToolingStack(mergedStack),
    ARCHITECTURE: data.architecture ?? "- To be determined",
    KEY_DECISIONS: data.key_decisions ?? "- To be determined",
    PROJECT_RULES: data.project_rules ?? "",
    DEVELOPMENT_COMMANDS: buildDevCommands(mergedStack),
    COMMAND_SCRIPTS: data.command_scripts ?? "- No scripts configured",
  };
}

/**
 * Render a template by replacing {{VAR}} placeholders.
 */
function renderTemplate(template: string, vars: string[], varMap: Record<string, string>): string {
  let content = template;
  for (const v of vars) {
    content = content.replaceAll(`{{${v}}}`, varMap[v] ?? "");
  }
  return content;
}

/**
 * Extract preserved content from an existing file using marker-based strategy.
 *
 * Matches the start marker only as a standalone line (not inside code blocks).
 * Skips lines inside fenced code blocks (``` ... ```).
 */
function extractPreserved(
  content: string,
  preserve: ManifestFileEntry["preserve"],
): string {
  if (!preserve || preserve.type !== "markers") return "";

  const startMarker = preserve.start;
  const endMarker = preserve.end;
  const lines = content.split("\n");

  // Find the start marker line, skipping fenced code blocks
  let inCodeBlock = false;
  let startLineIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (!inCodeBlock && trimmed === startMarker) {
      startLineIdx = i;
      break;
    }
  }

  if (startLineIdx === -1) return "";

  // Collect content after the marker line until the end marker
  const afterLines = lines.slice(startLineIdx + 1);
  const result: string[] = [];
  for (const line of afterLines) {
    // End marker: line starts with the end pattern (e.g., "## ")
    if (line.startsWith(endMarker)) break;
    result.push(line);
  }

  return result.join("\n").trim();
}

// ---------------------------------------------------------------------------
// Unified diff
// ---------------------------------------------------------------------------

/**
 * Compute a simplified unified diff between two strings.
 *
 * Produces separate hunks for separate change regions, with up to
 * CONTEXT_LINES of surrounding context. Output is human-readable
 * (displayed in agent conversation), not intended for programmatic parsing.
 */
function computeUnifiedDiff(oldContent: string, newContent: string, filePath: string): string {
  const oldLines = oldContent.split("\n");
  const newLines = newContent.split("\n");
  const CONTEXT_LINES = 3;

  const diffLines: string[] = [];
  diffLines.push(`--- a/${filePath}`);
  diffLines.push(`+++ b/${filePath}`);

  // Build list of change regions (line-by-line comparison)
  const maxLen = Math.max(oldLines.length, newLines.length);
  const changes: { type: "equal" | "change"; oldLine?: string; newLine?: string; idx: number }[] = [];

  for (let i = 0; i < maxLen; i++) {
    const oldLine = i < oldLines.length ? oldLines[i] : undefined;
    const newLine = i < newLines.length ? newLines[i] : undefined;
    if (oldLine === newLine) {
      changes.push({ type: "equal", oldLine, newLine, idx: i });
    } else {
      changes.push({ type: "change", oldLine, newLine, idx: i });
    }
  }

  // Group into hunks: consecutive changes with context
  let i = 0;
  while (i < changes.length) {
    // Skip equal lines until we find a change
    if (changes[i].type === "equal") { i++; continue; }

    // Found a change — determine hunk boundaries
    const hunkStart = Math.max(0, i - CONTEXT_LINES);
    let hunkEnd = i;

    // Extend through all changes, merging nearby ones
    while (hunkEnd < changes.length) {
      if (changes[hunkEnd].type === "change") {
        hunkEnd++;
      } else {
        // Check if another change is within CONTEXT_LINES * 2
        let nextChange = hunkEnd;
        while (nextChange < changes.length && changes[nextChange].type === "equal") {
          nextChange++;
        }
        if (nextChange < changes.length && nextChange - hunkEnd <= CONTEXT_LINES * 2) {
          hunkEnd = nextChange + 1;
        } else {
          break;
        }
      }
    }

    const hunkEndWithContext = Math.min(changes.length, hunkEnd + CONTEXT_LINES);

    diffLines.push(`@@ -${hunkStart + 1} +${hunkStart + 1} @@`);
    for (let j = hunkStart; j < hunkEndWithContext; j++) {
      const c = changes[j];
      if (c.type === "equal") {
        diffLines.push(` ${c.oldLine ?? ""}`);
      } else {
        if (c.oldLine !== undefined) diffLines.push(`-${c.oldLine}`);
        if (c.newLine !== undefined) diffLines.push(`+${c.newLine}`);
      }
    }

    i = hunkEndWithContext;
  }

  return diffLines.join("\n");
}

// ---------------------------------------------------------------------------
// Render command
// ---------------------------------------------------------------------------

async function renderAll(
  manifestPath: string,
  dataPath: string,
  projectRoot: string,
): Promise<RenderResult[]> {
  const manifestDir = dirname(resolve(manifestPath));
  const manifest: Manifest = JSON.parse(await Deno.readTextFile(manifestPath));
  const data: InterviewData = JSON.parse(await Deno.readTextFile(dataPath));

  // Try to load project_info.json from same dir as data
  let projectInfo: ProjectInfo = {
    is_new: false,
    stack: [],
    files_count: 0,
    root_dir: projectRoot,
    readme_content: "",
    file_tree: [],
  };

  const projectInfoPath = join(dirname(resolve(dataPath)), "project_info.json");
  if (existsSync(projectInfoPath)) {
    projectInfo = JSON.parse(await Deno.readTextFile(projectInfoPath));
  }

  const baseVarMap = buildVarMap(data, projectInfo);
  const results: RenderResult[] = [];

  for (const entry of manifest.files) {
    const templatePath = join(manifestDir, entry.template);
    const targetPath = join(projectRoot, entry.path);
    const template = await Deno.readTextFile(templatePath);

    // Per-entry copy of varMap to avoid cross-entry mutation
    const varMap = { ...baseVarMap };

    // If file exists and has preserve rules, extract preserved content
    if (entry.preserve && existsSync(targetPath)) {
      const existing = await Deno.readTextFile(targetPath);
      const preserved = extractPreserved(existing, entry.preserve);
      if (preserved) {
        varMap[entry.preserve.inject_as] = preserved;
      }
    }

    const rendered = renderTemplate(template, entry.vars, varMap);

    if (!existsSync(targetPath)) {
      // File doesn't exist — will be created
      results.push({
        path: entry.path,
        status: "created",
        content: rendered,
      });
    } else {
      const existing = await Deno.readTextFile(targetPath);
      if (existing.trim() === rendered.trim()) {
        results.push({ path: entry.path, status: "up-to-date" });
      } else {
        const diff = computeUnifiedDiff(existing, rendered, entry.path);
        results.push({
          path: entry.path,
          status: "diff",
          diff,
          content: rendered,
        });
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Apply command
// ---------------------------------------------------------------------------

async function applyFile(
  manifestPath: string,
  dataPath: string,
  projectRoot: string,
  targetFile: string,
): Promise<void> {
  const results = await renderAll(manifestPath, dataPath, projectRoot);
  const match = results.find(r => r.path === targetFile);

  if (!match) {
    console.error(`Error: file "${targetFile}" not found in manifest`);
    Deno.exit(1);
  }

  if (!match.content) {
    console.log(`File "${targetFile}" is up-to-date, nothing to apply.`);
    return;
  }

  const targetPath = join(projectRoot, targetFile);
  await Deno.mkdir(dirname(targetPath), { recursive: true });
  await Deno.writeTextFile(targetPath, match.content);
  console.log(`Applied: ${targetFile}`);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function printUsage(): void {
  console.log(`Usage: deno run --allow-read --allow-write generate_agents.ts <command> [args]

Commands:
  analyze <dir>                       Analyze project, output JSON to stdout
  render <manifest> <data> [root]     Render all templates, output JSON with diffs
  apply <manifest> <data> <path> [root]  Apply rendered template to specific file
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

    case "render": {
      if (args.length < 3) {
        console.error("Usage: render <manifest> <data> [root]");
        Deno.exit(1);
      }
      const manifestPath = resolve(args[1]);
      const dataPath = resolve(args[2]);
      const projectRoot = args[3] ? resolve(args[3]) : Deno.cwd();
      const results = await renderAll(manifestPath, dataPath, projectRoot);
      console.log(JSON.stringify(results, null, 2));
      break;
    }

    case "apply": {
      if (args.length < 4) {
        console.error("Usage: apply <manifest> <data> <path> [root]");
        Deno.exit(1);
      }
      const manifestPath = resolve(args[1]);
      const dataPath = resolve(args[2]);
      const targetFile = args[3];
      const projectRoot = args[4] ? resolve(args[4]) : Deno.cwd();
      await applyFile(manifestPath, dataPath, projectRoot, targetFile);
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      printUsage();
      Deno.exit(1);
  }
}

// Export for testing
export {
  analyzeProject,
  buildVarMap,
  buildVisionContent,
  buildDevCommands,
  buildToolingStack,
  renderTemplate,
  extractPreserved,
  computeUnifiedDiff,
  renderAll,
};
export type {
  Manifest,
  ManifestFileEntry,
  InterviewData,
  ProjectInfo,
  RenderResult,
};

if (import.meta.main) {
  main();
}
