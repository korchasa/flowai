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

/** Check if bundle uses pack structure (has pack.yaml files) */
export function hasPacks(paths: string[]): boolean {
  return paths.some((p) => /^framework\/[^/]+\/pack\.yaml$/.test(p));
}
