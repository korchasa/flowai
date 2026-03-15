import { Command } from "@cliffy/command";
import { Checkbox, Confirm } from "@cliffy/prompt";
import { wait } from "@denosaurs/wait";
import { DenoFsAdapter } from "./adapters/fs.ts";
import { loadConfig } from "./config.ts";
import { generateConfig } from "./config_generator.ts";
import type { PlanItem } from "./types.ts";
import { sync, type SyncOptions } from "./sync.ts";
import { checkForUpdate, VERSION } from "./version.ts";

/** CLI entry point */
export async function main(args: string[]): Promise<void> {
  const command = new Command()
    .name("flowai")
    .version(VERSION)
    .description(
      "Sync AssistFlow framework skills/agents into project-local IDE config dirs.",
    )
    .option("-y, --yes", "Non-interactive mode: overwrite all without asking", {
      default: false,
    })
    .option(
      "--skip-update-check",
      "Skip checking for newer versions on JSR",
      { default: false },
    )
    .action(async (options) => {
      const cwd = Deno.cwd();
      const fs = new DenoFsAdapter();
      const yes = options.yes as boolean;
      const skipUpdateCheck = options.skipUpdateCheck as boolean;

      // 0. Check for updates (before sync, fail-open)
      if (!skipUpdateCheck) {
        const update = await checkForUpdate(VERSION);
        if (update?.updateAvailable) {
          console.log(
            `\nUpdate available: ${update.currentVersion} → ${update.latestVersion}`,
          );
          console.log(`Run: ${update.updateCommand}\n`);
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
          for (let i = 0; i < conflicts.length; i++) {
            console.log(`  ${i + 1}. ${conflicts[i].targetPath}`);
          }
          const selected = await Checkbox.prompt({
            message: "Select files to overwrite",
            options: conflicts.map((c, i) => ({
              name: c.targetPath,
              value: String(i),
            })),
          });
          spinner.start();
          return selected.map(Number);
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
    });

  await command.parse(args);
}
