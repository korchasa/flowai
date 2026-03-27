/** Sync orchestrator — resolves IDEs, reads bundled framework, computes plan, writes files */
import { type FsAdapter, join } from "./adapters/fs.ts";
import { migrateV1ToV1_1, saveConfig } from "./config.ts";
import { resolveIDEs } from "./ide.ts";
import { computePlan, planSummary } from "./plan.ts";
import {
  BundledSource,
  extractAgentNames,
  extractPackAgentNames,
  extractPackHookNames,
  extractPackNames,
  extractPackScriptNames,
  extractPackSkillNames,
  extractSkillNames,
  type FrameworkSource,
  hasPacks,
} from "./source.ts";
import { syncClaudeSymlinks } from "./symlinks.ts";
import { transformAgent } from "./transform.ts";
import { runUserSync } from "./user_sync.ts";
import type {
  FlowConfig,
  PackDefinition,
  PlanItem,
  PlanItemType,
  ResourceAction,
  UpstreamFile,
} from "./types.ts";
import { writeFiles } from "./writer.ts";
import { parse as parseYaml } from "@std/yaml";

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
}

/** Resolve which skills, agents, hooks, and scripts to sync based on packs and filters */
export function resolvePackResources(
  allPaths: string[],
  config: FlowConfig,
): {
  allSkillNames: string[];
  skillNames: string[];
  allAgentNames: string[];
  agentNames: string[];
  hookNames: string[];
  scriptNames: string[];
} {
  const usePacks = hasPacks(allPaths);

  let allSkillNames: string[];
  let allAgentNames: string[];
  let hookNames: string[] = [];
  let scriptNames: string[] = [];

  if (usePacks) {
    // Pack-based: resolve packs → skill/agent/hook/script names
    const allPackNames = extractPackNames(allPaths);
    const selectedPacks = config.packs !== undefined
      ? (config.packs.length > 0 ? config.packs : ["core"]) // [] = core only
      : allPackNames; // v1 legacy: all packs

    allSkillNames = [];
    allAgentNames = [];
    for (const pack of selectedPacks) {
      if (!allPackNames.includes(pack)) continue; // unknown pack, skip
      allSkillNames.push(...extractPackSkillNames(allPaths, pack));
      allAgentNames.push(...extractPackAgentNames(allPaths, pack));
      hookNames.push(...extractPackHookNames(allPaths, pack));
      scriptNames.push(...extractPackScriptNames(allPaths, pack));
    }
    // Deduplicate and sort
    allSkillNames = [...new Set(allSkillNames)].sort();
    allAgentNames = [...new Set(allAgentNames)].sort();
    hookNames = [...new Set(hookNames)].sort();
    scriptNames = [...new Set(scriptNames)].sort();
  } else {
    // Legacy flat structure
    allSkillNames = extractSkillNames(allPaths);
    allAgentNames = extractAgentNames(allPaths);
  }

  // Apply include/exclude filters on top
  const skillNames = filterNames(
    allSkillNames,
    config.skills.include,
    config.skills.exclude,
  );

  const agentNames = filterNames(
    allAgentNames,
    config.agents.include,
    config.agents.exclude,
  );

  return {
    allSkillNames,
    skillNames,
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

  // 2. Load framework files from bundle
  log("Loading framework files...");
  const source = options.source ?? await BundledSource.load();

  try {
    const allPaths = await source.listFiles("framework/");
    const usePacks = hasPacks(allPaths);

    // 2a. Read pack definitions (versions + scaffolds)
    const packDefs = usePacks
      ? await readPackDefinitions(allPaths, source)
      : [];
    const scaffoldsIndex = buildScaffoldsIndex(packDefs);

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
      allAgentNames,
      agentNames,
      hookNames,
      scriptNames,
    } = resolvePackResources(allPaths, config);

    if (usePacks && config.packs !== undefined) {
      log(`Packs: ${config.packs.join(", ")}`);
    }

    log(
      `Skills to sync: ${
        skillNames.length > 0 ? skillNames.join(", ") : "(none)"
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

      // Skills
      const skillTargetDir = join(cwd, ide.configDir, "skills");
      if (skillNames.length > 0) {
        const skillFiles = usePacks
          ? await readPackSkillFiles(skillNames, allPaths, source)
          : await readSkillFiles(skillNames, allPaths, source);
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

      // Agents (transform per IDE)
      const agentTargetDir = join(cwd, ide.configDir, "agents");
      if (agentNames.length > 0) {
        const agentFiles = usePacks
          ? await readPackAgentFiles(agentNames, ide.name, allPaths, source)
          : await readAgentFiles(agentNames, ide.name, allPaths, source);
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

      // Hooks (copy run.sh to scripts dir, IDE-specific config deferred)
      if (hookNames.length > 0 && usePacks) {
        const hookFiles = await readPackHookFiles(hookNames, allPaths, source);
        const hookTargetDir = join(cwd, ide.configDir, "scripts");
        const hookPlan = await computePlan(
          hookFiles,
          hookTargetDir,
          "hook",
          fs,
        );
        if (isFirstIde && hookPlan.length > 0) {
          log(`  Hooks: ${hookNames.join(", ")}`);
        }
        await processPlan(hookPlan, fs, options, result, log);
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

/** Read skill files from legacy flat framework/skills/ */
async function readSkillFiles(
  skillNames: string[],
  allPaths: string[],
  source: FrameworkSource,
): Promise<UpstreamFile[]> {
  const files: UpstreamFile[] = [];
  for (const name of skillNames) {
    const prefix = `framework/skills/${name}/`;
    const paths = allPaths.filter((p) => p.startsWith(prefix));
    for (const path of paths) {
      const content = await source.readFile(path);
      const relativePath = path.substring("framework/skills/".length);
      files.push({ path: relativePath, content });
    }
  }
  return files;
}

/** Read skill files from pack structure framework/<pack>/skills/ */
async function readPackSkillFiles(
  skillNames: string[],
  allPaths: string[],
  source: FrameworkSource,
): Promise<UpstreamFile[]> {
  const files: UpstreamFile[] = [];
  const nameSet = new Set(skillNames);

  // Find all pack skill paths matching requested names
  const packSkillRegex = /^framework\/[^/]+\/skills\/([^/]+)\//;
  for (const path of allPaths) {
    const match = path.match(packSkillRegex);
    if (match && nameSet.has(match[1])) {
      const content = await source.readFile(path);
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

/** Read agent files from legacy flat framework/agents/ and transform for target IDE */
async function readAgentFiles(
  agentNames: string[],
  ideName: string,
  allPaths: string[],
  source: FrameworkSource,
): Promise<UpstreamFile[]> {
  const files: UpstreamFile[] = [];
  for (const name of agentNames) {
    const agentPath = `framework/agents/${name}.md`;
    if (allPaths.includes(agentPath)) {
      const raw = await source.readFile(agentPath);
      const content = transformAgent(raw, ideName);
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
): Promise<UpstreamFile[]> {
  const files: UpstreamFile[] = [];
  const nameSet = new Set(agentNames);

  const packAgentRegex = /^framework\/[^/]+\/agents\/([^/]+)\.md$/;
  for (const path of allPaths) {
    const match = path.match(packAgentRegex);
    if (match && nameSet.has(match[1])) {
      const raw = await source.readFile(path);
      const content = transformAgent(raw, ideName);
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

    packs.push({
      name: String(data.name ?? ""),
      version: String(data.version ?? "0.0.0"),
      description: String(data.description ?? ""),
      scaffolds,
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
