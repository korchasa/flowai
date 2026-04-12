// FR-DIST.SYNC — CLI entry point for flowai sync
// FR-DIST.UPDATE-CMD — self-update subcommand
// FR-DIST.MIGRATE — migrate subcommand
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
import { type LoopOptions, runLoop } from "./loop.ts";
import { type MigrateOptions, runMigrate } from "./migrate.ts";
import {
  DEFAULT_GIT_URL,
  type PlanItem,
  type ResourceAction,
} from "./types.ts";
import { sync, type SyncOptions, type SyncResult } from "./sync.ts";
import { runSelfUpdate } from "./update.ts";
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
  if (await runSelfUpdate({ yes, skip: skipUpdateCheck })) return;

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

  // Log source type
  if (config.source?.ref) {
    const url = config.source.git ?? DEFAULT_GIT_URL;
    console.log(`  Source: git (${url}@${config.source.ref})`);
  } else if (config.source?.path) {
    console.log(`  Source: local (${config.source.path})`);
  } else {
    console.log("  Source: bundled");
  }

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

  const push = (text: string) => {
    actionNum++;
    actions.push(`${actionNum}. ${text}`);
  };

  // Config migration
  if (result.configMigrated) {
    const m = result.configMigrated;
    push(
      `CONFIG MIGRATED (v${m.from} -> v${m.to}):\n` +
        `   .flowai.yaml updated with packs: ${m.packs.join(", ")}.\n` +
        `   Commit this file.`,
    );
  }

  // Resource sections: skills, agents, hooks, assets
  const sections: Array<{
    label: string;
    items: ResourceAction[];
    artifactLabel: string;
    hints: { update: string; create: string; delete: string };
  }> = [
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

  for (const { label, items, artifactLabel, hints } of sections) {
    const grouped = groupByAction(items);
    for (
      const action of ["update", "create", "delete"] as const
    ) {
      const list = grouped[action];
      if (list.length === 0) continue;
      const verb = action === "create" && label === "HOOKS"
        ? "INSTALLED"
        : action.toUpperCase() + "D";
      const lines = list.map((r) => {
        const suffix = artifactLabel && r.scaffolds.length > 0
          ? ` (${artifactLabel}: ${r.scaffolds.join(", ")})`
          : "";
        return `   - ${r.name}${suffix}`;
      });
      const hint = hints[action];
      push(
        `${label} ${verb} (${list.length}):\n` + lines.join("\n") +
          (hint ? "\n   " + hint : ""),
      );
    }
  }

  // Errors
  if (result.errors.length > 0) {
    const lines = result.errors.map((e) => `   - ${e.path}: ${e.error}`);
    push(`ERRORS (${result.errors.length}):\n` + lines.join("\n"));
  }

  // Render
  if (actions.length > 0) {
    console.log("\n>>> ACTIONS REQUIRED:\n");
    console.log(actions.join("\n\n"));
  }

  // No-action summary
  const noActionParts: string[] = [];
  for (const { label, items } of sections) {
    const okCount = items.filter((a) => a.action === "ok").length;
    if (okCount > 0) {
      noActionParts.push(`${okCount} ${label.toLowerCase()} unchanged`);
    }
  }

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
    if (sl.created.length > 0 || sl.updated.length > 0) {
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
    .command("sync", syncSubcommand)
    .command(
      "loop",
      new Command()
        .description(
          "Run Claude Code non-interactively with a prompt.",
        )
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
        }),
    )
    .command(
      "migrate",
      new Command()
        .description(
          "One-way migration of all primitives (skills, agents, commands) from one IDE to another.",
        )
        .arguments("<from:string> <to:string>")
        .option("-y, --yes", "Overwrite without prompt", { default: false })
        .option(
          "--dry-run",
          "Print what would be migrated without writing files",
          { default: false },
        )
        // deno-lint-ignore no-explicit-any
        .action(async (options: any, from: string, to: string) => {
          const migrateOpts: MigrateOptions = {
            yes: options.yes as boolean,
            dryRun: options.dryRun as boolean,
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
        }),
    )
    .command(
      "update",
      new Command()
        .description("Check for a newer flowai version and self-update.")
        // deno-lint-ignore no-explicit-any
        .action(async (_options: any) => {
          await runSelfUpdate();
        }),
    );

  await command.parse(args);
}
