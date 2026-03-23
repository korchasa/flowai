import { Command } from "@cliffy/command";
import { Confirm } from "@cliffy/prompt";
import { wait } from "@denosaurs/wait";
import { DenoFsAdapter } from "./adapters/fs.ts";
import { loadConfig } from "./config.ts";
import { generateConfig } from "./config_generator.ts";
import { isInsideIDE } from "./ide.ts";
import type { PlanItem } from "./types.ts";
import { sync, type SyncOptions } from "./sync.ts";
import {
  buildUpdateCommand,
  checkForUpdate,
  runUpdate,
  VERSION,
} from "./version.ts";

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
    ) as T;
}

/** Extract sync options from parsed cliffy options */
function extractSyncOptions(
  options: Record<string, unknown>,
): { yes: boolean; skipUpdateCheck: boolean } {
  return {
    yes: options.yes as boolean,
    skipUpdateCheck: options.skipUpdateCheck as boolean,
  };
}

/** Shared sync action used by both bare command (outside IDE) and `sync` subcommand */
async function runSync(options: {
  yes: boolean;
  skipUpdateCheck: boolean;
}): Promise<void> {
  const cwd = Deno.cwd();
  const fs = new DenoFsAdapter();
  const { yes, skipUpdateCheck } = options;

  // 0. Check for updates (before sync, fail-open)
  if (!skipUpdateCheck) {
    const update = await checkForUpdate(VERSION);
    if (update?.updateAvailable) {
      console.log(
        `\nUpdate available: ${update.currentVersion} → ${update.latestVersion}`,
      );

      if (yes) {
        console.log(
          `Run: ${buildUpdateCommand(update.latestVersion)}\n`,
        );
      } else {
        const doUpdate = await Confirm.prompt({
          message: "Update now?",
          default: true,
        });

        if (doUpdate) {
          const success = await runUpdate(update.latestVersion);
          if (success) {
            console.log(
              `\nUpdated to ${update.latestVersion}. Please re-run flowai.\n`,
            );
            return;
          }
        }
      }
    }
  }

  // 1. Load or generate config
  let config = await loadConfig(cwd, fs);
  const isNewConfig = !config;

  if (!config) {
    if (yes) {
      throw new Error(
        "No .flowai.yaml found. Cannot run in non-interactive mode without config.",
      );
    }
    config = await generateConfig(cwd, fs);
  }

  // 2. Show sync plan
  console.log("Sync plan:");
  console.log(`  IDEs: ${config.ides.join(", ") || "(auto-detect)"}`);

  if (config.skills.include.length > 0) {
    console.log(`  Skills (include): ${config.skills.include.join(", ")}`);
  } else if (config.skills.exclude.length > 0) {
    console.log(`  Skills (exclude): ${config.skills.exclude.join(", ")}`);
  } else {
    console.log("  Skills: all");
  }

  if (config.agents.include.length > 0) {
    console.log(`  Agents (include): ${config.agents.include.join(", ")}`);
  } else if (config.agents.exclude.length > 0) {
    console.log(`  Agents (exclude): ${config.agents.exclude.join(", ")}`);
  } else {
    console.log("  Agents: all");
  }

  // Confirm only for newly generated configs
  if (isNewConfig && !yes) {
    const proceed = await Confirm.prompt({
      message: "Proceed with sync?",
      default: true,
    });
    if (!proceed) {
      console.log("Aborted.");
      return;
    }
  }

  // 3. Execute sync
  const spinner = wait({ text: "Syncing...", color: "cyan" });
  spinner.start();

  const syncOptions: SyncOptions = {
    yes,
    onProgress: (msg) => {
      spinner.text = msg;
    },
    promptConflicts: yes ? undefined : async (conflicts: PlanItem[]) => {
      spinner.stop();
      console.log("\nLocally modified files detected:");
      for (const c of conflicts) {
        console.log(`  - ${c.targetPath}`);
      }
      const overwrite = await Confirm.prompt({
        message: "Overwrite all?",
        default: true,
      });
      spinner.start();
      return overwrite ? conflicts.map((_, i) => i) : [];
    },
  };

  try {
    const result = await sync(cwd, config, fs, syncOptions);
    spinner.stop();

    // 4. Summary
    console.log("\nSync complete:");
    console.log(`  Written: ${result.totalWritten}`);
    console.log(`  Unchanged: ${result.totalSkipped}`);
    if (result.totalConflicts > 0) {
      console.log(`  Overwritten (conflicts): ${result.totalConflicts}`);
    }
    if (result.errors.length > 0) {
      console.error(`  Errors: ${result.errors.length}`);
      for (const err of result.errors) {
        console.error(`    ${err.path}: ${err.error}`);
      }
    }
    if (result.symlinkResult) {
      const sl = result.symlinkResult;
      if (
        sl.created.length > 0 || sl.updated.length > 0 ||
        sl.skipped.length > 0
      ) {
        console.log(
          `  CLAUDE.md symlinks: ${sl.created.length} created, ${sl.updated.length} updated, ${sl.skipped.length} skipped`,
        );
      }
    }
  } catch (e) {
    spinner.stop();
    throw e;
  }
}

/** CLI entry point */
export async function main(args: string[]): Promise<void> {
  const syncSubcommand = withSyncOptions(
    new Command()
      .description(
        "Explicitly sync framework skills/agents into IDE config dirs.",
      ),
    // deno-lint-ignore no-explicit-any
  ).action(async (options: any) => {
    await runSync(extractSyncOptions(options as Record<string, unknown>));
  });

  const command = withSyncOptions(
    new Command()
      .name("flowai")
      .version(VERSION)
      .description(
        "Sync AssistFlow framework skills/agents into project-local IDE config dirs.",
      ),
  )
    // deno-lint-ignore no-explicit-any
    .action(async (options: any) => {
      // Inside IDE context: show update hint + sync command instead of auto-syncing
      if (isInsideIDE()) {
        const update = await checkForUpdate(VERSION).catch(() => null);
        if (update?.updateAvailable) {
          console.log(
            `Update available: ${update.currentVersion} → ${update.latestVersion}`,
          );
          console.log(`Run: ${update.updateCommand}`);
          console.log("");
        }
        console.log(
          "IDE context detected. Run `flowai sync -y --skip-update-check` or use `/flow-update` skill.",
        );
        return;
      }

      await runSync(extractSyncOptions(options as Record<string, unknown>));
    })
    .command("sync", syncSubcommand);

  await command.parse(args);
}
