import { Command } from "@cliffy/command";
import { Confirm } from "@cliffy/prompt";
import { wait } from "@denosaurs/wait";
import { DenoFsAdapter } from "./adapters/fs.ts";
import { loadConfig } from "./config.ts";
import {
  generateConfig,
  generateConfigNonInteractive,
} from "./config_generator.ts";
import { isInsideIDE } from "./ide.ts";
import type { PlanItem, ResourceAction } from "./types.ts";
import { sync, type SyncOptions, type SyncResult } from "./sync.ts";
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
    config = yes
      ? await generateConfigNonInteractive(cwd, fs)
      : await generateConfig(cwd, fs);
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

    // 4. Render instruction-oriented output
    renderSyncOutput(result);
  } catch (e) {
    spinner.stop();
    throw e;
  }
}

/** Render instruction-oriented sync output */
export function renderSyncOutput(result: SyncResult): void {
  console.log("\nflowai sync complete.");

  const actions: string[] = [];
  let actionNum = 0;

  // Config migration
  if (result.configMigrated) {
    const m = result.configMigrated;
    actionNum++;
    actions.push(
      `${actionNum}. CONFIG MIGRATED (v${m.from} -> v${m.to}):\n` +
        `   .flowai.yaml updated with packs: ${m.packs.join(", ")}.\n` +
        `   Commit this file.`,
    );
  }

  // Group skill actions by type
  const skillsByAction = groupByAction(result.skillActions);

  if (skillsByAction.update.length > 0) {
    actionNum++;
    const lines = skillsByAction.update.map((s) => {
      const scaff = s.scaffolds.length > 0
        ? ` (scaffolds: ${s.scaffolds.join(", ")})`
        : "";
      return `   - ${s.name}${scaff}`;
    });
    actions.push(
      `${actionNum}. SKILLS UPDATED (${skillsByAction.update.length}):\n` +
        lines.join("\n") + "\n" +
        `   For each skill with scaffolds: compare the updated template against the project artifact using git diff on the skill directory.`,
    );
  }

  if (skillsByAction.create.length > 0) {
    actionNum++;
    const lines = skillsByAction.create.map((s) => `   - ${s.name}`);
    actions.push(
      `${actionNum}. SKILLS CREATED (${skillsByAction.create.length}):\n` +
        lines.join("\n") + "\n" +
        `   No migration needed for new skills.`,
    );
  }

  if (skillsByAction.delete.length > 0) {
    actionNum++;
    const lines = skillsByAction.delete.map((s) => `   - ${s.name}`);
    actions.push(
      `${actionNum}. SKILLS DELETED (${skillsByAction.delete.length}):\n` +
        lines.join("\n") + "\n" +
        `   Check if deleted skills are referenced in project docs.`,
    );
  }

  // Agent actions
  const agentsByAction = groupByAction(result.agentActions);
  if (agentsByAction.update.length > 0) {
    actionNum++;
    const lines = agentsByAction.update.map((a) => `   - ${a.name}`);
    actions.push(
      `${actionNum}. AGENTS UPDATED (${agentsByAction.update.length}):\n` +
        lines.join("\n") + "\n" +
        `   Check if agent prompts are referenced in project docs.`,
    );
  }
  if (agentsByAction.create.length > 0) {
    actionNum++;
    const lines = agentsByAction.create.map((a) => `   - ${a.name}`);
    actions.push(
      `${actionNum}. AGENTS CREATED (${agentsByAction.create.length}):\n` +
        lines.join("\n") + "\n" +
        `   New agents installed.`,
    );
  }
  if (agentsByAction.delete.length > 0) {
    actionNum++;
    const lines = agentsByAction.delete.map((a) => `   - ${a.name}`);
    actions.push(
      `${actionNum}. AGENTS DELETED (${agentsByAction.delete.length}):\n` +
        lines.join("\n") + "\n" +
        `   Check if deleted agents are referenced in project docs.`,
    );
  }

  // Hook actions
  const hooksByAction = groupByAction(result.hookActions);
  if (hooksByAction.create.length > 0) {
    actionNum++;
    const lines = hooksByAction.create.map((h) => `   - ${h.name}`);
    actions.push(
      `${actionNum}. HOOKS INSTALLED (${hooksByAction.create.length}):\n` +
        lines.join("\n") + "\n" +
        `   IDE hook configuration auto-generated.`,
    );
  }
  if (hooksByAction.update.length > 0) {
    actionNum++;
    const lines = hooksByAction.update.map((h) => `   - ${h.name}`);
    actions.push(
      `${actionNum}. HOOKS UPDATED (${hooksByAction.update.length}):\n` +
        lines.join("\n"),
    );
  }
  if (hooksByAction.delete.length > 0) {
    actionNum++;
    const lines = hooksByAction.delete.map((h) => `   - ${h.name}`);
    actions.push(
      `${actionNum}. HOOKS DELETED (${hooksByAction.delete.length}):\n` +
        lines.join("\n") + "\n" +
        `   Removed from IDE hook configuration.`,
    );
  }

  // Errors
  if (result.errors.length > 0) {
    actionNum++;
    const lines = result.errors.map((e) => `   - ${e.path}: ${e.error}`);
    actions.push(
      `${actionNum}. ERRORS (${result.errors.length}):\n` + lines.join("\n"),
    );
  }

  // Render
  if (actions.length > 0) {
    console.log("\n>>> ACTIONS REQUIRED:\n");
    console.log(actions.join("\n\n"));
  }

  // No-action summary
  const okSkills = skillsByAction.ok.length;
  const okAgents = agentsByAction.ok.length;
  const okHooks = hooksByAction.ok.length;
  const noActionParts: string[] = [];
  if (okSkills > 0) noActionParts.push(`${okSkills} skills unchanged`);
  if (okAgents > 0) noActionParts.push(`${okAgents} agents unchanged`);
  if (okHooks > 0) noActionParts.push(`${okHooks} hooks unchanged`);

  if (actions.length === 0) {
    console.log("\n>>> NO ACTIONS REQUIRED.");
    if (noActionParts.length > 0) {
      console.log(`${noActionParts.join(", ")}.`);
    }
  } else if (noActionParts.length > 0) {
    console.log(`\n>>> NO ACTIONS REQUIRED:\n${noActionParts.join(", ")}.`);
  }

  // Symlinks (informational)
  if (result.symlinkResult) {
    const sl = result.symlinkResult;
    if (
      sl.created.length > 0 || sl.updated.length > 0
    ) {
      console.log(
        `\nCLAUDE.md symlinks: ${sl.created.length} created, ${sl.updated.length} updated.`,
      );
    }
  }
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
    .action(async (options: any) => {
      // Inside IDE context: show sync hint instead of auto-syncing
      if (isInsideIDE()) {
        console.log(
          "IDE context detected. Run `flowai sync -y --skip-update-check` or use `/flowai-update` skill.",
        );
        return;
      }

      await runSync(extractSyncOptions(options as Record<string, unknown>));
    })
    .command("sync", syncSubcommand);

  await command.parse(args);
}
