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
  extractPackAssetPaths,
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
import {
  DEFAULT_MODEL_MAPS,
  transformAgent,
  transformSkillModel,
} from "./transform.ts";
import {
  buildCodexAgentSidecar,
  type CodexAgentChange,
  mergeCodexConfig,
  readCodexManifest,
  writeCodexManifest,
} from "./toml_merge.ts";
import { runUserSync } from "./user_sync.ts";
import type {
  FlowConfig,
  HookDefinition,
  IDE,
  PackDefinition,
  PlanAction,
  PlanItem,
  PlanItemType,
  ResourceAction,
  UpstreamFile,
} from "./types.ts";
import { writeFiles } from "./writer.ts";
import { parse as parseYaml } from "@std/yaml";
import {
  buildManifest,
  cleanupRemovedHooks,
  generateOpenCodePlugin,
  mergeClaudeHooks,
  mergeCursorHooks,
  readManifest,
  transformHookForClaude,
  transformHookForCursor,
} from "./hooks.ts";

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

/** Execute the full sync flow */
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

/** Check if a path is dev-only (benchmarks or test files) and should not be distributed */
function isDevOnlyPath(path: string): boolean {
  if (/\/benchmarks\//.test(path)) return true;
  if (/_test\.\w+$/.test(path)) return true;
  return false;
}

/** Read skill files from legacy flat framework/skills/ */
export async function readSkillFiles(
  skillNames: string[],
  allPaths: string[],
  source: FrameworkSource,
  ideName?: string,
  modelMap?: Record<string, string>,
): Promise<UpstreamFile[]> {
  const files: UpstreamFile[] = [];
  for (const name of skillNames) {
    const prefix = `framework/skills/${name}/`;
    const paths = allPaths.filter((p) =>
      p.startsWith(prefix) && !isDevOnlyPath(p)
    );
    for (const path of paths) {
      let content = await source.readFile(path);
      // Transform model tier in SKILL.md files
      if (ideName && path.endsWith("/SKILL.md")) {
        content = transformSkillModel(content, ideName, modelMap);
      }
      const relativePath = path.substring("framework/skills/".length);
      files.push({ path: relativePath, content });
    }
  }
  return files;
}

/** Read skill files from pack structure framework/<pack>/skills/ */
export async function readPackSkillFiles(
  skillNames: string[],
  allPaths: string[],
  source: FrameworkSource,
  ideName?: string,
  modelMap?: Record<string, string>,
): Promise<UpstreamFile[]> {
  const files: UpstreamFile[] = [];
  const nameSet = new Set(skillNames);

  // Find all pack skill paths matching requested names (exclude dev-only files)
  const packSkillRegex = /^framework\/[^/]+\/skills\/([^/]+)\//;
  for (const path of allPaths) {
    const match = path.match(packSkillRegex);
    if (match && nameSet.has(match[1]) && !isDevOnlyPath(path)) {
      let content = await source.readFile(path);
      // Transform model tier in SKILL.md files
      if (ideName && path.endsWith("/SKILL.md")) {
        content = transformSkillModel(content, ideName, modelMap);
      }
      // Extract relative path: strip framework/<pack>/skills/ → <name>/...
      const skillName = match[1];
      const prefixEnd = path.indexOf(`/skills/${skillName}/`) +
        "/skills/".length;
      const relativePath = path.substring(prefixEnd);
      files.push({ path: relativePath, content });
    }
  }
  return files;
}

/**
 * Inject `disable-model-invocation: true` as the last key of the SKILL.md
 * frontmatter block. Directory placement under `commands/` is the single
 * source of truth for the user-only nature of a framework command; the flag
 * is added here so the installed file still carries the IDE signal without
 * authors needing to remember it.
 *
 * Idempotent — if the key is already present (any value), the content is
 * returned unchanged. Preserves CRLF line endings if the input uses them.
 *
 * Throws if the content has no leading frontmatter block — commands MUST
 * have a SKILL.md frontmatter; missing frontmatter is a validator failure
 * and should be surfaced at read time, not silently tolerated.
 */
export function injectDisableModelInvocation(content: string): string {
  // Detect line ending from the frontmatter region (first ~200 chars).
  const head = content.slice(0, 200);
  const crlf = /\r\n/.test(head);
  const eol = crlf ? "\r\n" : "\n";

  // Match opening `---` and closing `---` of the frontmatter block.
  // [\s\S] to cross lines; non-greedy to stop at the first closing marker.
  const fmRe = /^---\r?\n([\s\S]*?)\r?\n---/;
  const match = content.match(fmRe);
  if (!match) {
    throw new Error(
      "injectDisableModelInvocation: content has no frontmatter block",
    );
  }

  const fmBody = match[1];
  // Idempotent: if key already present (in any form), return unchanged.
  if (/^\s*disable-model-invocation\s*:/m.test(fmBody)) {
    return content;
  }

  const newFmBody = fmBody + eol + "disable-model-invocation: true";
  const newFrontmatter = `---${eol}${newFmBody}${eol}---`;
  return content.replace(fmRe, newFrontmatter);
}

/** Read command files from legacy flat framework/commands/. Symmetric with
 * `readSkillFiles` but injects `disable-model-invocation: true` into SKILL.md. */
export async function readCommandFiles(
  commandNames: string[],
  allPaths: string[],
  source: FrameworkSource,
  ideName?: string,
  modelMap?: Record<string, string>,
): Promise<UpstreamFile[]> {
  const files: UpstreamFile[] = [];
  for (const name of commandNames) {
    const prefix = `framework/commands/${name}/`;
    const paths = allPaths.filter((p) =>
      p.startsWith(prefix) && !isDevOnlyPath(p)
    );
    for (const path of paths) {
      let content = await source.readFile(path);
      if (path.endsWith("/SKILL.md")) {
        if (ideName) {
          content = transformSkillModel(content, ideName, modelMap);
        }
        content = injectDisableModelInvocation(content);
      }
      const relativePath = path.substring("framework/commands/".length);
      files.push({ path: relativePath, content });
    }
  }
  return files;
}

/** Read command files from pack structure framework/<pack>/commands/.
 * Commands install into `.{ide}/skills/` alongside skills; the directory
 * `commands/` is the framework-level classifier, and the writer injects
 * `disable-model-invocation: true` into each command's SKILL.md at sync time. */
export async function readPackCommandFiles(
  commandNames: string[],
  allPaths: string[],
  source: FrameworkSource,
  ideName?: string,
  modelMap?: Record<string, string>,
): Promise<UpstreamFile[]> {
  const files: UpstreamFile[] = [];
  const nameSet = new Set(commandNames);

  const packCommandRegex = /^framework\/[^/]+\/commands\/([^/]+)\//;
  for (const path of allPaths) {
    const match = path.match(packCommandRegex);
    if (match && nameSet.has(match[1]) && !isDevOnlyPath(path)) {
      let content = await source.readFile(path);
      if (path.endsWith("/SKILL.md")) {
        if (ideName) {
          content = transformSkillModel(content, ideName, modelMap);
        }
        content = injectDisableModelInvocation(content);
      }
      const commandName = match[1];
      const prefixEnd = path.indexOf(`/commands/${commandName}/`) +
        "/commands/".length;
      const relativePath = path.substring(prefixEnd);
      files.push({ path: relativePath, content });
    }
  }
  return files;
}

/** Read agent files from legacy flat framework/agents/ and transform for target IDE */
async function readAgentFiles(
  agentNames: string[],
  ideName: string,
  allPaths: string[],
  source: FrameworkSource,
  modelMap?: Record<string, string>,
): Promise<UpstreamFile[]> {
  const files: UpstreamFile[] = [];
  for (const name of agentNames) {
    const agentPath = `framework/agents/${name}.md`;
    if (allPaths.includes(agentPath)) {
      const raw = await source.readFile(agentPath);
      const content = transformAgent(raw, ideName, modelMap);
      files.push({ path: `${name}.md`, content });
    }
  }
  return files;
}

/** Read agent files from pack structure framework/<pack>/agents/ */
async function readPackAgentFiles(
  agentNames: string[],
  ideName: string,
  allPaths: string[],
  source: FrameworkSource,
  modelMap?: Record<string, string>,
): Promise<UpstreamFile[]> {
  const files: UpstreamFile[] = [];
  const nameSet = new Set(agentNames);

  const packAgentRegex = /^framework\/[^/]+\/agents\/([^/]+)\.md$/;
  for (const path of allPaths) {
    const match = path.match(packAgentRegex);
    if (match && nameSet.has(match[1])) {
      const raw = await source.readFile(path);
      const content = transformAgent(raw, ideName, modelMap);
      files.push({ path: `${match[1]}.md`, content });
    }
  }
  return files;
}

/** Read hook files from pack structure framework/<pack>/hooks/<name>/ */
async function readPackHookFiles(
  hookNames: string[],
  allPaths: string[],
  source: FrameworkSource,
): Promise<UpstreamFile[]> {
  const files: UpstreamFile[] = [];
  const nameSet = new Set(hookNames);

  const packHookRegex = /^framework\/[^/]+\/hooks\/([^/]+)\/(.+)$/;
  for (const path of allPaths) {
    const match = path.match(packHookRegex);
    if (match && nameSet.has(match[1])) {
      const content = await source.readFile(path);
      // Install as <hook-name>/<filename> (e.g., lint-on-edit/run.ts)
      files.push({ path: `${match[1]}/${match[2]}`, content });
    }
  }
  return files;
}

/** Read script files from pack structure framework/<pack>/scripts/<name> */
async function readPackScriptFiles(
  scriptNames: string[],
  allPaths: string[],
  source: FrameworkSource,
): Promise<UpstreamFile[]> {
  const files: UpstreamFile[] = [];
  const nameSet = new Set(scriptNames);

  const packScriptRegex = /^framework\/[^/]+\/scripts\/([^/]+)$/;
  for (const path of allPaths) {
    const match = path.match(packScriptRegex);
    if (match && nameSet.has(match[1])) {
      const content = await source.readFile(path);
      files.push({ path: match[1], content });
    }
  }
  return files;
}

/** Read asset files from pack structure framework/<pack>/assets/.
 * Currently only core pack has shared assets (AGENTS.md templates). */
// FR-DIST.SYNC
export async function readPackAssetFiles(
  allPaths: string[],
  source: FrameworkSource,
  selectedPacks: string[],
): Promise<UpstreamFile[]> {
  const files: UpstreamFile[] = [];

  for (const pack of selectedPacks) {
    const assetPaths = extractPackAssetPaths(allPaths, pack);
    for (const path of assetPaths) {
      const content = await source.readFile(path);
      // Strip framework/<pack>/assets/ → assets/<filename>
      const prefix = `framework/${pack}/assets/`;
      const relativePath = "assets/" + path.substring(prefix.length);
      files.push({ path: relativePath, content });
    }
  }

  return files;
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

/** Read pack.yaml definitions (with scaffolds) from bundle */
async function readPackDefinitions(
  allPaths: string[],
  source: FrameworkSource,
): Promise<PackDefinition[]> {
  const packYamls = allPaths.filter((p) =>
    /^framework\/[^/]+\/pack\.yaml$/.test(p)
  );
  const packs: PackDefinition[] = [];
  for (const path of packYamls) {
    const content = await source.readFile(path);
    const data = parseYaml(content) as Record<string, unknown>;

    // Parse scaffolds: Record<string, string[]>
    let scaffolds: Record<string, string[]> | undefined;
    if (data.scaffolds && typeof data.scaffolds === "object") {
      scaffolds = {};
      for (
        const [skill, paths] of Object.entries(
          data.scaffolds as Record<string, unknown>,
        )
      ) {
        if (Array.isArray(paths)) {
          scaffolds[skill] = paths.map(String);
        }
      }
    }

    // Parse assets: Record<string, string>
    let assets: Record<string, string> | undefined;
    if (data.assets && typeof data.assets === "object") {
      assets = {};
      for (
        const [template, artifactPath] of Object.entries(
          data.assets as Record<string, unknown>,
        )
      ) {
        assets[template] = String(artifactPath);
      }
    }

    packs.push({
      name: String(data.name ?? ""),
      version: String(data.version ?? "0.0.0"),
      description: String(data.description ?? ""),
      scaffolds,
      assets,
    });
  }
  return packs.sort((a, b) => a.name.localeCompare(b.name));
}

/** Build a flat scaffolds index: skill-name → artifact paths */
function buildScaffoldsIndex(
  packs: PackDefinition[],
): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const pack of packs) {
    if (!pack.scaffolds) continue;
    for (const [skill, paths] of Object.entries(pack.scaffolds)) {
      index.set(skill, paths);
    }
  }
  return index;
}

/** Build asset mapping index: template-name → [project artifact path]
 * Uses the same Map<string, string[]> shape as scaffoldsIndex for reuse with extractResourceActions */
function buildAssetsIndex(
  packs: PackDefinition[],
): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const pack of packs) {
    if (!pack.assets) continue;
    for (const [template, artifactPath] of Object.entries(pack.assets)) {
      index.set(template, [artifactPath]);
    }
  }
  return index;
}

/** Extract per-resource actions from a plan */
function extractResourceActions(
  plan: PlanItem[],
  _allNames: string[],
  scaffoldsIndex: Map<string, string[]>,
): ResourceAction[] {
  // Deduplicate by name (plan may have multiple files per skill dir)
  const byName = new Map<string, ResourceAction>();
  for (const item of plan) {
    const existing = byName.get(item.name);
    // Promote action: create > update > conflict > ok
    const action = item.action === "conflict" ? "update" : item.action;
    if (
      !existing ||
      actionPriority(action) > actionPriority(existing.action)
    ) {
      byName.set(item.name, {
        name: item.name,
        action: action as ResourceAction["action"],
        scaffolds: scaffoldsIndex.get(item.name) ?? [],
      });
    }
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function actionPriority(action: string): number {
  switch (action) {
    case "create":
      return 3;
    case "update":
      return 2;
    case "delete":
      return 1;
    default:
      return 0;
  }
}

/** Filter names by include/exclude lists */
export function filterNames(
  all: string[],
  include: string[],
  exclude: string[],
): string[] {
  if (include.length > 0) {
    return all.filter((n) => include.includes(n));
  }
  if (exclude.length > 0) {
    return all.filter((n) => !exclude.includes(n));
  }
  return all;
}

/** Read hook.yaml definitions for all hook names from source */
async function readHookDefinitions(
  hookNames: string[],
  allPaths: string[],
  source: FrameworkSource,
): Promise<Array<{ name: string; hook: HookDefinition }>> {
  const defs: Array<{ name: string; hook: HookDefinition }> = [];
  const hookYamlRegex = /^framework\/[^/]+\/hooks\/([^/]+)\/hook\.yaml$/;

  for (const path of allPaths) {
    const match = path.match(hookYamlRegex);
    if (match && hookNames.includes(match[1])) {
      const content = await source.readFile(path);
      const data = parseYaml(content) as Record<string, unknown>;
      defs.push({
        name: match[1],
        hook: {
          event: String(data.event ?? ""),
          matcher: data.matcher ? String(data.matcher) : undefined,
          description: String(data.description ?? ""),
          timeout: data.timeout ? Number(data.timeout) : undefined,
        },
      });
    }
  }
  return defs;
}

/** Write IDE-specific hook configuration files */
async function writeHookConfig(
  cwd: string,
  ide: { name: string; configDir: string },
  hookDefs: Array<{ name: string; hook: HookDefinition }>,
  oldManifest: ReturnType<typeof readManifest>,
  fs: FsAdapter,
): Promise<void> {
  const activeNames = hookDefs.map((d) => d.name);

  if (ide.name === "claude") {
    const settingsPath = join(cwd, ide.configDir, "settings.json");
    let existing: Record<string, unknown> = {};
    if (await fs.exists(settingsPath)) {
      try {
        existing = JSON.parse(await fs.readFile(settingsPath));
      } catch {
        // Invalid JSON — start fresh for hooks section
      }
    }

    // Cleanup removed hooks
    existing = cleanupRemovedHooks(
      existing,
      oldManifest,
      activeNames,
      "claude",
    );

    // Generate new hook entries
    const claudeHooks = hookDefs.map(({ name, hook }) =>
      transformHookForClaude(
        hook,
        `${ide.configDir}/scripts/${name}/run.ts`,
      )
    );

    const merged = mergeClaudeHooks(existing, claudeHooks, oldManifest);
    await fs.writeFile(settingsPath, JSON.stringify(merged, null, 2));
  } else if (ide.name === "cursor") {
    const hooksPath = join(cwd, ide.configDir, "hooks.json");
    let existing: Record<string, unknown> = {};
    if (await fs.exists(hooksPath)) {
      try {
        existing = JSON.parse(await fs.readFile(hooksPath));
      } catch {
        // Invalid JSON
      }
    }

    existing = cleanupRemovedHooks(
      existing,
      oldManifest,
      activeNames,
      "cursor",
    );

    const cursorHooks = hookDefs.map(({ name, hook }) =>
      transformHookForCursor(
        hook,
        `${ide.configDir}/scripts/${name}/run.ts`,
      )
    );

    const merged = mergeCursorHooks(existing, cursorHooks, oldManifest);
    await fs.writeFile(hooksPath, JSON.stringify(merged, null, 2));
  } else if (ide.name === "opencode") {
    const pluginPath = join(
      cwd,
      ide.configDir,
      "plugins",
      "flowai-hooks.ts",
    );
    const openCodeHooks = hookDefs.map(({ name, hook }) => ({
      name,
      hook,
      scriptPath: `${ide.configDir}/scripts/${name}/run.ts`,
    }));
    const content = generateOpenCodePlugin(openCodeHooks);
    await fs.writeFile(pluginPath, content);
  } else if (ide.name === "codex") {
    // FR-DIST.CODEX-HOOKS — Codex uses Claude-Code-compatible nested schema
    // at <repo>/.codex/hooks.json. Handled by syncCodexHooks elsewhere (call
    // site already gates on experimental.codexHooks).
    const hooksPath = join(cwd, ide.configDir, "hooks.json");
    const existingRaw = await fs.exists(hooksPath)
      ? await fs.readFile(hooksPath)
      : null;
    let existing: Record<string, unknown> = {};
    if (existingRaw) {
      try {
        existing = JSON.parse(existingRaw);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(
          `Failed to parse existing ${hooksPath}: ${msg}. Fix the file by hand and re-run sync.`,
        );
      }
    }

    const activeNames = hookDefs.map((h) => h.name);
    existing = cleanupRemovedHooks(
      existing,
      oldManifest,
      activeNames,
      "claude", // Codex uses the same nested shape as Claude Code
    );

    const codexHooks = hookDefs.map(({ name, hook }) =>
      transformHookForClaude(
        hook,
        `${ide.configDir}/scripts/${name}/run.ts`,
      )
    );
    const merged = mergeClaudeHooks(existing, codexHooks, oldManifest);
    await fs.writeFile(hooksPath, JSON.stringify(merged, null, 2));
  }
}

/**
 * FR-DIST.CODEX-AGENTS — Sync framework agents to Codex subagent format.
 *
 * Writes each agent as two artifacts:
 * 1. `<cwd>/.codex/agents/<name>.toml` — sidecar with `name`, `description`,
 *    `developer_instructions` (the agent body as a TOML multi-line literal).
 * 2. `[agents.<name>]` block merged into `<cwd>/.codex/config.toml` with
 *    `description` and `config_file` keys pointing at the sidecar.
 *
 * Idempotent. Removing an agent from `.flowai.yaml` removes both the sidecar
 * and the `[agents.<name>]` block on next sync. User-hand-edited tables outside
 * the flowai manifest survive untouched.
 */
async function syncCodexAgents(
  cwd: string,
  ide: IDE,
  agentNames: string[],
  allAgentNames: string[],
  allPaths: string[],
  source: FrameworkSource,
  fs: FsAdapter,
  isFirstIde: boolean,
  result: SyncResult,
  log: (msg: string) => void,
): Promise<void> {
  // 1. Read raw universal agent files and build sidecars + changes.
  const sidecarsDir = join(cwd, ide.configDir, "agents");
  const sidecarPlan: PlanItem[] = [];
  const changes: CodexAgentChange[] = [];

  // Find the raw source path for each agent — pack-based or legacy flat.
  const packAgentRegex = /^framework\/[^/]+\/agents\/([^/]+)\.md$/;
  const packAgentPaths = new Map<string, string>();
  for (const p of allPaths) {
    const m = p.match(packAgentRegex);
    if (m) packAgentPaths.set(m[1], p);
  }

  for (const name of agentNames) {
    const srcPath = packAgentPaths.get(name) ??
      (allPaths.includes(`framework/agents/${name}.md`)
        ? `framework/agents/${name}.md`
        : null);
    if (!srcPath) continue;
    const raw = await source.readFile(srcPath);
    const { sidecar, change } = buildCodexAgentSidecar(raw);
    changes.push(change);
    const sidecarPath = join(sidecarsDir, `${name}.toml`);
    const action: PlanAction = await fs.exists(sidecarPath)
      ? (await fs.readFile(sidecarPath)) === sidecar ? "ok" : "conflict"
      : "create";
    sidecarPlan.push({
      type: "agent",
      name,
      action,
      sourcePath: srcPath,
      targetPath: sidecarPath,
      content: sidecar,
    });
  }

  // 2. Compute sidecars to delete (agents excluded from current sync but
  //    still present on disk under our manifest).
  const includedSet = new Set(agentNames);
  const deletionCandidates = allAgentNames.filter((n) => !includedSet.has(n));
  for (const name of deletionCandidates) {
    const sidecarPath = join(sidecarsDir, `${name}.toml`);
    if (await fs.exists(sidecarPath)) {
      sidecarPlan.push({
        type: "agent",
        name,
        action: "delete",
        sourcePath: "",
        targetPath: sidecarPath,
        content: "",
      });
    }
  }

  if (isFirstIde) {
    result.agentActions = extractResourceActions(
      sidecarPlan,
      agentNames,
      new Map(),
    );
  }

  // 3. Write sidecars via the shared writer (handles conflict prompts).
  await processPlan(sidecarPlan, fs, { yes: true }, result, log);

  // 4. Read existing config.toml + manifest, merge, write.
  const configPath = join(cwd, ide.configDir, "config.toml");
  const manifestPath = join(cwd, ide.configDir, "flowai-agents.json");
  const existingToml = await fs.exists(configPath)
    ? await fs.readFile(configPath)
    : "";
  const existingManifest = readCodexManifest(
    await fs.exists(manifestPath) ? await fs.readFile(manifestPath) : null,
  );

  const { content: newToml, manifest: newManifest } = mergeCodexConfig(
    existingToml,
    changes,
    existingManifest,
  );

  if (newToml !== existingToml) {
    await fs.writeFile(configPath, newToml);
    result.totalWritten++;
  }
  await fs.writeFile(manifestPath, writeCodexManifest(newManifest));
}
