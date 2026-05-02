// [FR-DIST.SYNC](../../documents/requirements.md#fr-dist.sync-sync-command-flowai) — CLI entry point for flowai sync
// [FR-DIST.GLOBAL](../../documents/requirements.md#fr-dist.global-scope-selection-global-local-auto) — `--global` flag for user-level installs.
// [FR-DIST.UPDATE-CMD](../../documents/requirements.md#fr-dist.update-cmd-self-update-subcommand) — self-update subcommand
// [FR-DIST.MIGRATE](../../documents/requirements.md#fr-dist.migrate-one-way-ide-migration) — migrate subcommand
import { Command } from "@cliffy/command";
import { Confirm } from "@cliffy/prompt";
import { wait } from "@denosaurs/wait";
import { DenoFsAdapter, type FsAdapter } from "./adapters/fs.ts";
import { detectColor, red } from "./color.ts";
import { loadConfig } from "./config.ts";
import {
  generateConfig,
  generateConfigNonInteractive,
} from "./config_generator.ts";
import { isInsideIDE } from "./ide.ts";
import { type LoopOptions, runLoop } from "./loop.ts";
import { type MigrateOptions, runMigrate } from "./migrate.ts";
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
  type ResourceAction,
} from "./types.ts";
import { sync, type SyncOptions, type SyncResult } from "./sync.ts";
import { notifyUpdateAvailable, runSelfUpdate } from "./update.ts";
import { checkForUpdate, VERSION } from "./version.ts";

/** Add shared sync options to a command (avoids duplication between root and sync subcommand) */
// deno-lint-ignore no-explicit-any
function withSyncOptions<T extends Command<any>>(cmd: T): T {
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

interface SyncCliOptions {
  yes: boolean;
  skipUpdateCheck: boolean;
  global: boolean;
  local: boolean;
  dryRun: boolean;
}

/** Extract sync options from parsed cliffy options */
function extractSyncOptions(options: Record<string, unknown>): SyncCliOptions {
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
 * `~/.agents/skills/`, etc.
 *
 * Pure string builder — easy to snapshot in tests; `runSync` prints the
 * result via `console.log`. */
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

  // Global-mode path preview. Codex splits into skills + agents dirs, so we
  // surface both — the broken-symlink on `~/.agents/skills` scenario that
  // motivated this preview lives here.
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
 * no configs on disk).
 *
 * Kept exported for tests that cover the resolution matrix without spinning
 * up the full `runSync` pipeline. */
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
  // Both configs missing: default to global so bare `flowai` in a fresh
  // project doesn't silently litter `<cwd>` with a config. Caller can still
  // prompt interactively — surfaced via `needsPrompt`.
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
    // Global-mode first-run notice: primitives go into IDE USER dirs for
    // every known IDE by default, which surprises users who typed --global
    // by mistake. Surface the blast radius before the non-interactive
    // config writer proceeds.
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
async function runSync(opts: SyncCliOptions): Promise<number> {
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

  // 1. Load or generate config (scope-aware path). Dry-run must never write a
  //    config either — if missing, print a hint and exit 0.
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

/** Options for renderSyncOutput. `color` overrides auto-detection (NO_COLOR
 * + stdout.isTerminal); undefined means auto-detect. */
export interface RenderOptions {
  color?: boolean;
}

interface ResourceSection {
  label: string;
  items: ResourceAction[];
  artifactLabel: string;
  hints: { update: string; create: string; delete: string };
}

/** Build the static description of resource sections from a sync result. */
function buildResourceSections(result: SyncResult): ResourceSection[] {
  return [
    {
      label: "SKILLS",
      items: result.skillActions,
      artifactLabel: "scaffolds",
      hints: {
        update:
          "For each skill with scaffolds: compare the updated template against the project artifact using git diff on the skill directory.",
        create: "No migration needed for new skills.",
        delete: "Check if deleted skills are referenced in project docs.",
      },
    },
    {
      label: "AGENTS",
      items: result.agentActions,
      artifactLabel: "",
      hints: {
        update: "Check if agent prompts are referenced in project docs.",
        create: "New agents installed.",
        delete: "Check if deleted agents are referenced in project docs.",
      },
    },
    {
      label: "HOOKS",
      items: result.hookActions,
      artifactLabel: "",
      hints: {
        update: "",
        create: "IDE hook configuration auto-generated.",
        delete: "Removed from IDE hook configuration.",
      },
    },
    {
      label: "ASSETS",
      items: result.assetActions,
      artifactLabel: "artifacts",
      hints: {
        update:
          "For each updated asset: compare the template against the project artifact.",
        create: "New asset templates installed.",
        delete: "",
      },
    },
  ];
}

/** Build the numbered ACTIONS REQUIRED list (config migration + per-section
 * create/update/delete entries). Failed items are excluded so counters report
 * what was actually written. Returned strings are pre-numbered. */
function buildActionEntries(
  result: SyncResult,
  sections: ResourceSection[],
): string[] {
  const actions: string[] = [];
  let actionNum = 0;
  const push = (text: string) => {
    actionNum++;
    actions.push(`${actionNum}. ${text}`);
  };

  if (result.configMigrated) {
    const m = result.configMigrated;
    push(
      `CONFIG MIGRATED (v${m.from} -> v${m.to}):\n` +
        `   .flowai.yaml updated with packs: ${m.packs.join(", ")}.\n` +
        `   Commit this file.`,
    );
  }

  for (const { label, items, artifactLabel, hints } of sections) {
    const grouped = groupByAction(items);
    for (const action of ["update", "create", "delete"] as const) {
      const list = grouped[action];
      if (list.length === 0) continue;
      // Failed items are excluded from the visible list and subtracted from
      // the written count so CREATED (N) reports reality, not intent.
      const written = list.filter((r) => !r.failed);
      const planned = list.length;
      if (written.length === 0) continue; // every item failed — skip section
      const verb = action === "create" && label === "HOOKS"
        ? "INSTALLED"
        : action.toUpperCase() + "D";
      const countStr = written.length === planned
        ? `${planned}`
        : `${written.length}/${planned}`;
      const lines = written.map((r) => {
        const suffix = artifactLabel && r.scaffolds.length > 0
          ? ` (${artifactLabel}: ${r.scaffolds.join(", ")})`
          : "";
        return `   - ${r.name}${suffix}`;
      });
      const hint = hints[action];
      push(
        `${label} ${verb} (${countStr}):\n` + lines.join("\n") +
          (hint ? "\n   " + hint : ""),
      );
    }
  }

  return actions;
}

/** Print the truthful header line: success or red FAILED summary. */
function printSyncHeader(result: SyncResult, color: boolean): void {
  const dryPrefix = result.dryRun ? "[DRY RUN] " : "";
  if (result.errors.length > 0) {
    console.log(
      "\n" +
        red(
          `${dryPrefix}flowai sync FAILED: ${result.errors.length} error(s).`,
          color,
        ),
    );
  } else {
    console.log(`\n${dryPrefix}flowai sync complete.`);
  }
}

/** Print the ACTIONS REQUIRED block followed by the NO ACTIONS summary. */
function printActionsAndSummary(
  actions: string[],
  sections: ResourceSection[],
  hasErrors: boolean,
): void {
  if (actions.length > 0) {
    console.log("\n>>> ACTIONS REQUIRED:\n");
    console.log(actions.join("\n\n"));
  }

  const noActionParts: string[] = [];
  for (const { label, items } of sections) {
    const okCount = items.filter((a) => a.action === "ok").length;
    if (okCount > 0) {
      noActionParts.push(`${okCount} ${label.toLowerCase()} unchanged`);
    }
  }

  if (actions.length === 0 && !hasErrors) {
    console.log("\n>>> NO ACTIONS REQUIRED.");
    if (noActionParts.length > 0) {
      console.log(`${noActionParts.join(", ")}.`);
    }
  } else if (noActionParts.length > 0) {
    console.log(`\n>>> NO ACTIONS REQUIRED:\n${noActionParts.join(", ")}.`);
  }
}

/** Print the trailing ERRORS block + symlink informational summary. */
function printTrailers(result: SyncResult, color: boolean): void {
  if (result.errors.length > 0) {
    console.log("\n" + red(`>>> ERRORS (${result.errors.length}):`, color));
    for (const e of result.errors) {
      console.log(red(`   - ${e.path}: ${e.error}`, color));
    }
  }

  if (result.symlinkResult) {
    const sl = result.symlinkResult;
    if (sl.created.length > 0 || sl.updated.length > 0) {
      console.log(
        `\nCLAUDE.md symlinks: ${sl.created.length} created, ${sl.updated.length} updated.`,
      );
    }
  }
}

/** Render instruction-oriented sync output.
 *
 * Layout:
 *   1. Truthful header — "flowai sync complete." (success) or
 *      "flowai sync FAILED: N error(s)." (red).
 *   2. ACTIONS REQUIRED — numbered list of resource changes. Failed items
 *      are excluded here and counters show `written/planned` when they differ.
 *   3. NO ACTIONS REQUIRED summary (unchanged resource counts).
 *   4. ERRORS block (red) — failed writes, at the very end so they're the
 *      last thing the user sees. */
export function renderSyncOutput(
  result: SyncResult,
  options: RenderOptions = {},
): void {
  const color = options.color ?? detectColor();
  printSyncHeader(result, color);
  const sections = buildResourceSections(result);
  const actions = buildActionEntries(result, sections);
  printActionsAndSummary(actions, sections, result.errors.length > 0);
  printTrailers(result, color);
}

function groupByAction(
  actions: ResourceAction[],
): Record<"create" | "update" | "delete" | "ok", ResourceAction[]> {
  const groups: Record<string, ResourceAction[]> = {
    create: [],
    update: [],
    delete: [],
    ok: [],
  };
  for (const a of actions) {
    (groups[a.action] ?? groups.ok).push(a);
  }
  return groups as Record<
    "create" | "update" | "delete" | "ok",
    ResourceAction[]
  >;
}

/** Build the `sync` subcommand: explicit sync action with shared options. */
function buildSyncSubcommand() {
  return withSyncOptions(
    new Command()
      .description(
        "Explicitly sync framework skills/agents into IDE config dirs.",
      ),
    // deno-lint-ignore no-explicit-any
  ).action(async (options: any) => {
    const code = await runSync(
      extractSyncOptions(options as Record<string, unknown>),
    );
    if (code !== 0) Deno.exit(code);
  });
}

/** Build the `loop` subcommand: non-interactive Claude Code runner. */
function buildLoopSubcommand() {
  return new Command()
    .description("Run Claude Code non-interactively with a prompt.")
    .arguments("<prompt:string>")
    .option("--agent <name:string>", "Agent name (passed as --agent)")
    .option("--model <model:string>", "Model override")
    .option(
      "--cwd <path:string>",
      "Working directory for claude",
      { default: "." },
    )
    .option(
      "--yolo",
      "Pass --dangerously-skip-permissions to claude",
      { default: false },
    )
    .option(
      "--timeout <seconds:number>",
      "Timeout per iteration in seconds (default: no limit)",
    )
    .option(
      "--interval <duration:string>",
      "Pause between iterations, e.g. 30s, 5m, 1h (default: 0)",
    )
    .option(
      "--max-iterations <n:number>",
      "Max number of iterations (default: infinite)",
    )
    // deno-lint-ignore no-explicit-any
    .action(async (options: any, prompt: string) => {
      const cwd = options.cwd === "." ? undefined : options.cwd;
      const loopOpts: LoopOptions = {
        agent: options.agent,
        prompt,
        model: options.model,
        cwd,
        yolo: options.yolo,
        timeout: options.timeout,
        interval: options.interval,
        maxIterations: options.maxIterations,
      };
      const exitCode = await runLoop(loopOpts);
      if (exitCode !== 0) Deno.exit(exitCode);
    });
}

/** Build the `migrate` subcommand: one-way primitive migration between IDEs. */
function buildMigrateSubcommand() {
  return new Command()
    .description(
      "One-way migration of all primitives (skills, agents, commands) from one IDE to another. Requires an explicit scope flag.",
    )
    .arguments("<from:string> <to:string>")
    .option("-y, --yes", "Overwrite without prompt", { default: false })
    .option(
      "-g, --global",
      "Migrate between IDE user-level dirs (e.g. ~/.claude/ → ~/.cursor/). Mutually exclusive with --local.",
      { default: false },
    )
    .option(
      "-l, --local",
      "Migrate between project-local IDE dirs (<cwd>/.{ide}/). Mutually exclusive with --global.",
      { default: false },
    )
    .option(
      "--dry-run",
      "Print what would be migrated without writing files",
      { default: false },
    )
    // deno-lint-ignore no-explicit-any
    .action(async (options: any, from: string, to: string) => {
      const g = options.global === true;
      const l = options.local === true;
      if (g && l) {
        console.error(
          red(
            "--global and --local are mutually exclusive; pass only one.",
            detectColor(),
          ),
        );
        Deno.exit(1);
      }
      if (!g && !l) {
        console.error(
          red(
            "flowai migrate requires an explicit scope: pass --global or --local.",
            detectColor(),
          ),
        );
        Deno.exit(1);
      }
      const scope: SyncScope = g ? "global" : "project";
      const home = g ? resolveHomeDir() : "";
      const migrateOpts: MigrateOptions = {
        yes: options.yes as boolean,
        dryRun: options.dryRun as boolean,
        scope,
        home,
        promptConflicts: options.yes
          ? undefined
          : async (conflicts: PlanItem[]) => {
            console.log("\nConflicts detected:");
            for (const c of conflicts) {
              console.log(`  - ${c.targetPath}`);
            }
            const overwrite = await Confirm.prompt({
              message: "Overwrite all?",
              default: true,
            });
            return overwrite ? conflicts.map((_, i) => i) : [];
          },
      };
      await runMigrate(
        Deno.cwd(),
        from,
        to,
        new DenoFsAdapter(),
        migrateOpts,
        console.log,
      );
    });
}

/** Build the `update` subcommand: self-update from JSR. */
function buildUpdateSubcommand() {
  return new Command()
    .description("Check for a newer flowai version and self-update.")
    // deno-lint-ignore no-explicit-any
    .action(async (_options: any) => {
      await runSelfUpdate();
    });
}

/** Build the bare-command action handler. Inside IDEs that resolve to project
 * scope, prints a hint and exits without running sync — prevents accidental
 * project-config writes from background slash-command invocations. */
function buildRootAction(): (options: unknown) => Promise<void> {
  return async (options: unknown) => {
    const opts = extractSyncOptions(options as Record<string, unknown>);
    // [FR-DIST.GLOBAL](../../documents/requirements.md#fr-dist.global-scope-selection-global-local-auto) — IDE-context guard fires only when the resolved scope
    // is project (auto-detected or forced via --local). Auto-resolution to
    // global is safe inside an IDE (writes land in user dirs, not cwd).
    if (isInsideIDE()) {
      const willBeProject = opts.local ||
        (!opts.global && await new DenoFsAdapter().exists(
          `${Deno.cwd()}/.flowai.yaml`,
        ));
      if (willBeProject) {
        console.log(
          "IDE context detected. Run `flowai sync -y --skip-update-check` or use `/flowai-update` skill.",
        );
        return;
      }
    }

    const code = await runSync(opts);
    if (code !== 0) Deno.exit(code);
  };
}

/** CLI entry point */
export async function main(args: string[]): Promise<void> {
  const command = withSyncOptions(
    new Command()
      .name("flowai")
      .version(VERSION)
      .versionOption(
        "-V, --version",
        "Show the version number for this program.",
        async function () {
          console.log(`flowai ${VERSION}`);
          const update = await checkForUpdate(VERSION).catch(() => null);
          if (update?.updateAvailable) {
            console.log(
              `\nUpdate available: ${update.currentVersion} → ${update.latestVersion}`,
            );
            console.log(`Run: ${update.updateCommand}`);
          }
          Deno.exit(0);
        },
      )
      .description(
        "Sync flowai framework skills/agents into project-local IDE config dirs.",
      ),
  )
    // deno-lint-ignore no-explicit-any
    .action(buildRootAction() as any)
    .command("sync", buildSyncSubcommand())
    .command("loop", buildLoopSubcommand())
    .command("migrate", buildMigrateSubcommand())
    .command("update", buildUpdateSubcommand());

  await command.parse(args);
}
