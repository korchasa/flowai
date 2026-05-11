/**
 * Benchmark scenario discovery + filter/override helpers.
 * Walks `framework/<pack>/{skills,commands,agents,benchmarks}/.../mod.ts`.
 */
import { dirname, join } from "@std/path";
import { existsSync, walk } from "@std/fs";
import type { BenchmarkScenario } from "./types.ts";

/**
 * Imports benchmark scenario modules from a directory tree.
 * Looks for mod.ts files inside acceptance-tests/ subdirectories.
 */
async function importScenariosFromDir(
  dir: string,
  packName: string,
  scenarios: BenchmarkScenario[],
): Promise<void> {
  if (!existsSync(dir)) return;

  for await (
    const entry of walk(dir, {
      maxDepth: 10,
      includeFiles: true,
      match: [/mod\.ts$/],
    })
  ) {
    if (
      !entry.path.includes("/acceptance-tests/") ||
      entry.path.includes("/fixture/")
    ) {
      continue;
    }
    try {
      const module = await import(`file://${entry.path}`);
      for (const exportName in module) {
        const value = module[exportName];
        if (
          value && typeof value === "object" && "id" in value &&
          "userQuery" in value
        ) {
          const scenario = value as BenchmarkScenario;
          if (!scenario.fixturePath) {
            scenario.fixturePath = join(dirname(entry.path), "fixture");
          }
          scenario.pack = packName;
          scenarios.push(scenario);
        }
      }
    } catch (e) {
      console.warn(
        `  Warning: Failed to import scenario from ${entry.path}: ${e}`,
      );
    }
  }
}

/**
 * Walks `framework/<pack>/skills/`, `framework/<pack>/commands/`,
 * `framework/<pack>/agents/`, and `framework/<pack>/acceptance-tests/` for
 * benchmark scenario mod.ts files.
 */
export async function discoverScenarios(): Promise<BenchmarkScenario[]> {
  const scenarios: BenchmarkScenario[] = [];
  const frameworkDir = join(Deno.cwd(), "framework");

  if (!existsSync(frameworkDir)) {
    return scenarios;
  }

  for await (const packEntry of Deno.readDir(frameworkDir)) {
    if (!packEntry.isDirectory) continue;

    // framework/<pack>/{skills,commands,agents,benchmarks}/<name>/acceptance-tests/*/mod.ts
    await importScenariosFromDir(
      join(frameworkDir, packEntry.name, "skills"),
      packEntry.name,
      scenarios,
    );
    await importScenariosFromDir(
      join(frameworkDir, packEntry.name, "commands"),
      packEntry.name,
      scenarios,
    );
    await importScenariosFromDir(
      join(frameworkDir, packEntry.name, "agents"),
      packEntry.name,
      scenarios,
    );
    await importScenariosFromDir(
      join(frameworkDir, packEntry.name, "acceptance-tests"),
      packEntry.name,
      scenarios,
    );
  }

  return scenarios;
}

/** Apply --filter and --skill-override to the discovered scenario set. */
export function selectScenarios(
  allScenarios: BenchmarkScenario[],
  filter: string | undefined,
  skillOverride: string | undefined,
): BenchmarkScenario[] {
  let scenariosToRun = filter
    ? allScenarios.filter((s) => s.id.includes(String(filter)))
    : allScenarios;

  // Apply skill override: repoint filtered scenarios to a different skill.
  // Useful for A/B testing (e.g., run flowai-commit acceptance tests against flowai-commit-beta).
  if (skillOverride) {
    scenariosToRun = scenariosToRun
      .filter((s) => s.skill) // only skill-based scenarios
      .map((s) => {
        const originalSkill = s.skill!;
        // Shallow-clone to avoid mutating the original scenario object
        const clone = Object.create(
          Object.getPrototypeOf(s),
          Object.getOwnPropertyDescriptors(s),
        ) as typeof s;
        clone.skill = skillOverride;
        clone.id = s.id.replace(originalSkill, skillOverride);
        clone.userQuery = s.userQuery.replace(
          `/${originalSkill}`,
          `/${skillOverride}`,
        );
        return clone;
      });
    console.log(
      `Skill override: ${
        scenariosToRun[0]?.skill ?? "?"
      } (original skill replaced in ${scenariosToRun.length} scenarios)`,
    );
  }
  return scenariosToRun;
}
