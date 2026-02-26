import { runCommand, runCommandsInParallel } from "./utils.ts";
import type { CommandSpec } from "./utils.ts";

/**
 * Builds the list of commands for development (watch mode for fmt and lint).
 */
export function buildDevCommands(): CommandSpec[] {
  return [
    {
      cmd: "deno",
      args: ["fmt", "--watch", "scripts", "deno.json"],
    },
    {
      cmd: "deno",
      args: ["lint", "--watch", "scripts"],
    },
  ];
}

async function main(): Promise<void> {
  // Ensure .dev/ symlinks are in place before starting dev mode
  await runCommand({ cmd: "deno", args: ["task", "link"] });
  await runCommandsInParallel(buildDevCommands());
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    Deno.exit(1);
  }
}
