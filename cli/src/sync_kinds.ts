// [FR-DIST.SYNC](../../documents/requirements.md#fr-dist.sync-sync-command-flowai) — per-kind sync helpers (skills, commands, agents, hooks, scripts, assets)
// [FR-HOOK-RESOURCES.INSTALL](../../documents/requirements.md#fr-hook-resources.install-ide-specific-installation) — hook config generation
// [FR-SCRIPTS](../../documents/requirements.md#fr-scripts-script-resources) — script copy to IDE dirs
/** Per-resource-kind sync ops invoked from `syncSingleIde`. */
import { type FsAdapter, join } from "./adapters/fs.ts";
import { computePlan } from "./plan.ts";
import { resolveIdeBaseDir, type SyncScope } from "./scope.ts";
import type { FrameworkSource } from "./source.ts";
import type { FlowConfig, IDE } from "./types.ts";
import {
  readAgentFiles,
  readCommandFiles,
  readHookDefinitions,
  readPackAgentFiles,
  readPackAssetFiles,
  readPackCommandFiles,
  readPackHookFiles,
  readPackScriptFiles,
  readPackSkillFiles,
  readSkillFiles,
} from "./resource_reader.ts";
import { extractResourceActions } from "./resource_index.ts";
import { writeHookConfig } from "./hook_writer.ts";
import { buildManifest, readManifest } from "./hooks.ts";
import { syncCodexAgents } from "./codex_sync.ts";
import type { SyncOptions, SyncResult } from "./sync.ts";
import { computePrefixOrphansPlan, processPlan } from "./sync_plan_ops.ts";
import {
  type FrameworkEnvironment,
  mergeModelMap,
  type ResourceNames,
} from "./sync_resolution.ts";

export interface SyncContext {
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
  // (flowai-plan → flowai-plan) that the old name-list comparison
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
    !((ctx.env.config as FlowConfig).experimental?.codexHooks === true);

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
export async function syncSingleIde(
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
