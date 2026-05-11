// [FR-DIST.SYNC](../../documents/requirements.md#fr-dist.sync-sync-command-flowai) — `flowai sync` runner
// [FR-DIST.GLOBAL](../../documents/requirements.md#fr-dist.global-scope-selection-global-local-auto) — scope resolution
/** Shared sync action invoked by the bare CLI and the `sync` subcommand.
 * Encapsulates scope flag handling, config bootstrap, plan rendering, and the
 * post-prompt write step. */
import type { Command } from "@cliffy/command";
import { Confirm } from "@cliffy/prompt";
import { wait } from "@denosaurs/wait";
import { DenoFsAdapter, type FsAdapter } from "./adapters/fs.ts";
import { detectColor, red } from "./color.ts";
import { loadConfig } from "./config.ts";
import {
  generateConfig,
  generateConfigNonInteractive,
} from "./config_generator.ts";
import {
  resolveAutoScope,
  resolveHomeDir,
  resolveIdeBaseDir,
  resolveScopeMode,
  type ScopeMode,
  type SyncScope,
} from "./scope.ts";
import {
  DEFAULT_GIT_URL,
  type FlowConfig,
  KNOWN_IDES,
  type PlanItem,
} from "./types.ts";
import { sync, type SyncOptions } from "./sync.ts";
import { notifyUpdateAvailable } from "./update.ts";
import { renderSyncOutput } from "./sync_renderer.ts";

/** Add shared sync options to a command (avoids duplication between root and sync subcommand) */
// deno-lint-ignore no-explicit-any
export function withSyncOptions<T extends Command<any>>(cmd: T): T {
  return cmd
    .option("-y, --yes", "Non-interactive mode: overwrite all without asking", {
      default: false,
    })
    .option(
      "--skip-update-check",
      "Skip checking for newer versions on JSR",
      { default: false },
    )
    .option(
      "-g, --global",
      "Force global scope: install into IDE user-level dirs (~/.claude/, ~/.cursor/, etc.) using ~/.flowai.yaml. Mutually exclusive with --local.",
      { default: false },
    )
    .option(
      "-l, --local",
      "Force project-local scope: install into <cwd>/.{ide}/ using <cwd>/.flowai.yaml. Mutually exclusive with --global.",
      { default: false },
    )
    .option(
      "-n, --dry-run",
      "Preview the sync plan without writing any files. Exits 0 regardless of plan size; useful before `-g` to verify target paths.",
      { default: false },
    ) as T;
}

export interface SyncCliOptions {
  yes: boolean;
  skipUpdateCheck: boolean;
  global: boolean;
  local: boolean;
  dryRun: boolean;
}

/** Extract sync options from parsed cliffy options */
export function extractSyncOptions(
  options: Record<string, unknown>,
): SyncCliOptions {
  return {
    yes: options.yes as boolean,
    skipUpdateCheck: options.skipUpdateCheck as boolean,
    global: options.global === true,
    local: options.local === true,
    dryRun: options.dryRun === true,
  };
}

/** Format the pre-sync plan block (Source/IDEs/Skills/Agents).
 *
 * Global-mode extension: after the standard block, lists the resolved
 * user-level target dirs per IDE. Keeps the blast radius visible before the
 * confirmation prompt — a must for `-g`, where writes land in `~/.claude/`,
 * `~/.agents/skills/`, etc. */
export function formatSyncPlan(
  config: FlowConfig,
  ctx: { scope: SyncScope; home: string },
): string {
  const lines: string[] = [];
  lines.push("Sync plan:");

  if (config.source?.ref) {
    const url = config.source.git ?? DEFAULT_GIT_URL;
    lines.push(`  Source: git (${url}@${config.source.ref})`);
  } else if (config.source?.path) {
    lines.push(`  Source: local (${config.source.path})`);
  } else {
    lines.push("  Source: bundled");
  }

  lines.push(`  IDEs: ${config.ides.join(", ") || "(auto-detect)"}`);

  if (config.skills.include.length > 0) {
    lines.push(`  Skills (include): ${config.skills.include.join(", ")}`);
  } else if (config.skills.exclude.length > 0) {
    lines.push(`  Skills (exclude): ${config.skills.exclude.join(", ")}`);
  } else {
    lines.push("  Skills: all");
  }

  if (config.agents.include.length > 0) {
    lines.push(`  Agents (include): ${config.agents.include.join(", ")}`);
  } else if (config.agents.exclude.length > 0) {
    lines.push(`  Agents (exclude): ${config.agents.exclude.join(", ")}`);
  } else {
    lines.push("  Agents: all");
  }

  if (ctx.scope === "global") {
    const targets = new Set<string>();
    for (const ideName of config.ides) {
      if (!KNOWN_IDES[ideName]) continue;
      targets.add(
        resolveIdeBaseDir(ideName, "global", "", ctx.home, "default"),
      );
      if (ideName === "codex") {
        targets.add(
          resolveIdeBaseDir(ideName, "global", "", ctx.home, "skills"),
        );
      }
    }
    if (targets.size > 0) {
      lines.push("  Target dirs:");
      for (const t of [...targets].sort()) lines.push(`    - ${t}`);
    }
  }

  return lines.join("\n");
}

/** Resolve the effective scope for `runSync` given the three-mode flag surface
 * (`--global` / `--local` / `--auto`). Returns the resolved scope plus a flag
 * indicating whether the caller must still prompt for scope (auto mode with
 * no configs on disk). */
export async function resolveEffectiveScope(
  mode: ScopeMode,
  cwd: string,
  home: string,
  fs: DenoFsAdapter | FsAdapter,
): Promise<
  { scope: SyncScope; needsPrompt: boolean; autoUsedGlobal: boolean }
> {
  if (mode === "global") {
    return { scope: "global", needsPrompt: false, autoUsedGlobal: false };
  }
  if (mode === "local") {
    return { scope: "project", needsPrompt: false, autoUsedGlobal: false };
  }
  const resolved = await resolveAutoScope(cwd, home, fs);
  if (resolved === "project") {
    return { scope: "project", needsPrompt: false, autoUsedGlobal: false };
  }
  if (resolved === "global") {
    return { scope: "global", needsPrompt: false, autoUsedGlobal: true };
  }
  return { scope: "global", needsPrompt: true, autoUsedGlobal: false };
}

interface PreparedScope {
  scope: SyncScope;
  effectiveHome: string;
  home: string;
}

/** Validate scope flags and resolve to an effective scope + home pair.
 * Logs and returns null on flag conflict; otherwise returns the prepared scope
 * (post auto-resolve and optional interactive prompt). */
async function prepareScope(
  opts: SyncCliOptions,
  fs: FsAdapter,
  cwd: string,
): Promise<PreparedScope | null> {
  let mode: ScopeMode;
  try {
    mode = resolveScopeMode({ global: opts.global, local: opts.local });
  } catch (err) {
    console.error(red((err as Error).message, detectColor()));
    return null;
  }

  const home = resolveHomeDir();
  const resolution = await resolveEffectiveScope(mode, cwd, home, fs);
  let scope: SyncScope = resolution.scope;

  if (resolution.autoUsedGlobal) {
    console.log(`Using global config at ${home}/.flowai.yaml (--auto).`);
  }
  if (resolution.needsPrompt && !opts.yes && !opts.dryRun) {
    const pickLocal = await Confirm.prompt({
      message:
        "No flowai config found. Create a project-local config (.flowai.yaml in this dir)? Answer 'no' to set up a global config instead.",
      default: false,
    });
    if (pickLocal) {
      scope = "project";
    }
  }
  // Downstream functions expect `home` empty for project scope.
  const effectiveHome = scope === "global" ? home : "";
  return { scope, effectiveHome, home };
}

/** Load existing flowai config or generate a new one (interactive vs `-y`).
 * Returns null when dry-run is set and no config exists (caller should exit 0
 * without writing a config). The `isNewConfig` flag distinguishes generated
 * configs from existing ones — used downstream to gate the post-plan
 * confirmation prompt. */
async function loadOrGenerateConfig(
  cwd: string,
  fs: FsAdapter,
  scope: SyncScope,
  effectiveHome: string,
  home: string,
  opts: SyncCliOptions,
): Promise<{ config: FlowConfig; isNewConfig: boolean } | null> {
  let config = await loadConfig(cwd, fs, scope, effectiveHome);
  const isNewConfig = !config;

  if (!config) {
    if (opts.dryRun) {
      console.log(
        "[DRY RUN] No .flowai.yaml found. Run without --dry-run to generate one interactively, or with -y for defaults.",
      );
      return null;
    }
    if (scope === "global" && opts.yes) {
      console.log(
        `Global mode: creating ${home}/.flowai.yaml and installing to IDE user dirs (all ${
          Object.keys(KNOWN_IDES).length
        } known IDEs). Edit the config \`ides:\` field to narrow.`,
      );
    }
    config = opts.yes
      ? await generateConfigNonInteractive(
        cwd,
        fs,
        undefined,
        scope,
        effectiveHome,
      )
      : await generateConfig(cwd, fs, undefined, scope, effectiveHome);
  }
  return { config, isNewConfig };
}

/** Execute sync (with spinner, conflict prompt, and output rendering).
 * Returns the exit code: 0 on success, 1 on any write error in a real run.
 * Dry-run can never fail. */
async function executeSync(
  cwd: string,
  fs: FsAdapter,
  config: FlowConfig,
  scope: SyncScope,
  effectiveHome: string,
  opts: SyncCliOptions,
): Promise<number> {
  const { yes, dryRun } = opts;
  const spinner = dryRun ? null : wait({ text: "Syncing...", color: "cyan" });
  spinner?.start();

  const syncOptions: SyncOptions = {
    yes,
    scope,
    home: effectiveHome,
    dryRun,
    onProgress: (msg) => {
      if (spinner) spinner.text = msg;
    },
    promptConflicts: (yes || dryRun)
      ? undefined
      : async (conflicts: PlanItem[]) => {
        spinner?.stop();
        console.log("\nLocally modified files detected:");
        for (const c of conflicts) {
          console.log(`  - ${c.targetPath}`);
        }
        const overwrite = await Confirm.prompt({
          message: "Overwrite all?",
          default: true,
        });
        spinner?.start();
        return overwrite ? conflicts.map((_, i) => i) : [];
      },
  };

  try {
    const result = await sync(cwd, config, fs, syncOptions);
    spinner?.stop();
    renderSyncOutput(result);
    return (!dryRun && result.errors.length > 0) ? 1 : 0;
  } catch (e) {
    spinner?.stop();
    throw e;
  }
}

/** Shared sync action used by both bare command (outside IDE) and `sync` subcommand.
 *
 * Returns exit code (0 = success, 1 = errors). Caller invokes `Deno.exit`. */
export async function runSync(opts: SyncCliOptions): Promise<number> {
  const cwd = Deno.cwd();
  const fs = new DenoFsAdapter();

  const prepared = await prepareScope(opts, fs, cwd);
  if (!prepared) return 1;
  const { scope, effectiveHome, home } = prepared;

  // 0. Notify about a newer version (fail-open). Never installs — users run
  //    `flowai update` to apply. Skipped under dry-run and `--skip-update-check`.
  if (!opts.dryRun) {
    await notifyUpdateAvailable({ skip: opts.skipUpdateCheck });
  }

  // 1. Load or generate config (scope-aware path).
  const loaded = await loadOrGenerateConfig(
    cwd,
    fs,
    scope,
    effectiveHome,
    home,
    opts,
  );
  if (!loaded) return 0;
  const { config, isNewConfig } = loaded;

  // 2. Show sync plan (includes Target dirs in global mode)
  if (opts.dryRun) {
    console.log("[DRY RUN] Previewing sync — no files will be written.");
  }
  console.log(formatSyncPlan(config, { scope, home: effectiveHome }));

  // Confirm only for newly generated configs (skipped under dry-run since
  // dry-run has no side effects to confirm).
  if (isNewConfig && !opts.yes && !opts.dryRun) {
    const proceed = await Confirm.prompt({
      message: "Proceed with sync?",
      default: true,
    });
    if (!proceed) {
      console.log("Aborted.");
      return 0;
    }
  }

  // 3. Execute sync.
  return executeSync(cwd, fs, config, scope, effectiveHome, opts);
}
