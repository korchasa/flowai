import { runCommand } from "./utils.ts";
import type { CommandSpec } from "./utils.ts";

/**
 * Paths a whole-tree test run must skip: `runner_test.ts` spawns live agents
 * (run it by hand when its contract changes), and `scripts/benchmark/runs/`
 * holds gitignored SWE-rebench checkouts whose own tests are not ours.
 * `deno task check` uses the same list.
 */
export const SCRIPTS_TEST_IGNORE =
  "--ignore=scripts/acceptance-tests/lib/runner_test.ts,scripts/benchmark/runs";

/**
 * Builds the command to run tests, forwarding any additional arguments.
 */
export function buildTestCommand(args: string[]): CommandSpec {
  const baseArgs = ["test", "-A", "--coverage=./tmp/coverage"];
  if (args.length === 0) {
    baseArgs.push(SCRIPTS_TEST_IGNORE, "scripts");
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
