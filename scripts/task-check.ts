// [REF:fr:maint | FR-MAINT] — project maintenance via deno task check
import { shouldAutoInstall } from "./sync-plugins-local.ts";
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

type CheckPlanOptions = {
  syncPluginsLocal?: boolean;
};

/**
 * Builds the check plan: bundle first (prerequisite), then all checks in parallel.
 */
export function buildCheckPlan(options: CheckPlanOptions = {}): CheckPlan {
  // implements [REF:fr:dist.marketplace | FR-DIST.MARKETPLACE]
  // When the dogfood loop is engaged, the build step must bake the dogfood
  // marketplace name into the catalog up-front so the subsequent
  // `sync-plugins-local --no-build` re-uses a correctly-named dist. CI / casual
  // `deno task check` runs (no flag) keep emitting the upstream-default name.
  const buildPluginsArgs = ["run", "-A", "scripts/build-plugins.ts"];
  if (options.syncPluginsLocal === true) {
    buildPluginsArgs.push("--marketplace-name", "flowai-plugins-local");
  }

  const prerequisites: CommandSpec[] = [
    // implements [REF:fr:skill-compose | FR-SKILL-COMPOSE]
    // Generated SKILL.md files are gitignored build artefacts; the generator
    // runs as a prerequisite so every downstream consumer (fmt, lint, tests,
    // check-skills, check-pack-refs --leakage) sees up-to-date files. The
    // generator is idempotent: a no-op when sources haven't changed.
    {
      cmd: "deno",
      args: ["run", "-A", "scripts/generate-skill-composites.ts", "--write"],
    },
    // The plugin marketplace is a generated distribution surface and must stay
    // buildable before the rest of the project is considered healthy.
    {
      cmd: "deno",
      args: buildPluginsArgs,
    },
    {
      cmd: "deno",
      args: ["run", "-A", "scripts/validate-plugins.ts"],
    },
  ];

  // Optional dogfood loop: when AUTO_INSTALL_PLUGINS=true is set in env or
  // .env, install the freshly built local marketplace into Claude Code /
  // Codex at user scope. Off by default — most consumers of `deno task check`
  // (CI, contributors) do not want their installed plugins mutated.
  if (options.syncPluginsLocal === true) {
    prerequisites.push({
      cmd: "deno",
      args: ["run", "-A", "scripts/sync-plugins-local.ts", "--no-build"],
    });
  }

  return {
    prerequisites,
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
      // implements [REF:fr:skill-compose | FR-SKILL-COMPOSE]
      // bundle-leakage gate: builds framework.tar locally with the same
      // --exclude flags as CI, unpacks it, fails on any generator input
      // (framework/atoms, framework/composites, manifest, or legacy source)
      // leaking into user IDE configs.
      {
        cmd: "deno",
        args: ["run", "-A", "scripts/check-pack-refs.ts", "--leakage"],
      },
      {
        cmd: "deno",
        args: ["run", "-A", "scripts/check-naming-prefix.ts"],
      },
      {
        cmd: "deno",
        args: ["run", "-A", "scripts/check-traceability.ts"],
      },
      // [REF:fr:doc-anchors | FR-DOC-ANCHORS] — SALP validator. Phase 1
      // ships in permissive mode (no --enforce-no-legacy); later phases
      // tighten as surfaces migrate.
      {
        cmd: "deno",
        args: ["run", "-A", "scripts/check-salp.ts"],
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
  const plan = buildCheckPlan({
    syncPluginsLocal: await shouldAutoInstall(),
  });
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
