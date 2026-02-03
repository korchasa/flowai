import { runCommand } from "./utils.ts";
import type { CommandSpec } from "./utils.ts";

/**
 * Builds the command to run tests, forwarding any additional arguments.
 */
export function buildTestCommand(args: string[]): CommandSpec {
  const baseArgs = ["test", "-A", "--coverage=./tmp/coverage"];
  if (args.length === 0) {
    baseArgs.push("scripts");
  } else {
    baseArgs.push(...args);
  }

  return {
    cmd: "deno",
    args: baseArgs,
  };
}

async function main(): Promise<void> {
  await runCommand(buildTestCommand(Deno.args));
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    Deno.exit(1);
  }
}
