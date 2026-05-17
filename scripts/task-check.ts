// [FR-MAINT](../documents/requirements.md#fr-maint-project-maintenance) — project maintenance via deno task check
import { runCommands, runCommandsInParallelBuffered } from "./utils.ts";
import type { CommandSpec } from "./utils.ts";

/**
 * A phased check plan: prerequisites run sequentially first,
 * then parallel checks run concurrently with buffered output.
 */
export type CheckPlan = {
  prerequisites: CommandSpec[];
  parallel: CommandSpec[];
};

/**
 * Builds the check plan: bundle first (prerequisite), then all checks in parallel.
 */
export function buildCheckPlan(): CheckPlan {
  return {
    prerequisites: [],
    parallel: [
      // Format
      {
        cmd: "deno",
        args: [
          "fmt",
          "--check",
          "scripts",
          "framework",
          "deno.json",
        ],
      },
      // Lint: project code (strict)
      {
        cmd: "deno",
        args: ["lint", "scripts"],
      },
      // Lint: framework (relaxed — scripts use jsr: specifiers for standalone-runnable)
      {
        cmd: "deno",
        args: [
          "lint",
          "--rules-exclude=no-import-prefix,no-unversioned-import",
          "framework",
        ],
      },
      // Tests: root scripts
      {
        cmd: "deno",
        args: [
          "test",
          "-A",
          "--ignore=scripts/acceptance-tests/lib/integration_test.ts",
          "scripts",
        ],
      },
      // Tests: framework hooks and scripts
      {
        cmd: "deno",
        args: [
          "test",
          "-A",
          "--ignore=framework/*/skills/*/acceptance-tests,framework/*/commands/*/acceptance-tests,framework/*/agents/*/acceptance-tests,framework/*/acceptance-tests/*/fixture",
          "framework",
        ],
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
        args: ["run", "-A", "scripts/check-pack-refs.ts"],
      },
      // implements [FR-SKILL-COMPOSE](../documents/requirements.md#fr-skill-compose-generated-composite-skill-assembly)
      // bundle-leakage gate: builds framework.tar locally with the same
      // --exclude flags as CI, unpacks it, fails on any _atom.md /
      // _composite.md / composites.yaml leak into user IDE configs.
      {
        cmd: "deno",
        args: ["run", "-A", "scripts/check-pack-refs.ts", "--leakage"],
      },
      // implements [FR-SKILL-COMPOSE](../documents/requirements.md#fr-skill-compose-generated-composite-skill-assembly)
      // composite-skill regeneration drift gate. Re-runs the generator in
      // --check mode; fails with a per-file unified diff + --write hint if
      // any SKILL.md diverges from its atom + composite manifest source.
      {
        cmd: "deno",
        args: ["run", "-A", "scripts/generate-skill-composites.ts", "--check"],
      },
      {
        cmd: "deno",
        args: ["run", "-A", "scripts/check-naming-prefix.ts"],
      },
      {
        cmd: "deno",
        args: ["run", "-A", "scripts/check-traceability.ts"],
      },
      {
        cmd: "deno",
        args: ["run", "-A", "scripts/check-srs-evidence.ts"],
      },
      {
        cmd: "deno",
        args: ["run", "-A", "scripts/check-trigger-coverage.ts"],
      },
      {
        cmd: "deno",
        args: ["run", "-A", "scripts/check-task-format.ts"],
      },
    ],
  };
}

async function main(): Promise<void> {
  const plan = buildCheckPlan();
  await runCommands(plan.prerequisites);
  await runCommandsInParallelBuffered(plan.parallel);
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    Deno.exit(1);
  }
}
