// FR-DIST.SYNC — sync orchestrator
// FR-DIST.FILTER — selective sync via include/exclude
// FR-PACKS — pack-based resource resolution
// FR-HOOK-RESOURCES.INSTALL — hook config generation
// FR-SCRIPTS — script copy to IDE dirs
/** Sync orchestrator — resolves IDEs, reads bundled framework, computes plan, writes files */
import { type FsAdapter, join } from "./adapters/fs.ts";
import { migrateV1ToV1_1, saveConfig } from "./config.ts";
import { resolveIDEs } from "./ide.ts";
import { computePlan, planSummary } from "./plan.ts";
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
  PlanItem,
  PlanItemType,
  ResourceAction,
} from "./types.ts";
import { writeFiles } from "./writer.ts";
import { buildManifest, readManifest } from "./hooks.ts";
import {
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
}

/** Sync result */
export interface SyncResult {
  totalWritten: number;
  totalSkipped: number;
  totalDeleted: number;
  totalConflicts: number;
  errors: Array<{ path: string; error: string }>;
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
}

/** Resolve which skills, commands, agents, hooks, and scripts to sync based on
 * packs and filters. Commands are a sibling primitive to skills — user-only,
 * sourced from `framework/<pack>/commands/`, filtered by `config.commands`. */
export function resolvePackResources(
  allPaths: string[],
  config: FlowConfig,
): {
  allSkillNames: string[];
  skillNames: string[];
  allCommandNames: string[];
  commandNames: string[];
  allAgentNames: string[];
  agentNames: string[];
  hookNames: string[];
  scriptNames: string[];
} {
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
  fs: FsAdapter,
  options: SyncOptions,
): Promise<SyncResult> {
  const log = options.onProgress ?? console.log;
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
  };

  // 1. Resolve IDEs
  const ides = await resolveIDEs(
    config.ides.length > 0 ? config.ides : undefined,
    cwd,
    fs,
  );

  if (ides.length === 0) {
    throw new Error(
      "No IDEs detected. Create .cursor/, .claude/, or .opencode/ directory first.",
    );
  }

  log(`Target IDEs: ${ides.map((i) => i.name).join(", ")}`);

  // 2. Load framework files from source (git, local path, or bundled)
  log("Loading framework files...");
  const source = options.source ?? await resolveSource(config);

  try {
    const allPaths = await source.listFiles("framework/");
    const usePacks = hasPacks(allPaths);

    // 2a. Read pack definitions (versions + scaffolds + assets)
    const packDefs = usePacks
      ? await readPackDefinitions(allPaths, source)
      : [];
    const scaffoldsIndex = buildScaffoldsIndex(packDefs);
    const assetsIndex = buildAssetsIndex(packDefs);

    // 2b. Automigrate v1 → v1.1 if pack structure detected
    if (usePacks && config.packs === undefined) {
      const fromVersion = config.version;
      const allPackNames = extractPackNames(allPaths);
      config = migrateV1ToV1_1(config, allPackNames);
      await saveConfig(cwd, config, fs);
      result.configMigrated = {
        from: fromVersion,
        to: config.version,
        packs: config.packs!,
      };
      log(`Config migrated to v${config.version}`);
    }

    // 3. Resolve resources (pack-aware or legacy)
    const {
      allSkillNames,
      skillNames,
      allCommandNames,
      commandNames,
      allAgentNames,
      agentNames,
      hookNames,
      scriptNames,
    } = resolvePackResources(allPaths, config);

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
        agentNames.length > 0 ? agentNames.join(", ") : "(none)"
      }`,
    );

    // 4. Sync for each IDE
    let isFirstIde = true;
    for (const ide of ides) {
      log(`\nSyncing to ${ide.name}...`);

      const modelMap = mergeModelMap(ide.name, config);

      // Skills
      const skillTargetDir = join(cwd, ide.configDir, "skills");
      if (skillNames.length > 0) {
        const skillFiles = usePacks
          ? await readPackSkillFiles(
            skillNames,
            allPaths,
            source,
            ide.name,
            modelMap,
          )
          : await readSkillFiles(
            skillNames,
            allPaths,
            source,
            ide.name,
            modelMap,
          );
        const skillPlan = await computePlan(
          skillFiles,
          skillTargetDir,
          "skill",
          fs,
        );

        // Collect per-skill actions from first IDE (all IDEs get same resources)
        if (isFirstIde) {
          result.skillActions = extractResourceActions(
            skillPlan,
            skillNames,
            scaffoldsIndex,
          );
        }

        await processPlan(skillPlan, fs, options, result, log);
      }

      // Delete excluded skills
      const skillDeletePlan = await computeDeletePlan(
        allSkillNames,
        skillNames,
        skillTargetDir,
        "skill",
        fs,
      );
      if (skillDeletePlan.length > 0) {
        if (isFirstIde) {
          for (const item of skillDeletePlan) {
            result.skillActions.push({
              name: item.name,
              action: "delete",
              scaffolds: scaffoldsIndex.get(item.name) ?? [],
            });
          }
        }
        await processPlan(skillDeletePlan, fs, options, result, log);
      }

      // Commands — user-only primitives sourced from framework/<pack>/commands/,
      // installed into the same .{ide}/skills/ target dir as skills, with
      // `disable-model-invocation: true` injected by readPackCommandFiles.
      if (commandNames.length > 0) {
        const commandFiles = usePacks
          ? await readPackCommandFiles(
            commandNames,
            allPaths,
            source,
            ide.name,
            modelMap,
          )
          : await readCommandFiles(
            commandNames,
            allPaths,
            source,
            ide.name,
            modelMap,
          );
        const commandPlan = await computePlan(
          commandFiles,
          skillTargetDir,
          "skill",
          fs,
        );

        if (isFirstIde) {
          // Commands contribute to skillActions because they install into
          // the same .{ide}/skills/ dir; downstream UI treats them uniformly.
          result.skillActions.push(
            ...extractResourceActions(
              commandPlan,
              commandNames,
              scaffoldsIndex,
            ),
          );
        }

        await processPlan(commandPlan, fs, options, result, log);
      }

      // Delete excluded commands from the shared .{ide}/skills/ target dir.
      const commandDeletePlan = await computeDeletePlan(
        allCommandNames,
        commandNames,
        skillTargetDir,
        "skill",
        fs,
      );
      if (commandDeletePlan.length > 0) {
        if (isFirstIde) {
          for (const item of commandDeletePlan) {
            result.skillActions.push({
              name: item.name,
              action: "delete",
              scaffolds: scaffoldsIndex.get(item.name) ?? [],
            });
          }
        }
        await processPlan(commandDeletePlan, fs, options, result, log);
      }

      // Agents (transform per IDE).
      // FR-DIST.CODEX-AGENTS — Codex uses a TOML config + sidecar flow that
      // bypasses the standard markdown agent writer. All other IDEs go through
      // the per-file `{ide}/agents/<name>.md` path below.
      if (ide.name === "codex") {
        await syncCodexAgents(
          cwd,
          ide,
          agentNames,
          allAgentNames,
          allPaths,
          source,
          fs,
          isFirstIde,
          result,
          log,
        );
      } else {
        const agentTargetDir = join(cwd, ide.configDir, "agents");
        if (agentNames.length > 0) {
          const agentFiles = usePacks
            ? await readPackAgentFiles(
              agentNames,
              ide.name,
              allPaths,
              source,
              modelMap,
            )
            : await readAgentFiles(
              agentNames,
              ide.name,
              allPaths,
              source,
              modelMap,
            );
          const agentPlan = await computePlan(
            agentFiles,
            agentTargetDir,
            "agent",
            fs,
          );

          if (isFirstIde) {
            result.agentActions = extractResourceActions(
              agentPlan,
              agentNames,
              new Map(), // agents don't have scaffolds
            );
          }

          await processPlan(agentPlan, fs, options, result, log);
        }

        // Delete excluded agents
        const agentDeletePlan = await computeDeletePlan(
          allAgentNames,
          agentNames,
          agentTargetDir,
          "agent",
          fs,
        );
        if (agentDeletePlan.length > 0) {
          if (isFirstIde) {
            for (const item of agentDeletePlan) {
              result.agentActions.push({
                name: item.name,
                action: "delete",
                scaffolds: [],
              });
            }
          }
          await processPlan(agentDeletePlan, fs, options, result, log);
        }
      }

      // Hooks (copy files + generate IDE-specific config).
      // FR-DIST.CODEX-HOOKS — Codex hook install is experimental and gated
      // behind `experimental.codexHooks: true` in `.flowai.yaml`. When the
      // flag is absent or false, skip hook install for Codex with an info log.
      const skipCodexHooks = ide.name === "codex" &&
        !(config.experimental?.codexHooks === true);
      if (hookNames.length > 0 && usePacks && !skipCodexHooks) {
        const hookFiles = await readPackHookFiles(hookNames, allPaths, source);
        const hookTargetDir = join(cwd, ide.configDir, "scripts");
        const hookPlan = await computePlan(
          hookFiles,
          hookTargetDir,
          "hook",
          fs,
        );

        if (isFirstIde) {
          if (hookPlan.length > 0) {
            log(`  Hooks: ${hookNames.join(", ")}`);
          }
          result.hookActions = extractResourceActions(
            hookPlan,
            hookNames,
            new Map(),
          );
        }

        await processPlan(hookPlan, fs, options, result, log);

        // Generate IDE-specific hook configuration
        const hookDefs = await readHookDefinitions(
          hookNames,
          allPaths,
          source,
        );
        const manifestPath = join(cwd, ide.configDir, "flowai-hooks.json");
        const manifestContent = await fs.exists(manifestPath)
          ? await fs.readFile(manifestPath)
          : null;
        const oldManifest = readManifest(manifestContent);

        await writeHookConfig(cwd, ide, hookDefs, oldManifest, fs);

        const newManifest = buildManifest(hookDefs);
        await fs.writeFile(
          manifestPath,
          JSON.stringify(newManifest, null, 2),
        );
      }

      if (skipCodexHooks && hookNames.length > 0 && isFirstIde) {
        log(
          "  Hooks: Codex hook sync is experimental; enable via `experimental.codexHooks: true` in .flowai.yaml",
        );
      }

      // Scripts (simple copy to .{ide}/scripts/)
      if (scriptNames.length > 0 && usePacks) {
        const scriptFiles = await readPackScriptFiles(
          scriptNames,
          allPaths,
          source,
        );
        const scriptTargetDir = join(cwd, ide.configDir, "scripts");
        const scriptPlan = await computePlan(
          scriptFiles,
          scriptTargetDir,
          "script",
          fs,
        );
        if (isFirstIde && scriptPlan.length > 0) {
          log(`  Scripts: ${scriptNames.join(", ")}`);
        }
        await processPlan(scriptPlan, fs, options, result, log);
      }

      // Core assets (copy to .{ide}/assets/)
      // FR-DIST.SYNC — only core pack has shared assets (AGENTS.md templates)
      if (usePacks) {
        const assetFiles = await readPackAssetFiles(
          allPaths,
          source,
          ["core"],
        );
        if (assetFiles.length > 0) {
          const assetTargetDir = join(cwd, ide.configDir);
          const assetPlan = await computePlan(
            assetFiles,
            assetTargetDir,
            "asset",
            fs,
          );
          if (isFirstIde) {
            if (assetPlan.some((i) => i.action !== "ok")) {
              log(`  Assets: ${assetFiles.length} file(s)`);
            }
            result.assetActions = extractResourceActions(
              assetPlan,
              assetFiles.map((f) => f.path.replace(/^assets\//, "")),
              assetsIndex,
            );
          }
          await processPlan(assetPlan, fs, options, result, log);
        }
      }

      isFirstIde = false;
    }

    // 5a. Cross-IDE user resource sync
    if (config.userSync) {
      log("\nSyncing user resources across IDEs...");
      const fwNames = new Set([...allSkillNames, ...allAgentNames]);
      const userResult = await runUserSync(
        cwd,
        ides,
        config,
        fs,
        options,
        log,
        fwNames,
      );
      result.totalWritten += userResult.totalWritten;
      result.totalSkipped += userResult.totalSkipped;
      result.totalConflicts += userResult.totalConflicts;
      result.errors.push(...userResult.errors);
    }

    // 5b. CLAUDE.md symlinks
    const hasClaudeIDE = ides.some((i) => i.name === "claude");
    if (hasClaudeIDE) {
      log("\nSyncing CLAUDE.md symlinks...");
      const symlinkResult = await syncClaudeSymlinks(cwd, fs);
      result.symlinkResult = symlinkResult;

      if (symlinkResult.created.length > 0) {
        log(`  Created ${symlinkResult.created.length} symlink(s)`);
      }
      if (symlinkResult.updated.length > 0) {
        log(`  Updated ${symlinkResult.updated.length} symlink(s)`);
      }
      if (symlinkResult.skipped.length > 0) {
        log(
          `  Skipped ${symlinkResult.skipped.length} (CLAUDE.md exists as regular file)`,
        );
      }
    }
  } finally {
    // Cleanup only if we created the source (not injected via options)
    if (!options.source) {
      await source.dispose();
    }
  }

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

  const writeResult = await writeFiles(plan, fs);
  result.totalWritten += writeResult.written;
  result.totalSkipped += writeResult.skipped;
  result.totalDeleted += writeResult.deleted;
  result.errors.push(...writeResult.errors);
}

/** Compute delete plan for excluded framework resources that exist locally */
export async function computeDeletePlan(
  allFrameworkNames: string[],
  includedNames: string[],
  targetDir: string,
  type: "skill" | "agent",
  fs: FsAdapter,
): Promise<PlanItem[]> {
  const includedSet = new Set(includedNames);
  const excludedNames = allFrameworkNames.filter((n) => !includedSet.has(n));
  const plan: PlanItem[] = [];

  for (const name of excludedNames) {
    const targetPath = type === "skill"
      ? join(targetDir, name)
      : join(targetDir, `${name}.md`);

    if (await fs.exists(targetPath)) {
      plan.push({
        type: type as PlanItemType,
        name,
        action: "delete",
        sourcePath: "",
        targetPath,
        content: "",
      });
    }
  }

  return plan;
}
