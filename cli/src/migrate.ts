// [FR-DIST.MIGRATE](../../documents/requirements.md#fr-dist.migrate-one-way-ide-migration) — one-way migration of all IDE primitives (skills, agents, commands)
/** One-way migration of all primitives from one IDE config dir to another */
import { type FsAdapter, join } from "./adapters/fs.ts";
import { crossTransformAgent, DEFAULT_MODEL_MAPS } from "./transform.ts";
import {
  type IdeTargetPurpose,
  resolveIdeBaseDir,
  type SyncScope,
} from "./scope.ts";
import { processPlan, type SyncOptions, type SyncResult } from "./sync.ts";
import { KNOWN_IDES } from "./types.ts";
import type { IDE, PlanItem } from "./types.ts";
import { migrateAgentsToCodex, scanCodexAgents } from "./codex_migrate.ts";

/** Options for runMigrate. Scope + home are required so the migrate target
 * dir resolution matches the same `resolveIdeBaseDir` surface used by sync
 * (FR-DIST.GLOBAL). Default `scope = "project"` and `home = ""` keep legacy
 * call sites working. */
export interface MigrateOptions {
  yes: boolean;
  dryRun: boolean;
  scope?: SyncScope;
  home?: string;
  promptConflicts?: (conflicts: PlanItem[]) => Promise<number[]>;
}

/** Resolve the IDE base dir for migrate with project-defaulted scope/home. */
export function migrateBaseDir(
  ide: IDE,
  cwd: string,
  scope: SyncScope,
  home: string,
  purpose: IdeTargetPurpose = "default",
): string {
  return resolveIdeBaseDir(ide.name, scope, cwd, home, purpose);
}

/** A resource found in one IDE's config dir */
export interface ScannedResource {
  name: string;
  type: "skill" | "agent" | "command";
  /** All files belonging to this resource, with relative paths */
  files: Array<{ relPath: string; content: string }>;
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

/** Iterate a directory, silently skipping if it does not exist */
async function* safeReadDir(
  path: string,
  fs: FsAdapter,
): AsyncIterable<Deno.DirEntry> {
  try {
    yield* fs.readDir(path);
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) return;
    throw e;
  }
}

/**
 * Scan ALL resources from one IDE's config dir.
 * No framework filter, no include/exclude — migrates everything.
 */
export async function scanAllResources(
  cwd: string,
  fromIde: IDE,
  fs: FsAdapter,
  scope: SyncScope = "project",
  home: string = "",
): Promise<ScannedResource[]> {
  const resources: ScannedResource[] = [];
  const skillsBase = migrateBaseDir(fromIde, cwd, scope, home, "skills");
  const agentsBase = migrateBaseDir(fromIde, cwd, scope, home, "agents");
  const commandsBase = migrateBaseDir(fromIde, cwd, scope, home, "default");

  // Skills: each subdirectory under skills/
  const skillsDir = join(skillsBase, "skills");
  for await (const entry of safeReadDir(skillsDir, fs)) {
    if (!entry.isDirectory) continue;
    const skillDir = join(skillsDir, entry.name);
    const resource: ScannedResource = {
      name: entry.name,
      type: "skill",
      files: [],
    };
    for await (const filePath of walkDir(skillDir, fs)) {
      const relPath = entry.name + "/" +
        filePath.substring(skillDir.length + 1);
      const content = await fs.readFile(filePath);
      resource.files.push({ relPath, content });
    }
    if (resource.files.length > 0) {
      resources.push(resource);
    }
  }

  // Agents.
  // [FR-DIST.MIGRATE](../../documents/requirements.md#fr-dist.migrate-one-way-ide-migration) — for Codex the on-disk agent format is
  // `<base>/config.toml` `[agents.<name>]` tables pointing at sidecar
  // `<base>/agents/<name>.toml` files (see FR-DIST.CODEX-AGENTS). Reconstruct
  // a synthetic universal markdown representation from each sidecar so the
  // rest of the migration pipeline (cross-IDE frontmatter transform) can
  // operate uniformly.
  if (fromIde.name === "codex") {
    const codexAgents = await scanCodexAgents(cwd, fromIde, fs, scope, home);
    resources.push(...codexAgents);
  } else {
    const agentsDir = join(agentsBase, "agents");
    for await (const entry of safeReadDir(agentsDir, fs)) {
      if (!entry.isFile) continue;
      if (!entry.name.endsWith(".md")) continue;
      const filePath = join(agentsDir, entry.name);
      const content = await fs.readFile(filePath);
      resources.push({
        name: entry.name.replace(/\.md$/, ""),
        type: "agent",
        files: [{ relPath: entry.name, content }],
      });
    }
  }

  // Commands: each *.md file under commands/
  const commandsDir = join(commandsBase, "commands");
  for await (const entry of safeReadDir(commandsDir, fs)) {
    if (!entry.isFile) continue;
    if (!entry.name.endsWith(".md")) continue;
    const filePath = join(commandsDir, entry.name);
    const content = await fs.readFile(filePath);
    resources.push({
      name: entry.name.replace(/\.md$/, ""),
      type: "command",
      files: [{ relPath: entry.name, content }],
    });
  }

  return resources;
}

const SUB_DIR_MAP = {
  skill: "skills",
  agent: "agents",
  command: "commands",
} as const;

const PURPOSE_MAP: Record<keyof typeof SUB_DIR_MAP, IdeTargetPurpose> = {
  skill: "skills",
  agent: "agents",
  command: "default",
};

/**
 * Build PlanItem[] for the target IDE from scanned resources.
 * Reads existing target files to classify each item as create/ok/conflict.
 * Transforms agent frontmatter for the target IDE via crossTransformAgent.
 */
export async function buildMigratePlan(
  resources: ScannedResource[],
  fromIde: IDE,
  toIde: IDE,
  cwd: string,
  fs: FsAdapter,
  modelMap: Record<string, string>,
  log: (msg: string) => void,
  scope: SyncScope = "project",
  home: string = "",
): Promise<PlanItem[]> {
  const plan: PlanItem[] = [];
  let warnedTransform = false;
  const warnOnce = (msg: string) => {
    if (!warnedTransform) {
      log(msg);
      warnedTransform = true;
    }
  };

  for (const resource of resources) {
    const subDir = SUB_DIR_MAP[resource.type];
    const purpose = PURPOSE_MAP[resource.type];
    const fromBase = migrateBaseDir(fromIde, cwd, scope, home, purpose);
    const toBase = migrateBaseDir(toIde, cwd, scope, home, purpose);
    for (const file of resource.files) {
      const sourcePath = join(fromBase, subDir, file.relPath);
      const targetPath = join(toBase, subDir, file.relPath);

      // Transform agent frontmatter for target IDE
      let content = file.content;
      if (resource.type === "agent") {
        content = crossTransformAgent(
          content,
          fromIde.name,
          toIde.name,
          warnOnce,
          modelMap,
        );
      }

      // Classify action by comparing against existing target
      let action: "create" | "ok" | "conflict";
      if (await fs.exists(targetPath)) {
        const existing = await fs.readFile(targetPath);
        action = existing === content ? "ok" : "conflict";
      } else {
        action = "create";
      }

      plan.push({
        type: resource.type,
        name: resource.name,
        action,
        sourcePath,
        targetPath,
        content,
      });
    }
  }

  return plan;
}

/** Empty SyncResult — used as base for migrate result */
function emptyResult(): SyncResult {
  return {
    totalWritten: 0,
    totalSkipped: 0,
    totalDeleted: 0,
    totalConflicts: 0,
    errors: [],
    skillActions: [],
    agentActions: [],
    hookActions: [],
    assetActions: [],
  };
}

/**
 * Top-level migrate: scan from-IDE → transform → write to target-IDE.
 * With dryRun=true: prints plan, no files written.
 */
export async function runMigrate(
  cwd: string,
  fromIdeName: string,
  toIdeName: string,
  fs: FsAdapter,
  options: MigrateOptions,
  log: (msg: string) => void,
): Promise<SyncResult> {
  // Validate IDEs
  const fromIde = KNOWN_IDES[fromIdeName];
  if (!fromIde) {
    throw new Error(
      `Unknown IDE: "${fromIdeName}". Known: ${
        Object.keys(KNOWN_IDES).join(", ")
      }`,
    );
  }
  const toIde = KNOWN_IDES[toIdeName];
  if (!toIde) {
    throw new Error(
      `Unknown IDE: "${toIdeName}". Known: ${
        Object.keys(KNOWN_IDES).join(", ")
      }`,
    );
  }
  if (fromIdeName === toIdeName) {
    throw new Error("Source and target IDE must differ");
  }

  const scope: SyncScope = options.scope ?? "project";
  const home: string = options.home ?? "";
  const prefix = options.dryRun ? "[DRY RUN] " : "";
  const fromBaseDisplay = migrateBaseDir(fromIde, cwd, scope, home);
  const toBaseDisplay = migrateBaseDir(toIde, cwd, scope, home);
  log(`${prefix}Scanning ${fromIdeName} (${fromBaseDisplay}/)...`);

  const resources = await scanAllResources(cwd, fromIde, fs, scope, home);
  const skills = resources.filter((r) => r.type === "skill");
  const agents = resources.filter((r) => r.type === "agent");
  const commands = resources.filter((r) => r.type === "command");
  log(
    `  Found: ${skills.length} skills, ${agents.length} agents, ${commands.length} commands`,
  );

  // [FR-DIST.MIGRATE](../../documents/requirements.md#fr-dist.migrate-one-way-ide-migration) — when the target is Codex, agents take a separate
  // TOML-sidecar path and must be excluded from the generic buildMigratePlan
  // (which writes markdown to `<ide>/agents/<name>.md`).
  const resourcesForPlan = toIde.name === "codex"
    ? resources.filter((r) => r.type !== "agent")
    : resources;

  const modelMap = DEFAULT_MODEL_MAPS[toIdeName] ?? {};
  const plan = await buildMigratePlan(
    resourcesForPlan,
    fromIde,
    toIde,
    cwd,
    fs,
    modelMap,
    log,
    scope,
    home,
  );

  if (options.dryRun) {
    log(`\nWould migrate to ${toIdeName} (${toBaseDisplay}/):`);
    for (const item of plan) {
      if (item.action === "ok") continue;
      const suffix = item.type === "agent" ? " (transformed)" : "";
      const note = item.action === "conflict"
        ? " (target exists, differs)"
        : "";
      const subDir = item.type in SUB_DIR_MAP
        ? SUB_DIR_MAP[item.type as keyof typeof SUB_DIR_MAP]
        : item.type;
      log(`  [${item.action}] ${subDir}/${item.name}${suffix}${note}`);
    }
    const created = plan.filter((i) => i.action === "create").length;
    const conflicts = plan.filter((i) => i.action === "conflict").length;
    const skipped = plan.filter((i) => i.action === "ok").length;
    log(
      `\nWould: ${created} create, ${conflicts} conflict, ${skipped} skip. No files written.`,
    );
    return emptyResult();
  }

  log(`\nMigrating to ${toIdeName} (${toBaseDisplay}/)...`);

  const syncOptions: SyncOptions = {
    yes: options.yes,
    promptConflicts: options.promptConflicts,
    scope,
    home,
  };

  const result = emptyResult();
  await processPlan(plan, fs, syncOptions, result, log);

  // Codex-specific agent dispatch: run after the generic plan has written
  // skills/commands so the `.codex/` dir exists.
  if (toIde.name === "codex" && agents.length > 0) {
    await migrateAgentsToCodex(
      agents,
      fromIde,
      toIde,
      cwd,
      fs,
      log,
      result,
      scope,
      home,
    );
  }

  // Per-type summary
  for (const type of ["skill", "agent", "command"] as const) {
    if (type === "agent" && toIde.name === "codex") continue; // reported separately
    const typePlan = plan.filter((i) => i.type === type);
    if (typePlan.length === 0) continue;
    const created = typePlan.filter((i) => i.action === "create").length;
    const conflicts = typePlan.filter((i) => i.action === "conflict").length;
    const skipped = typePlan.filter((i) => i.action === "ok").length;
    const label = type === "agent"
      ? "Agents (transformed)"
      : type.charAt(0).toUpperCase() + type.slice(1) + "s";
    log(
      `  ${label}: ${created} created, ${conflicts} conflicts, ${skipped} skipped`,
    );
  }

  log("\nDone.");
  return result;
}
