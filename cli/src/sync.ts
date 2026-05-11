// [FR-DIST.SYNC](../../documents/requirements.md#fr-dist.sync-sync-command-flowai) — sync orchestrator
// [FR-DIST.FILTER](../../documents/requirements.md#fr-dist.filter-selective-sync) — selective sync via include/exclude
// [FR-DIST.GLOBAL](../../documents/requirements.md#fr-dist.global-scope-selection-global-local-auto) — scope-aware path resolution, asset split, hook merge.
// [FR-PACKS](../../documents/requirements.md#fr-packs-pack-system-modular-resource-installation) — pack-based resource resolution
/** Sync orchestrator — resolves IDEs, reads bundled framework, computes plan, writes files.
 *
 * Implementation is split across:
 *   - `sync_resolution.ts` — IDE / pack / scope name resolution
 *   - `sync_kinds.ts`      — per-kind sync ops (skills, commands, agents, hooks, scripts, assets)
 *   - `sync_plan_ops.ts`   — plan execution + prefix-orphan helpers
 *
 * This file keeps the public surface (`sync`, `processPlan`, `resolvePackResources`,
 * `computePrefixOrphansPlan`, types, and re-exports from `resource_reader`/`resource_index`).
 */
import type { FsAdapter } from "./adapters/fs.ts";
import { resolveHomeDir, type SyncScope } from "./scope.ts";
import {
  BundledSource,
  type FrameworkSource,
  GitSource,
  LocalSource,
} from "./source.ts";
import { syncClaudeSymlinks } from "./symlinks.ts";
import { runUserSync } from "./user_sync.ts";
import type {
  FlowConfig,
  IDE,
  PlanItem,
  PlanItemType,
  ResourceAction,
} from "./types.ts";
import { markFailedActions } from "./resource_index.ts";
import {
  loadFrameworkAndIndexes,
  resolveResourcesForSync,
  resolveTargetIdes,
} from "./sync_resolution.ts";
import { type SyncContext, syncSingleIde } from "./sync_kinds.ts";

// Re-exports kept for backwards compatibility with external consumers
export {
  injectDisableModelInvocation,
  readCommandFiles,
  readPackAssetFiles,
  readPackCommandFiles,
  readPackSkillFiles,
  readSkillFiles,
} from "./resource_reader.ts";
export { filterNames } from "./resource_index.ts";
export { computePrefixOrphansPlan, processPlan } from "./sync_plan_ops.ts";
export { resolvePackResources } from "./sync_resolution.ts";

/** Resolve framework source based on config */
export async function resolveSource(
  config: FlowConfig,
): Promise<FrameworkSource> {
  if (config.source?.ref) {
    return await GitSource.clone(config.source.ref, config.source.git);
  }
  if (config.source?.path) {
    return new LocalSource(config.source.path);
  }
  return await BundledSource.load();
}

/** Sync options */
export interface SyncOptions {
  yes: boolean;
  /** Override framework source (for testing) */
  source?: FrameworkSource;
  /** Callback to prompt user about conflicts. Returns indices to overwrite. */
  promptConflicts?: (conflicts: PlanItem[]) => Promise<number[]>;
  /** Callback for progress updates */
  onProgress?: (message: string) => void;
  /** FR-DIST.GLOBAL — sync scope. Default: "project". */
  scope?: SyncScope;
  /** Home directory override (for testing). Default: resolved from env. */
  home?: string;
  /** FR-DIST.SYNC — dry-run: compute plan but skip all writes.
   * Implemented by wrapping the FsAdapter at the top of `sync()` so every
   * downstream write site is a no-op automatically. */
  dryRun?: boolean;
}

/** Sync result */
export interface SyncResult {
  totalWritten: number;
  totalSkipped: number;
  totalDeleted: number;
  totalConflicts: number;
  errors: Array<{
    path: string;
    error: string;
    name?: string;
    type?: PlanItemType;
  }>;
  symlinkResult?: { created: string[]; skipped: string[]; updated: string[] };
  /** Config was auto-migrated */
  configMigrated?: { from: string; to: string; packs: string[] };
  /** Per-skill action breakdown (first IDE only — all IDEs get same resources) */
  skillActions: ResourceAction[];
  /** Per-agent action breakdown */
  agentActions: ResourceAction[];
  /** Per-hook action breakdown */
  hookActions: ResourceAction[];
  /** Per-asset action breakdown (template changes with project artifact mappings) */
  assetActions: ResourceAction[];
  /** True when sync ran in dry-run mode (no writes performed). */
  dryRun?: boolean;
}

/** FR-DIST.SYNC — Wrap any FsAdapter into a read-through no-write adapter
 * for `--dry-run`. All reads pass through to the inner adapter; all mutations
 * (writeFile / mkdir / symlink / remove) become no-ops.
 *
 * Separated so `sync()` needs no dry-run awareness — each write site sees a
 * normal FsAdapter interface. */
function wrapDryRun(inner: FsAdapter): FsAdapter {
  return {
    readFile: (p) => inner.readFile(p),
    exists: (p) => inner.exists(p),
    readDir: (p) => inner.readDir(p),
    stat: (p) => inner.stat(p),
    readLink: (p) => inner.readLink(p),
    writeFile: (_p, _c) => Promise.resolve(),
    mkdir: (_p) => Promise.resolve(),
    symlink: (_t, _p) => Promise.resolve(),
    remove: (_p) => Promise.resolve(),
  };
}

/** Cross-IDE user-resource sync (controlled by `config.userSync`). */
async function runUserSyncStep(
  ctx: SyncContext,
  ides: IDE[],
): Promise<void> {
  if (!ctx.env.config.userSync) return;
  ctx.log("\nSyncing user resources across IDEs...");
  const fwNames = new Set([
    ...ctx.names.allSkillNames,
    ...ctx.names.allAgentNames,
  ]);
  const userResult = await runUserSync(
    ctx.cwd,
    ides,
    ctx.env.config,
    ctx.fs,
    ctx.options,
    ctx.log,
    fwNames,
    ctx.scope,
    ctx.home,
  );
  ctx.result.totalWritten += userResult.totalWritten;
  ctx.result.totalSkipped += userResult.totalSkipped;
  ctx.result.totalConflicts += userResult.totalConflicts;
  ctx.result.errors.push(...userResult.errors);
}

/** Project-scoped CLAUDE.md symlinks (one per AGENTS.md found in <cwd>). */
async function runSymlinksStep(ctx: SyncContext, ides: IDE[]): Promise<void> {
  const hasClaudeIDE = ides.some((i) => i.name === "claude");
  if (!hasClaudeIDE || ctx.scope !== "project") return;
  ctx.log("\nSyncing CLAUDE.md symlinks...");
  const symlinkResult = await syncClaudeSymlinks(ctx.cwd, ctx.fs);
  ctx.result.symlinkResult = symlinkResult;

  if (symlinkResult.created.length > 0) {
    ctx.log(`  Created ${symlinkResult.created.length} symlink(s)`);
  }
  if (symlinkResult.updated.length > 0) {
    ctx.log(`  Updated ${symlinkResult.updated.length} symlink(s)`);
  }
  if (symlinkResult.skipped.length > 0) {
    ctx.log(
      `  Skipped ${symlinkResult.skipped.length} (CLAUDE.md exists as regular file)`,
    );
  }
}

/**
 * Mark ResourceActions whose underlying writes failed so the renderer moves
 * them to the ERRORS block and shrinks CREATED counts. Commands install
 * alongside skills (same `.{ide}/skills/` dir), so command failures must
 * also mark the corresponding skillActions entry.
 */
function markAllFailedActions(result: SyncResult): void {
  markFailedActions(result.skillActions, result.errors, ["skill", "command"]);
  markFailedActions(result.agentActions, result.errors, "agent");
  markFailedActions(result.hookActions, result.errors, "hook");
  markFailedActions(result.assetActions, result.errors, "asset");
}

/**
 * Execute the full sync flow: resolve IDEs → load framework source →
 * read pack definitions → resolve resource names (skills/commands/agents/
 * hooks/scripts) with include/exclude filters → for each IDE: read upstream
 * files, compute diff plan, write files, generate hook configs → run
 * cross-IDE user-sync → create CLAUDE.md symlinks.
 *
 * Side effects: writes files to `.{ide}/` dirs, may auto-migrate `.flowai.yaml`.
 */
export async function sync(
  cwd: string,
  config: FlowConfig,
  realFs: FsAdapter,
  options: SyncOptions,
): Promise<SyncResult> {
  const log = options.onProgress ?? console.log;
  const scope: SyncScope = options.scope ?? "project";
  const home = options.home ?? (scope === "global" ? resolveHomeDir() : "");
  // [FR-DIST.SYNC](../../documents/requirements.md#fr-dist.sync-sync-command-flowai) — dry-run wraps the adapter so no write site below needs
  // to know about dry-run. Reads pass through.
  const fs: FsAdapter = options.dryRun ? wrapDryRun(realFs) : realFs;
  const result: SyncResult = {
    totalWritten: 0,
    totalSkipped: 0,
    totalDeleted: 0,
    totalConflicts: 0,
    errors: [],
    skillActions: [],
    agentActions: [],
    hookActions: [],
    assetActions: [],
    dryRun: options.dryRun === true ? true : undefined,
  };

  const ides = await resolveTargetIdes(config, cwd, fs, scope, log);

  log("Loading framework files...");
  const source = options.source ?? await resolveSource(config);

  try {
    const env = await loadFrameworkAndIndexes(
      cwd,
      config,
      fs,
      source,
      scope,
      home,
      result,
      log,
    );
    const names = await resolveResourcesForSync(env, source, scope, log);

    const ctx: SyncContext = {
      cwd,
      fs,
      source,
      scope,
      home,
      options,
      result,
      log,
      env,
      names,
    };

    let isFirstIde = true;
    for (const ide of ides) {
      await syncSingleIde(ctx, ide, isFirstIde);
      isFirstIde = false;
    }

    await runUserSyncStep(ctx, ides);
    await runSymlinksStep(ctx, ides);
  } finally {
    // Cleanup only if we created the source (not injected via options)
    if (!options.source) {
      await source.dispose();
    }
  }

  markAllFailedActions(result);
  return result;
}
