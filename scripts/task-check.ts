import { runCommands } from "./utils.ts";
import type { CommandSpec } from "./utils.ts";

/**
 * Builds the list of commands to check project health (fmt, lint, test).
 */
export function buildCheckCommands(): CommandSpec[] {
  return [
    {
      cmd: "deno",
      args: ["fmt", "--check", "scripts", "deno.json"],
    },
    {
      cmd: "deno",
      args: ["lint", "scripts"],
    },
    {
      cmd: "deno",
      args: [
        "test",
        "-A",
        "--ignore=scripts/benchmarks/lib/integration.test.ts",
        "scripts",
      ],
    },
    {
      cmd: "deno",
      args: ["run", "-A", "scripts/check-skills.ts"],
    },
  ];
}

async function main(): Promise<void> {
  await runCommands(buildCheckCommands());
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    Deno.exit(1);
  }
}
