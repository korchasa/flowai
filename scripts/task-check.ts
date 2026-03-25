import { runCommands } from "./utils.ts";
import type { CommandSpec } from "./utils.ts";

/**
 * Builds the list of commands to check project health (fmt, lint, test).
 */
export function buildCheckCommands(): CommandSpec[] {
  return [
    // Bundle framework (generates cli/src/bundled.json + cli/src/_version.ts)
    {
      cmd: "deno",
      args: ["task", "bundle"],
    },
    // Format
    {
      cmd: "deno",
      args: [
        "fmt",
        "--check",
        "scripts",
        "cli/src",
        "cli/scripts",
        "deno.json",
      ],
    },
    // Lint
    {
      cmd: "deno",
      args: ["lint", "scripts", "cli/src", "cli/scripts"],
    },
    // Tests: root scripts
    {
      cmd: "deno",
      args: [
        "test",
        "-A",
        "--ignore=scripts/benchmarks/lib/integration.test.ts",
        "scripts",
      ],
    },
    // Tests: CLI
    {
      cmd: "deno",
      args: ["test", "-A", "cli/src"],
    },
    // Type-check CLI entry point (catches errors missed by tests but found by deno publish)
    {
      cmd: "deno",
      args: ["check", "cli/src/main.ts"],
    },
    // Skill/agent validation
    {
      cmd: "deno",
      args: ["run", "-A", "scripts/check-skills.ts"],
    },
    {
      cmd: "deno",
      args: ["run", "-A", "scripts/check-agents.ts"],
    },
    {
      cmd: "deno",
      args: ["run", "-A", "scripts/check-skill-sync.ts"],
    },
    {
      cmd: "deno",
      args: ["run", "-A", "scripts/check-pack-refs.ts"],
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
