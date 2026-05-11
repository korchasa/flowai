// [FR-DIST.SYNC](../../documents/requirements.md#fr-dist.sync-sync-command-flowai) — resource resolution layer
// [FR-PACKS](../../documents/requirements.md#fr-packs-pack-system-modular-resource-installation) — pack-based resource resolution
// [FR-PACKS.SCOPE](../../documents/requirements.md#fr-packs.scope-scope-frontmatter-field) — per-primitive scope filter (project-only / global-only).
/** IDE / pack / scope resolution helpers shared by `sync()` and per-kind sync ops. */
import type { FsAdapter } from "./adapters/fs.ts";
import { migrateV1ToV1_1, saveConfig } from "./config.ts";
import { resolveIDEs } from "./ide.ts";
import type { SyncScope } from "./scope.ts";
import {
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
  hasPacks,
} from "./source.ts";
import { DEFAULT_MODEL_MAPS } from "./transform.ts";
import type { FlowConfig, IDE } from "./types.ts";
import { filterNamesByScope, readPackDefinitions } from "./resource_reader.ts";
import {
  buildAssetsIndex,
  buildScaffoldsIndex,
  filterNames,
} from "./resource_index.ts";
import type { SyncResult } from "./sync.ts";

/** Merge default model map with user overrides from .flowai.yaml */
export function mergeModelMap(
  ideName: string,
  config: FlowConfig,
): Record<string, string> {
  const defaults = DEFAULT_MODEL_MAPS[ideName] ?? {};
  const overrides = config.models?.[ideName] ?? {};
  return { ...defaults, ...overrides };
}

export interface ResourceNames {
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

export interface FrameworkEnvironment {
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
export async function loadFrameworkAndIndexes(
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
export async function resolveResourcesForSync(
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

/**
 * Resolve target IDEs (config-driven or auto-detected) and log the chosen set.
 * Throws when none resolve — refuses to run a no-op sync silently.
 */
export async function resolveTargetIdes(
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
