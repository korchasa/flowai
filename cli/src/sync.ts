// [FR-DIST.SYNC](../../documents/requirements.md#fr-dist.sync-sync-command-flowai) — sync orchestrator
// [FR-DIST.FILTER](../../documents/requirements.md#fr-dist.filter-selective-sync) — selective sync via include/exclude
// [FR-DIST.GLOBAL](../../documents/requirements.md#fr-dist.global-scope-selection-global-local-auto) — scope-aware path resolution, asset split, hook merge.
// [FR-PACKS](../../documents/requirements.md#fr-packs-pack-system-modular-resource-installation) — pack-based resource resolution
// [FR-PACKS.SCOPE](../../documents/requirements.md#fr-packs.scope-scope-frontmatter-field) — per-primitive scope filter (project-only / global-only).
// [FR-HOOK-RESOURCES.INSTALL](../../documents/requirements.md#fr-hook-resources.install-ide-specific-installation) — hook config generation
// [FR-SCRIPTS](../../documents/requirements.md#fr-scripts-script-resources) — script copy to IDE dirs
/** Sync orchestrator — resolves IDEs, reads bundled framework, computes plan, writes files */
import { type FsAdapter, join } from "./adapters/fs.ts";
import { migrateV1ToV1_1, saveConfig } from "./config.ts";
import { resolveIDEs } from "./ide.ts";
import { computePlan, planSummary } from "./plan.ts";
import { resolveHomeDir, resolveIdeBaseDir, type SyncScope } from "./scope.ts";
import {
  BundledSource,
  extractAgentNames,
  extractCommandNames,
  extractPackAgentNames,
  extractPackCommandNames,
  extractPackHookNames,
  extractPackNames,
  extractPackScriptNames,
  extractPackSkillNames,
  extractSkillNames,
  type FrameworkSource,
  GitSource,
  hasPacks,
  LocalSource,
} from "./source.ts";
import { syncClaudeSymlinks } from "./symlinks.ts";
import { DEFAULT_MODEL_MAPS } from "./transform.ts";
import { runUserSync } from "./user_sync.ts";
import type {
  FlowConfig,
  IDE,
  PlanItem,
  PlanItemType,
  ResourceAction,
} from "./types.ts";
import { writeFiles } from "./writer.ts";
import { buildManifest, readManifest } from "./hooks.ts";
import {
  filterNamesByScope,
  readAgentFiles,
  readCommandFiles,
  readHookDefinitions,
  readPackAgentFiles,
  readPackAssetFiles,
  readPackCommandFiles,
  readPackDefinitions,
  readPackHookFiles,
  readPackScriptFiles,
  readPackSkillFiles,
  readSkillFiles,
} from "./resource_reader.ts";
import {
  buildAssetsIndex,
  buildScaffoldsIndex,
  extractResourceActions,
  filterNames,
  markFailedActions,
} from "./resource_index.ts";
import { writeHookConfig } from "./hook_writer.ts";
import { syncCodexAgents } from "./codex_sync.ts";

// Re-export for consumers that import from "./sync.ts"
export {
  injectDisableModelInvocation,
  readCommandFiles,
  readPackAssetFiles,
  readPackCommandFiles,
  readPackSkillFiles,
  readSkillFiles,
} from "./resource_reader.ts";
export { filterNames } from "./resource_index.ts";

/** Read agent files from legacy flat framework/agents/ — re-exported for migrate.ts */
// readAgentFiles and readPackAgentFiles are not re-exported because they are
// only used internally by sync() and codex_sync.ts.

/** Merge default model map with user overrides from .flowai.yaml */
function mergeModelMap(
  ideName: string,
  config: FlowConfig,
): Record<string, string> {
  const defaults = DEFAULT_MODEL_MAPS[ideName] ?? {};
  const overrides = config.models?.[ideName] ?? {};
  return { ...defaults, ...overrides };
}

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

interface ResourceNames {
  allSkillNames: string[];
  skillNames: string[];
  allCommandNames: string[];
  commandNames: string[];
  allAgentNames: string[];
  agentNames: string[];
  hookNames: string[];
  scriptNames: string[];
}

/** Resolve which skills, commands, agents, hooks, and scripts to sync based on
 * packs and filters. Commands are a sibling primitive to skills — user-only,
 * sourced from `framework/<pack>/commands/`, filtered by `config.commands`. */
export function resolvePackResources(
  allPaths: string[],
  config: FlowConfig,
): ResourceNames {
  const usePacks = hasPacks(allPaths);

  let allSkillNames: string[];
  let allCommandNames: string[];
  let allAgentNames: string[];
  let hookNames: string[] = [];
  let scriptNames: string[] = [];

  if (usePacks) {
    // Pack-based: resolve packs → skill/command/agent/hook/script names
    const allPackNames = extractPackNames(allPaths);
    const selectedPacks = config.packs !== undefined
      ? (config.packs.length > 0 ? config.packs : ["core"]) // [] = core only
      : allPackNames; // v1 legacy: all packs

    allSkillNames = [];
    allCommandNames = [];
    allAgentNames = [];
    for (const pack of selectedPacks) {
      if (!allPackNames.includes(pack)) continue; // unknown pack, skip
      allSkillNames.push(...extractPackSkillNames(allPaths, pack));
      allCommandNames.push(...extractPackCommandNames(allPaths, pack));
      allAgentNames.push(...extractPackAgentNames(allPaths, pack));
      hookNames.push(...extractPackHookNames(allPaths, pack));
      scriptNames.push(...extractPackScriptNames(allPaths, pack));
    }
    // Deduplicate and sort
    allSkillNames = [...new Set(allSkillNames)].sort();
    allCommandNames = [...new Set(allCommandNames)].sort();
    allAgentNames = [...new Set(allAgentNames)].sort();
    hookNames = [...new Set(hookNames)].sort();
    scriptNames = [...new Set(scriptNames)].sort();
  } else {
    // Legacy flat structure
    allSkillNames = extractSkillNames(allPaths);
    allCommandNames = extractCommandNames(allPaths);
    allAgentNames = extractAgentNames(allPaths);
  }

  // Apply include/exclude filters on top
  const skillNames = filterNames(
    allSkillNames,
    config.skills.include,
    config.skills.exclude,
  );

  const commandNames = filterNames(
    allCommandNames,
    config.commands.include,
    config.commands.exclude,
  );

  const agentNames = filterNames(
    allAgentNames,
    config.agents.include,
    config.agents.exclude,
  );

  return {
    allSkillNames,
    skillNames,
    allCommandNames,
    commandNames,
    allAgentNames,
    agentNames,
    hookNames,
    scriptNames,
  };
}

interface FrameworkEnvironment {
  allPaths: string[];
  usePacks: boolean;
  scaffoldsIndex: Map<string, string[]>;
  assetsIndex: Map<string, string[]>;
  /** Possibly auto-migrated config (v1 → v1.1) */
  config: FlowConfig;
}

/**
 * Load framework paths, read pack definitions, build scaffolds/assets indexes,
 * and auto-migrate v1 → v1.1 if pack structure is present and `packs:` is
 * unset. Mutates `result.configMigrated` and may write a new `.flowai.yaml`.
 *
 * Global mode skips scaffolds/assets indexes — scaffolds and artifact diffs
 * are project-only concepts (no <cwd> artifact to diff against).
 */
async function loadFrameworkAndIndexes(
  cwd: string,
  config: FlowConfig,
  fs: FsAdapter,
  source: FrameworkSource,
  scope: SyncScope,
  home: string,
  result: SyncResult,
  log: (msg: string) => void,
): Promise<FrameworkEnvironment> {
  const allPaths = await source.listFiles("framework/");
  const usePacks = hasPacks(allPaths);

  const packDefs = usePacks ? await readPackDefinitions(allPaths, source) : [];
  const scaffoldsIndex = scope === "global"
    ? new Map<string, string[]>()
    : buildScaffoldsIndex(packDefs);
  const assetsIndex = scope === "global"
    ? new Map<string, string[]>()
    : buildAssetsIndex(packDefs);

  let nextConfig = config;
  if (usePacks && config.packs === undefined) {
    const fromVersion = config.version;
    const allPackNames = extractPackNames(allPaths);
    nextConfig = migrateV1ToV1_1(config, allPackNames);
    await saveConfig(cwd, nextConfig, fs, scope, home);
    result.configMigrated = {
      from: fromVersion,
      to: nextConfig.version,
      packs: nextConfig.packs!,
    };
    log(`Config migrated to v${nextConfig.version}`);
  }

  return {
    allPaths,
    usePacks,
    scaffoldsIndex,
    assetsIndex,
    config: nextConfig,
  };
}

/**
 * Resolve resource names (skills/commands/agents/hooks/scripts) including
 * pack-aware scope filtering and collision checks. Commands and skills must
 * be disjoint (they share the `.{ide}/skills/` target dir). Logs the per-kind
 * sync lists.
 */
async function resolveResourcesForSync(
  env: FrameworkEnvironment,
  source: FrameworkSource,
  scope: SyncScope,
  log: (msg: string) => void,
): Promise<ResourceNames> {
  const { allPaths, usePacks, config } = env;
  const names = resolvePackResources(allPaths, config);

  // [FR-PACKS.SCOPE](../../documents/requirements.md#fr-packs.scope-scope-frontmatter-field) — filter primitives whose `scope:` frontmatter
  // excludes the active sync scope. Only applies to pack-based layouts
  // (legacy flat layout had no scope concept).
  const skillNames = usePacks
    ? await filterNamesByScope(
      names.skillNames,
      /^framework\/[^/]+\/skills\/([^/]+)\//,
      allPaths,
      source,
      scope,
    )
    : names.skillNames;
  const commandNames = usePacks
    ? await filterNamesByScope(
      names.commandNames,
      /^framework\/[^/]+\/commands\/([^/]+)\//,
      allPaths,
      source,
      scope,
    )
    : names.commandNames;

  // Collision guard: skills and commands land in the same target dir
  // (.{ide}/skills/), so their names MUST be disjoint. Disjointness is
  // enforced upstream by the naming prefix convention (flowai-skill-* vs
  // flowai-*), but we verify here to catch accidental duplication before
  // it clobbers files on disk.
  const skillNameSet = new Set(skillNames);
  const collisions = commandNames.filter((n) => skillNameSet.has(n));
  if (collisions.length > 0) {
    throw new Error(
      `Name collision between skills and commands: ${
        collisions.join(", ")
      }. A primitive must be either a skill or a command, not both.`,
    );
  }

  if (usePacks && config.packs !== undefined) {
    log(`Packs: ${config.packs.join(", ")}`);
  }
  log(
    `Skills to sync: ${
      skillNames.length > 0 ? skillNames.join(", ") : "(none)"
    }`,
  );
  log(
    `Commands to sync: ${
      commandNames.length > 0 ? commandNames.join(", ") : "(none)"
    }`,
  );
  log(
    `Agents to sync: ${
      names.agentNames.length > 0 ? names.agentNames.join(", ") : "(none)"
    }`,
  );

  return { ...names, skillNames, commandNames };
}

interface SyncContext {
  cwd: string;
  fs: FsAdapter;
  source: FrameworkSource;
  scope: SyncScope;
  home: string;
  options: SyncOptions;
  result: SyncResult;
  log: (msg: string) => void;
  env: FrameworkEnvironment;
  names: ResourceNames;
}

/** Read upstream files for a primitive (skill/command), in legacy or pack mode. */
async function readPrimitiveFiles(
  kind: "skill" | "command",
  names: string[],
  ctx: SyncContext,
  ide: IDE,
  modelMap: Record<string, string>,
) {
  const { allPaths, usePacks } = ctx.env;
  if (kind === "skill") {
    return usePacks
      ? await readPackSkillFiles(
        names,
        allPaths,
        ctx.source,
        ide.name,
        modelMap,
      )
      : await readSkillFiles(names, allPaths, ctx.source, ide.name, modelMap);
  }
  return usePacks
    ? await readPackCommandFiles(
      names,
      allPaths,
      ctx.source,
      ide.name,
      modelMap,
    )
    : await readCommandFiles(names, allPaths, ctx.source, ide.name, modelMap);
}

/**
 * Sync skills + commands (which share the `.{ide}/skills/` target dir) plus a
 * unified prefix-based orphan cleanup. Commands' actions are folded into
 * `result.skillActions` because the renderer treats both uniformly.
 */
async function syncSkillsAndCommandsForIde(
  ctx: SyncContext,
  ide: IDE,
  ideSkillsBase: string,
  modelMap: Record<string, string>,
  isFirstIde: boolean,
): Promise<void> {
  const { skillNames, commandNames } = ctx.names;
  const skillTargetDir = join(ideSkillsBase, "skills");

  if (skillNames.length > 0) {
    const skillFiles = await readPrimitiveFiles(
      "skill",
      skillNames,
      ctx,
      ide,
      modelMap,
    );
    const skillPlan = await computePlan(
      skillFiles,
      skillTargetDir,
      "skill",
      ctx.fs,
    );
    if (isFirstIde) {
      ctx.result.skillActions = extractResourceActions(
        skillPlan,
        skillNames,
        ctx.env.scaffoldsIndex,
      );
    }
    await processPlan(skillPlan, ctx.fs, ctx.options, ctx.result, ctx.log);
  }

  // Commands — user-only primitives sourced from framework/<pack>/commands/,
  // installed into the same .{ide}/skills/ target dir as skills, with
  // `disable-model-invocation: true` injected by readPackCommandFiles.
  if (commandNames.length > 0) {
    const commandFiles = await readPrimitiveFiles(
      "command",
      commandNames,
      ctx,
      ide,
      modelMap,
    );
    const commandPlan = await computePlan(
      commandFiles,
      skillTargetDir,
      "skill",
      ctx.fs,
    );
    if (isFirstIde) {
      ctx.result.skillActions.push(
        ...extractResourceActions(
          commandPlan,
          commandNames,
          ctx.env.scaffoldsIndex,
        ),
      );
    }
    await processPlan(commandPlan, ctx.fs, ctx.options, ctx.result, ctx.log);
  }

  // [FR-DIST.CLEAN-PREFIX](../../documents/requirements.md#fr-dist.clean-prefix-prefix-based-orphan-cleanup) — unified prefix-based orphan cleanup for the
  // shared .{ide}/skills/ dir. Single pass after BOTH skills and commands
  // have been written; keep-set = union of both. Catches renames
  // (flowai-plan → flowai-skill-plan) that the old name-list comparison
  // missed.
  const skillCommandKeep = new Set([...skillNames, ...commandNames]);
  const skillOrphansPlan = await computePrefixOrphansPlan(
    skillTargetDir,
    skillCommandKeep,
    ctx.fs,
    "skill",
  );
  if (skillOrphansPlan.length > 0) {
    if (isFirstIde) {
      for (const item of skillOrphansPlan) {
        ctx.result.skillActions.push({
          name: item.name,
          action: "delete",
          scaffolds: ctx.env.scaffoldsIndex.get(item.name) ?? [],
        });
      }
    }
    await processPlan(
      skillOrphansPlan,
      ctx.fs,
      ctx.options,
      ctx.result,
      ctx.log,
    );
  }
}

/**
 * Sync agents for a non-Codex IDE (markdown files in `.{ide}/agents/`) plus
 * prefix-based orphan cleanup. Codex agents take a separate path
 * (`syncCodexAgents`, called directly in `syncSingleIde`).
 */
async function syncAgentsForIde(
  ctx: SyncContext,
  ide: IDE,
  ideAgentsBase: string,
  modelMap: Record<string, string>,
  isFirstIde: boolean,
): Promise<void> {
  const { allPaths, usePacks } = ctx.env;
  const { agentNames } = ctx.names;
  const agentTargetDir = join(ideAgentsBase, "agents");

  if (agentNames.length > 0) {
    const agentFiles = usePacks
      ? await readPackAgentFiles(
        agentNames,
        ide.name,
        allPaths,
        ctx.source,
        modelMap,
      )
      : await readAgentFiles(
        agentNames,
        ide.name,
        allPaths,
        ctx.source,
        modelMap,
      );
    const agentPlan = await computePlan(
      agentFiles,
      agentTargetDir,
      "agent",
      ctx.fs,
    );
    if (isFirstIde) {
      ctx.result.agentActions = extractResourceActions(
        agentPlan,
        agentNames,
        new Map(), // agents don't have scaffolds
      );
    }
    await processPlan(agentPlan, ctx.fs, ctx.options, ctx.result, ctx.log);
  }

  // [FR-DIST.CLEAN-PREFIX](../../documents/requirements.md#fr-dist.clean-prefix-prefix-based-orphan-cleanup) — prefix-based orphan cleanup for agents.
  const agentOrphansPlan = await computePrefixOrphansPlan(
    agentTargetDir,
    new Set(agentNames),
    ctx.fs,
    "agent",
    { ext: ".md" },
  );
  if (agentOrphansPlan.length > 0) {
    if (isFirstIde) {
      for (const item of agentOrphansPlan) {
        ctx.result.agentActions.push({
          name: item.name,
          action: "delete",
          scaffolds: [],
        });
      }
    }
    await processPlan(
      agentOrphansPlan,
      ctx.fs,
      ctx.options,
      ctx.result,
      ctx.log,
    );
  }
}

/**
 * Sync hooks: copy hook files into `.{ide}/scripts/` and generate the
 * IDE-specific hook configuration. Codex hook install is gated behind
 * `experimental.codexHooks: true` (skipped with an info log otherwise).
 */
async function syncHooksForIde(
  ctx: SyncContext,
  ide: IDE,
  ideSkillsBase: string,
  isFirstIde: boolean,
): Promise<void> {
  const { hookNames } = ctx.names;
  // [FR-DIST.CODEX-HOOKS](../../documents/requirements.md#fr-dist.codex-hooks-openai-codex-hook-sync-experimental) — Codex hook install is experimental and gated
  // behind `experimental.codexHooks: true` in `.flowai.yaml`. When the
  // flag is absent or false, skip hook install for Codex with an info log.
  const skipCodexHooks = ide.name === "codex" &&
    !(ctx.env.config.experimental?.codexHooks === true);

  if (hookNames.length > 0 && ctx.env.usePacks && !skipCodexHooks) {
    const hookFiles = await readPackHookFiles(
      hookNames,
      ctx.env.allPaths,
      ctx.source,
    );
    const hookTargetDir = join(ideSkillsBase, "scripts");
    const hookPlan = await computePlan(
      hookFiles,
      hookTargetDir,
      "hook",
      ctx.fs,
    );
    if (isFirstIde) {
      if (hookPlan.length > 0) {
        ctx.log(`  Hooks: ${hookNames.join(", ")}`);
      }
      ctx.result.hookActions = extractResourceActions(
        hookPlan,
        hookNames,
        new Map(),
      );
    }
    await processPlan(hookPlan, ctx.fs, ctx.options, ctx.result, ctx.log);

    const hookDefs = await readHookDefinitions(
      hookNames,
      ctx.env.allPaths,
      ctx.source,
    );
    const manifestPath = join(ideSkillsBase, "flowai-hooks.json");
    const manifestContent = await ctx.fs.exists(manifestPath)
      ? await ctx.fs.readFile(manifestPath)
      : null;
    const oldManifest = readManifest(manifestContent);

    await writeHookConfig(
      ctx.cwd,
      ide,
      hookDefs,
      oldManifest,
      ctx.fs,
      ideSkillsBase,
    );

    const newManifest = buildManifest(hookDefs);
    await ctx.fs.writeFile(manifestPath, JSON.stringify(newManifest, null, 2));
  }

  if (skipCodexHooks && hookNames.length > 0 && isFirstIde) {
    ctx.log(
      "  Hooks: Codex hook sync is experimental; enable via `experimental.codexHooks: true` in .flowai.yaml",
    );
  }
}

/** Sync pack scripts: simple copy into `.{ide}/scripts/`. Pack-mode only. */
async function syncScriptsForIde(
  ctx: SyncContext,
  ideSkillsBase: string,
  isFirstIde: boolean,
): Promise<void> {
  const { scriptNames } = ctx.names;
  if (scriptNames.length === 0 || !ctx.env.usePacks) return;
  const scriptFiles = await readPackScriptFiles(
    scriptNames,
    ctx.env.allPaths,
    ctx.source,
  );
  const scriptTargetDir = join(ideSkillsBase, "scripts");
  const scriptPlan = await computePlan(
    scriptFiles,
    scriptTargetDir,
    "script",
    ctx.fs,
  );
  if (isFirstIde && scriptPlan.length > 0) {
    ctx.log(`  Scripts: ${scriptNames.join(", ")}`);
  }
  await processPlan(scriptPlan, ctx.fs, ctx.options, ctx.result, ctx.log);
}

/** Sync core pack assets (AGENTS.md templates and similar) into the IDE base. */
async function syncCoreAssetsForIde(
  ctx: SyncContext,
  ideSkillsBase: string,
  isFirstIde: boolean,
): Promise<void> {
  if (!ctx.env.usePacks) return;
  const assetFiles = await readPackAssetFiles(
    ctx.env.allPaths,
    ctx.source,
    ["core"],
  );
  if (assetFiles.length === 0) return;
  const assetTargetDir = ideSkillsBase;
  const assetPlan = await computePlan(
    assetFiles,
    assetTargetDir,
    "asset",
    ctx.fs,
  );
  if (isFirstIde) {
    if (assetPlan.some((i) => i.action !== "ok")) {
      ctx.log(`  Assets: ${assetFiles.length} file(s)`);
    }
    ctx.result.assetActions = extractResourceActions(
      assetPlan,
      assetFiles.map((f) => f.path.replace(/^assets\//, "")),
      ctx.env.assetsIndex,
    );
  }
  await processPlan(assetPlan, ctx.fs, ctx.options, ctx.result, ctx.log);
}

/** Run the full per-IDE sync: skills+commands → agents → hooks → scripts → assets. */
async function syncSingleIde(
  ctx: SyncContext,
  ide: IDE,
  isFirstIde: boolean,
): Promise<void> {
  ctx.log(`\nSyncing to ${ide.name}...`);

  const modelMap = mergeModelMap(ide.name, ctx.env.config);
  // [FR-DIST.GLOBAL](../../documents/requirements.md#fr-dist.global-scope-selection-global-local-auto) — base dirs per IDE per scope. Codex global mode
  // splits skills (~/.agents/skills/) from agents (~/.codex/).
  const ideSkillsBase = resolveIdeBaseDir(
    ide.name,
    ctx.scope,
    ctx.cwd,
    ctx.home,
    "skills",
  );
  const ideAgentsBase = resolveIdeBaseDir(
    ide.name,
    ctx.scope,
    ctx.cwd,
    ctx.home,
    "agents",
  );

  await syncSkillsAndCommandsForIde(
    ctx,
    ide,
    ideSkillsBase,
    modelMap,
    isFirstIde,
  );

  // Agents (transform per IDE).
  // [FR-DIST.CODEX-AGENTS](../../documents/requirements.md#fr-dist.codex-agents-openai-codex-subagent-sync) — Codex uses a TOML config + sidecar flow that
  // bypasses the standard markdown agent writer. All other IDEs go through
  // the per-file `{ide}/agents/<name>.md` path below.
  if (ide.name === "codex") {
    await syncCodexAgents(
      ctx.cwd,
      ide,
      ctx.names.agentNames,
      ctx.names.allAgentNames,
      ctx.env.allPaths,
      ctx.source,
      ctx.fs,
      isFirstIde,
      ctx.result,
      ctx.log,
      ideAgentsBase,
    );
  } else {
    await syncAgentsForIde(ctx, ide, ideAgentsBase, modelMap, isFirstIde);
  }

  await syncHooksForIde(ctx, ide, ideSkillsBase, isFirstIde);
  await syncScriptsForIde(ctx, ideSkillsBase, isFirstIde);
  await syncCoreAssetsForIde(ctx, ideSkillsBase, isFirstIde);
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
 * Resolve target IDEs (config-driven or auto-detected) and log the chosen set.
 * Throws when none resolve — refuses to run a no-op sync silently.
 */
async function resolveTargetIdes(
  config: FlowConfig,
  cwd: string,
  fs: FsAdapter,
  scope: SyncScope,
  log: (msg: string) => void,
): Promise<IDE[]> {
  const ides = await resolveIDEs(
    config.ides.length > 0 ? config.ides : undefined,
    cwd,
    fs,
    scope,
  );
  if (ides.length === 0) {
    throw new Error(
      scope === "global"
        ? "No IDEs configured for global sync. Set `ides:` in ~/.flowai.yaml."
        : "No IDEs detected. Create .cursor/, .claude/, or .opencode/ directory first.",
    );
  }
  log(
    `Target IDEs: ${ides.map((i) => i.name).join(", ")}${
      scope === "global" ? " (global mode)" : ""
    }`,
  );
  return ides;
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

/** Process a plan: handle conflicts, write files */
export async function processPlan(
  plan: PlanItem[],
  fs: FsAdapter,
  options: SyncOptions,
  result: SyncResult,
  log: (msg: string) => void,
): Promise<void> {
  const summary = planSummary(plan);

  if (summary.create > 0) log(`  Create: ${summary.create}`);
  if (summary.delete > 0) log(`  Delete: ${summary.delete}`);
  if (summary.ok > 0) log(`  Unchanged: ${summary.ok}`);
  if (summary.conflict > 0) log(`  Conflicts: ${summary.conflict}`);

  // Handle conflicts
  const conflicts = plan.filter((i) => i.action === "conflict");
  if (conflicts.length > 0 && !options.yes) {
    if (options.promptConflicts) {
      const overwriteIndices = await options.promptConflicts(conflicts);
      // Mark non-selected conflicts as "ok" (skip)
      for (let i = 0; i < conflicts.length; i++) {
        if (!overwriteIndices.includes(i)) {
          const item = conflicts[i];
          const planIdx = plan.indexOf(item);
          plan[planIdx] = { ...item, action: "ok" };
          result.totalSkipped++;
        }
      }
      result.totalConflicts += overwriteIndices.length;
    } else {
      // No prompt handler, skip all conflicts
      for (const item of conflicts) {
        const planIdx = plan.indexOf(item);
        plan[planIdx] = { ...item, action: "ok" };
        result.totalSkipped++;
      }
    }
  } else if (conflicts.length > 0) {
    // --yes mode: overwrite all
    result.totalConflicts += conflicts.length;
  }

  // [FR-DIST.SYNC](../../documents/requirements.md#fr-dist.sync-sync-command-flowai) — dry-run: skip writes entirely so totalWritten stays at 0
  // and the renderer's "complete" vs "FAILED" header reflects a non-write run
  // truthfully. Plan-derived ResourceActions are populated upstream.
  if (options.dryRun) return;

  const writeResult = await writeFiles(plan, fs);
  result.totalWritten += writeResult.written;
  result.totalSkipped += writeResult.skipped;
  result.totalDeleted += writeResult.deleted;
  result.errors.push(...writeResult.errors);
}

/**
 * FR-DIST.CLEAN-PREFIX — scan `targetDir` and emit a delete plan for any
 * direct child whose name starts with `prefix` (default `flowai-`) and whose
 * base name (stripped of optional `ext`) is not in `keepNames`.
 *
 * Symlinks are preserved (never deleted) — guards against user-maintained
 * links that happen to share the prefix.
 *
 * Supersedes the old name-list-based `computeDeletePlan` which compared
 * against the current bundle's names and therefore missed rename orphans
 * (the old name no longer appears in the current bundle).
 *
 * @param targetDir directory to scan (e.g. `<ide>/skills` or `<ide>/agents`)
 * @param keepNames set of base names to preserve (skills ∪ commands for
 *   the skills dir; agents for the agents dir)
 * @param fs filesystem adapter
 * @param type PlanItem type attached to emitted delete items (`skill` or `agent`)
 * @param options.prefix literal prefix to match (default `flowai-`)
 * @param options.ext file extension to require AND strip before the
 *   keep-set lookup (`.md` for markdown agents, `.toml` for Codex sidecars,
 *   `""` for skill directories)
 */
export async function computePrefixOrphansPlan(
  targetDir: string,
  keepNames: Set<string>,
  fs: FsAdapter,
  type: PlanItemType,
  options: { prefix?: string; ext?: string } = {},
): Promise<PlanItem[]> {
  if (!(await fs.exists(targetDir))) return [];
  const prefix = options.prefix ?? "flowai-";
  const ext = options.ext ?? "";
  const plan: PlanItem[] = [];

  for await (const entry of fs.readDir(targetDir)) {
    if (entry.isSymlink) continue;
    if (!entry.name.startsWith(prefix)) continue;
    if (ext && !entry.name.endsWith(ext)) continue;
    const baseName = ext ? entry.name.slice(0, -ext.length) : entry.name;
    if (keepNames.has(baseName)) continue;
    plan.push({
      type,
      name: baseName,
      action: "delete",
      sourcePath: "",
      targetPath: join(targetDir, entry.name),
      content: "",
    });
  }

  return plan;
}
