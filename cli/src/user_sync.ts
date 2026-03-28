/** Cross-IDE user resource propagation — scans, compares, and syncs user skills/agents across IDEs */
import { type FsAdapter, join } from "./adapters/fs.ts";
import { resolveIDEs } from "./ide.ts";
import { processPlan, type SyncOptions, type SyncResult } from "./sync.ts";
import { crossTransformAgent } from "./transform.ts";
import type { FlowConfig, IDE, PlanItem } from "./types.ts";

/** A single file version of a user resource as it exists in one IDE */
interface ResourceVersion {
  /** Absolute path on disk */
  path: string;
  content: string;
  mtime: Date | null;
  ideName: string;
  /** Relative path within the resource (for skills: skill-name/file; for agents: file.md) */
  relPath: string;
}

/** A user-owned resource (skill dir, agent file, or command file) with versions per IDE */
interface UserResource {
  name: string;
  type: "skill" | "agent" | "command";
  /** One entry per file per IDE (skills may have multiple files per IDE) */
  versions: ResourceVersion[];
}

/** Recursively yield absolute paths of all files under basePath */
async function* walkDir(
  basePath: string,
  fs: FsAdapter,
): AsyncIterable<string> {
  for await (const entry of fs.readDir(basePath)) {
    const fullPath = join(basePath, entry.name);
    if (entry.isDirectory) {
      yield* walkDir(fullPath, fs);
    } else if (entry.isFile) {
      yield fullPath;
    }
  }
}

/** Check whether a name passes include/exclude filter */
function passesFilter(
  name: string,
  filter: { include: string[]; exclude: string[] },
): boolean {
  if (filter.include.length > 0) return filter.include.includes(name);
  if (filter.exclude.length > 0) return !filter.exclude.includes(name);
  return true;
}

/** Read mtime for a path, returning null on failure */
async function readMtime(
  path: string,
  fs: FsAdapter,
): Promise<Date | null> {
  try {
    const info = await fs.stat(path);
    return info.mtime;
  } catch {
    return null;
  }
}

/**
 * Scan one IDE's skills and agents dirs, returning user-owned resources.
 * Skips framework resources (flowai-* prefix) and applies include/exclude filters.
 */
export async function scanIdeResources(
  cwd: string,
  ide: IDE,
  config: FlowConfig,
  fs: FsAdapter,
  frameworkNames?: Set<string>,
): Promise<UserResource[]> {
  const resources: UserResource[] = [];
  const isFramework = (name: string) =>
    name.startsWith("flowai-") || (frameworkNames?.has(name) ?? false);

  // Skills
  const skillsDir = join(cwd, ide.configDir, "skills");
  if (await fs.exists(skillsDir)) {
    for await (const entry of fs.readDir(skillsDir)) {
      if (!entry.isDirectory) continue;
      const name = entry.name;
      if (isFramework(name)) continue;
      if (!passesFilter(name, config.skills)) continue;

      const skillDir = join(skillsDir, name);
      const resource: UserResource = { name, type: "skill", versions: [] };

      for await (const filePath of walkDir(skillDir, fs)) {
        // relPath: "skill-name/subpath"
        const relPath = name + "/" + filePath.substring(skillDir.length + 1);
        const content = await fs.readFile(filePath);
        const mtime = await readMtime(filePath, fs);
        resource.versions.push({
          path: filePath,
          content,
          mtime,
          ideName: ide.name,
          relPath,
        });
      }

      if (resource.versions.length > 0) {
        resources.push(resource);
      }
    }
  }

  // Agents
  const agentsDir = join(cwd, ide.configDir, "agents");
  if (await fs.exists(agentsDir)) {
    for await (const entry of fs.readDir(agentsDir)) {
      if (!entry.isFile) continue;
      if (!entry.name.endsWith(".md")) continue;
      const name = entry.name.replace(/\.md$/, "");
      if (isFramework(name)) continue;
      if (!passesFilter(name, config.agents)) continue;

      const filePath = join(agentsDir, entry.name);
      const content = await fs.readFile(filePath);
      const mtime = await readMtime(filePath, fs);
      resources.push({
        name,
        type: "agent",
        versions: [{
          path: filePath,
          content,
          mtime,
          ideName: ide.name,
          relPath: entry.name,
        }],
      });
    }
  }

  // Commands (flat .md files, same pattern as agents)
  const commandsDir = join(cwd, ide.configDir, "commands");
  if (await fs.exists(commandsDir)) {
    for await (const entry of fs.readDir(commandsDir)) {
      if (!entry.isFile) continue;
      if (!entry.name.endsWith(".md")) continue;
      const name = entry.name.replace(/\.md$/, "");
      if (isFramework(name)) continue;
      if (!passesFilter(name, config.commands)) continue;

      const filePath = join(commandsDir, entry.name);
      const content = await fs.readFile(filePath);
      const mtime = await readMtime(filePath, fs);
      resources.push({
        name,
        type: "command",
        versions: [{
          path: filePath,
          content,
          mtime,
          ideName: ide.name,
          relPath: entry.name,
        }],
      });
    }
  }

  return resources;
}

/**
 * Collect user resources across all IDEs, merging by (type, name).
 */
export async function collectUserResources(
  cwd: string,
  ides: IDE[],
  config: FlowConfig,
  fs: FsAdapter,
  frameworkNames?: Set<string>,
): Promise<UserResource[]> {
  const map = new Map<string, UserResource>();

  for (const ide of ides) {
    const ideResources = await scanIdeResources(
      cwd,
      ide,
      config,
      fs,
      frameworkNames,
    );
    for (const r of ideResources) {
      const key = `${r.type}:${r.name}`;
      if (!map.has(key)) {
        map.set(key, { name: r.name, type: r.type, versions: [] });
      }
      map.get(key)!.versions.push(...r.versions);
    }
  }

  return Array.from(map.values());
}

/**
 * Compute per-IDE sync plan for user resources.
 * For each file (keyed by relPath), the canonical source is the version with newest mtime.
 * Each target IDE that differs or is missing gets a create/conflict plan item.
 */
export function computeUserSyncPlan(
  resources: UserResource[],
  ides: IDE[],
  cwd: string,
  log: (msg: string) => void,
): Map<string, PlanItem[]> {
  const plans = new Map<string, PlanItem[]>();
  for (const ide of ides) {
    plans.set(ide.name, []);
  }

  let warnedTransform = false;
  const warnOnce = (msg: string) => {
    if (!warnedTransform) {
      log(msg);
      warnedTransform = true;
    }
  };

  for (const resource of resources) {
    // Group versions by relPath
    const byRelPath = new Map<string, ResourceVersion[]>();
    for (const v of resource.versions) {
      if (!byRelPath.has(v.relPath)) byRelPath.set(v.relPath, []);
      byRelPath.get(v.relPath)!.push(v);
    }

    const subDirMap = { skill: "skills", agent: "agents", command: "commands" };
    const subDir = subDirMap[resource.type];

    for (const [relPath, versions] of byRelPath) {
      // Pick canonical source: version with newest mtime (null last)
      const canonical = pickCanonical(versions);

      for (const ide of ides) {
        const idePlan = plans.get(ide.name)!;
        const targetPath = join(cwd, ide.configDir, subDir, relPath);
        const targetVersion = versions.find((v) => v.ideName === ide.name);

        // Content for this target IDE (transformed from canonical source)
        const getContent = (): string => {
          if (resource.type === "agent" && canonical.ideName !== ide.name) {
            return crossTransformAgent(
              canonical.content,
              canonical.ideName,
              ide.name,
              warnOnce,
            );
          }
          return canonical.content;
        };

        if (!targetVersion) {
          // Missing in this IDE → create
          idePlan.push({
            type: resource.type,
            name: resource.name,
            action: "create",
            sourcePath: canonical.path,
            targetPath,
            content: getContent(),
            sourceMtime: canonical.mtime,
          });
        } else if (targetVersion.ideName === canonical.ideName) {
          // This IDE IS the canonical source → already up to date
          idePlan.push({
            type: resource.type,
            name: resource.name,
            action: "ok",
            sourcePath: canonical.path,
            targetPath,
            content: targetVersion.content,
          });
        } else {
          // Exists in both; compare content
          const transformed = getContent();
          if (targetVersion.content === transformed) {
            idePlan.push({
              type: resource.type,
              name: resource.name,
              action: "ok",
              sourcePath: canonical.path,
              targetPath,
              content: targetVersion.content,
            });
          } else {
            idePlan.push({
              type: resource.type,
              name: resource.name,
              action: "conflict",
              sourcePath: canonical.path,
              targetPath,
              content: transformed,
              sourceMtime: canonical.mtime,
              targetMtime: targetVersion.mtime,
            });
          }
        }
      }
    }
  }

  return plans;
}

/** Pick the version with the newest mtime; falls back to first if all null */
function pickCanonical(versions: ResourceVersion[]): ResourceVersion {
  let best = versions[0];
  for (const v of versions) {
    if (v.mtime === null) continue;
    if (best.mtime === null || v.mtime > best.mtime) {
      best = v;
    }
  }
  return best;
}

/** Run cross-IDE user resource sync */
export async function runUserSync(
  cwd: string,
  ides: IDE[],
  config: FlowConfig,
  fs: FsAdapter,
  options: SyncOptions,
  log: (msg: string) => void,
  frameworkNames?: Set<string>,
): Promise<SyncResult> {
  const result: SyncResult = {
    totalWritten: 0,
    totalSkipped: 0,
    totalDeleted: 0,
    totalConflicts: 0,
    errors: [],
    skillActions: [],
    agentActions: [],
    hookActions: [],
  };

  const resolvedIdes = ides.length > 0 ? ides : await resolveIDEs(
    config.ides.length > 0 ? config.ides : undefined,
    cwd,
    fs,
  );

  if (resolvedIdes.length < 2) {
    log("  User sync skipped: fewer than 2 IDEs configured");
    return result;
  }

  const resources = await collectUserResources(
    cwd,
    resolvedIdes,
    config,
    fs,
    frameworkNames,
  );
  if (resources.length === 0) {
    log("  No user resources found");
    return result;
  }

  const plans = computeUserSyncPlan(resources, resolvedIdes, cwd, log);

  for (const ide of resolvedIdes) {
    const plan = plans.get(ide.name) ?? [];
    if (plan.length === 0) continue;
    log(`  User sync to ${ide.name}...`);
    await processPlan(plan, fs, options, result, log);
  }

  return result;
}
