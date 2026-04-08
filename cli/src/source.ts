// FR-DIST.BUNDLE — BundledSource reads bundled.json
// FR-HOOK-RESOURCES.SYNC-INFRA — hook/script name extraction
// FR-SCRIPTS — script name extraction
import { DEFAULT_GIT_URL } from "./types.ts";
/** Framework source abstraction — provides file listing and content reading */
export interface FrameworkSource {
  /** List all file paths under given prefix (relative to repo root) */
  listFiles(prefix: string): Promise<string[]>;
  /** Read file content by path (relative to repo root) */
  readFile(path: string): Promise<string>;
  /** Release resources */
  dispose(): Promise<void>;
}

/** Bundled framework source — reads from bundled.json baked at publish time */
export class BundledSource implements FrameworkSource {
  private files: Map<string, string>;

  constructor(data?: Record<string, string>) {
    if (data) {
      this.files = new Map(Object.entries(data));
    } else {
      // Dynamic import at construction isn't possible synchronously;
      // use the static factory instead when loading from bundled.json
      this.files = new Map();
    }
  }

  /** Create BundledSource from the bundled.json artifact */
  static async load(): Promise<BundledSource> {
    const { default: bundled } = await import("./bundled.json", {
      with: { type: "json" },
    });
    return new BundledSource(bundled as Record<string, string>);
  }

  listFiles(prefix: string): Promise<string[]> {
    const result = [...this.files.keys()].filter((p) => p.startsWith(prefix))
      .sort();
    return Promise.resolve(result);
  }

  readFile(path: string): Promise<string> {
    const content = this.files.get(path);
    if (content === undefined) {
      return Promise.reject(new Error(`Not found in bundle: ${path}`));
    }
    return Promise.resolve(content);
  }

  dispose(): Promise<void> {
    return Promise.resolve();
  }
}

/** In-memory framework source for testing */
export class InMemoryFrameworkSource implements FrameworkSource {
  constructor(private files: Map<string, string>) {}

  listFiles(prefix: string): Promise<string[]> {
    const result: string[] = [];
    for (const path of this.files.keys()) {
      if (path.startsWith(prefix)) {
        result.push(path);
      }
    }
    return Promise.resolve(result.sort());
  }

  readFile(path: string): Promise<string> {
    const content = this.files.get(path);
    if (content === undefined) {
      return Promise.reject(new Error(`File not found: ${path}`));
    }
    return Promise.resolve(content);
  }

  dispose(): Promise<void> {
    return Promise.resolve();
  }
}

/** Git source — clones a repo to temp dir and delegates to LocalSource */
export class GitSource implements FrameworkSource {
  private tmpDir: string;
  private localSource: LocalSource;

  private constructor(tmpDir: string) {
    this.tmpDir = tmpDir;
    this.localSource = new LocalSource(`${tmpDir}/framework`);
  }

  /** Clone a git repo at the given branch/tag and return a GitSource */
  static async clone(ref: string, gitUrl?: string): Promise<GitSource> {
    const url = gitUrl ?? DEFAULT_GIT_URL;

    // Check git is available
    const gitCheck = new Deno.Command("git", {
      args: ["--version"],
      stdout: "null",
      stderr: "null",
    });
    const gitCheckResult = await gitCheck.output();
    if (!gitCheckResult.success) {
      throw new Error(
        "git is required for source.ref. Install git or remove source from .flowai.yaml",
      );
    }

    // Clone to temp dir
    const tmpDir = await Deno.makeTempDir({ prefix: "flowai-" });
    const cloneCmd = new Deno.Command("git", {
      args: ["clone", "--depth", "1", "--branch", ref, url, tmpDir],
      stdout: "null",
      stderr: "piped",
    });
    const cloneResult = await cloneCmd.output();
    if (!cloneResult.success) {
      const stderr = new TextDecoder().decode(cloneResult.stderr);
      // Cleanup on failure
      await Deno.remove(tmpDir, { recursive: true }).catch(() => {});
      throw new Error(`Failed to clone ${url}@${ref}: ${stderr.trim()}`);
    }

    // Verify framework/ dir exists
    try {
      const stat = await Deno.stat(`${tmpDir}/framework`);
      if (!stat.isDirectory) {
        throw new Error("not a directory");
      }
    } catch {
      await Deno.remove(tmpDir, { recursive: true }).catch(() => {});
      throw new Error(
        `No framework/ directory found in cloned repo (${url}@${ref})`,
      );
    }

    return new GitSource(tmpDir);
  }

  listFiles(prefix: string): Promise<string[]> {
    return this.localSource.listFiles(prefix);
  }

  readFile(path: string): Promise<string> {
    return this.localSource.readFile(path);
  }

  async dispose(): Promise<void> {
    await Deno.remove(this.tmpDir, { recursive: true });
  }
}

/** Local filesystem source — reads from framework/ directory directly (for dev) */
export class LocalSource implements FrameworkSource {
  private frameworkDir: string;

  constructor(frameworkDir: string) {
    // Normalize: remove trailing slash
    this.frameworkDir = frameworkDir.replace(/\/+$/, "");
  }

  async listFiles(prefix: string): Promise<string[]> {
    const result: string[] = [];
    const walkDir = async (dir: string): Promise<void> => {
      for await (const entry of Deno.readDir(dir)) {
        const fullPath = `${dir}/${entry.name}`;
        if (entry.isDirectory) {
          await walkDir(fullPath);
        } else if (entry.isFile || entry.isSymlink) {
          const rel = `framework/${
            fullPath.substring(this.frameworkDir.length + 1)
          }`;
          // Skip dev-only files (same as bundle-framework.ts)
          if (/\/benchmarks\//.test(rel) || /_test\.\w+$/.test(rel)) continue;
          if (rel.startsWith(prefix)) {
            result.push(rel);
          }
        }
      }
    };
    await walkDir(this.frameworkDir);
    return result.sort();
  }

  async readFile(path: string): Promise<string> {
    // path is "framework/core/skills/..." — strip "framework/" prefix
    const rel = path.replace(/^framework\//, "");
    const fullPath = `${this.frameworkDir}/${rel}`;
    return await Deno.readTextFile(fullPath);
  }

  dispose(): Promise<void> {
    return Promise.resolve();
  }
}

/** Extract skill names from framework file paths (legacy flat structure) */
export function extractSkillNames(paths: string[]): string[] {
  const names = new Set<string>();
  for (const p of paths) {
    const match = p.match(/^framework\/skills\/([^/]+)\//);
    if (match) {
      names.add(match[1]);
    }
  }
  return [...names].sort();
}

/** Extract agent names from flat framework/agents/ directory (legacy) */
export function extractAgentNames(paths: string[]): string[] {
  const names: string[] = [];
  for (const p of paths) {
    const match = p.match(/^framework\/agents\/([^/]+)\.md$/);
    if (match) {
      names.push(match[1]);
    }
  }
  return names.sort();
}

// --- Pack-aware extractors ---

/** Extract pack names from framework/<pack>/pack.yaml paths */
export function extractPackNames(paths: string[]): string[] {
  const names = new Set<string>();
  for (const p of paths) {
    const match = p.match(/^framework\/([^/]+)\/pack\.yaml$/);
    if (match) {
      names.add(match[1]);
    }
  }
  return [...names].sort();
}

/** Extract skill names within a specific pack */
export function extractPackSkillNames(
  paths: string[],
  packName: string,
): string[] {
  const names = new Set<string>();
  const prefix = `framework/${packName}/skills/`;
  for (const p of paths) {
    if (p.startsWith(prefix)) {
      const rest = p.substring(prefix.length);
      const slashIdx = rest.indexOf("/");
      if (slashIdx > 0) {
        names.add(rest.substring(0, slashIdx));
      }
    }
  }
  return [...names].sort();
}

/** Extract agent names within a specific pack */
export function extractPackAgentNames(
  paths: string[],
  packName: string,
): string[] {
  const names: string[] = [];
  const prefix = `framework/${packName}/agents/`;
  for (const p of paths) {
    if (p.startsWith(prefix)) {
      const rest = p.substring(prefix.length);
      // Only flat .md files (no subdirectories)
      if (!rest.includes("/") && rest.endsWith(".md")) {
        names.push(rest.replace(/\.md$/, ""));
      }
    }
  }
  return names.sort();
}

/** Extract hook names within a specific pack */
export function extractPackHookNames(
  paths: string[],
  packName: string,
): string[] {
  const names = new Set<string>();
  const prefix = `framework/${packName}/hooks/`;
  for (const p of paths) {
    if (p.startsWith(prefix)) {
      const rest = p.substring(prefix.length);
      const slashIdx = rest.indexOf("/");
      if (slashIdx > 0) {
        names.add(rest.substring(0, slashIdx));
      }
    }
  }
  return [...names].sort();
}

/** Extract script names within a specific pack */
export function extractPackScriptNames(
  paths: string[],
  packName: string,
): string[] {
  const names: string[] = [];
  const prefix = `framework/${packName}/scripts/`;
  for (const p of paths) {
    if (p.startsWith(prefix)) {
      const rest = p.substring(prefix.length);
      // Only flat files (no subdirectories)
      if (!rest.includes("/")) {
        names.push(rest);
      }
    }
  }
  return names.sort();
}

/** Extract asset file paths within a specific pack.
 * Currently only core pack has shared assets (AGENTS.md templates). */
// FR-DIST.SYNC
export function extractPackAssetPaths(
  paths: string[],
  packName: string,
): string[] {
  const result: string[] = [];
  const prefix = `framework/${packName}/assets/`;
  for (const p of paths) {
    if (p.startsWith(prefix)) {
      result.push(p);
    }
  }
  return result.sort();
}

/** Check if bundle uses pack structure (has pack.yaml files) */
export function hasPacks(paths: string[]): boolean {
  return paths.some((p) => /^framework\/[^/]+\/pack\.yaml$/.test(p));
}
