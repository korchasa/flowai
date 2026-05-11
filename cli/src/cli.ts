// [FR-DIST.SYNC](../../documents/requirements.md#fr-dist.sync-sync-command-flowai) — CLI entry point for flowai sync
// [FR-DIST.GLOBAL](../../documents/requirements.md#fr-dist.global-scope-selection-global-local-auto) — `--global` flag for user-level installs.
// [FR-DIST.UPDATE-CMD](../../documents/requirements.md#fr-dist.update-cmd-self-update-subcommand) — self-update subcommand
// [FR-DIST.MIGRATE](../../documents/requirements.md#fr-dist.migrate-one-way-ide-migration) — migrate subcommand
/** Cliffy command tree assembly. Per-subcommand handlers live in
 * `cli/src/run_sync.ts` (sync flow) and `cli/src/sync_renderer.ts` (output). */
import { Command } from "@cliffy/command";
import { Confirm } from "@cliffy/prompt";
import { DenoFsAdapter } from "./adapters/fs.ts";
import { detectColor, red } from "./color.ts";
import { isInsideIDE } from "./ide.ts";
import { type LoopOptions, runLoop } from "./loop.ts";
import { type MigrateOptions, runMigrate } from "./migrate.ts";
import { resolveHomeDir, type SyncScope } from "./scope.ts";
import type { PlanItem } from "./types.ts";
import { extractSyncOptions, runSync, withSyncOptions } from "./run_sync.ts";
import { runSelfUpdate } from "./update.ts";
import { checkForUpdate, VERSION } from "./version.ts";

// Re-exports preserved for external tests (cli_test.ts)
export { formatSyncPlan, resolveEffectiveScope } from "./run_sync.ts";
export { type RenderOptions, renderSyncOutput } from "./sync_renderer.ts";

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
