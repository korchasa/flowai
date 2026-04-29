// [FR-DIST.CONFIG](../../documents/requirements.md#fr-dist.config-config-generation) — interactive/non-interactive config generation
// [FR-PACKS.DEFAULTS](../../documents/requirements.md#fr-packs.defaults-default-packs) — default pack selection
/** Config generation — interactive and non-interactive modes */
import { Checkbox, Confirm } from "@cliffy/prompt";
import type { FsAdapter } from "./adapters/fs.ts";
import { saveConfig } from "./config.ts";
import { detectIDEs } from "./ide.ts";
import {
  BundledSource,
  extractPackNames,
  type FrameworkSource,
} from "./source.ts";
import { type FlowConfig, KNOWN_IDES, PACKS_VERSION } from "./types.ts";

/** Non-interactive config generation: auto-detect IDEs, select all packs.
 * `scope`/`home` route the written config to `<cwd>/.flowai.yaml` (project)
 * or `<home>/.flowai.yaml` (global). In global mode no IDE auto-detection
 * by directory presence is possible — defaults to all KNOWN_IDES. */
export async function generateConfigNonInteractive(
  cwd: string,
  fs: FsAdapter,
  sourceOverride?: FrameworkSource,
  scope: "project" | "global" = "project",
  home = "",
): Promise<FlowConfig> {
  console.log(
    "No .flowai.yaml found. Generating with defaults (non-interactive).\n",
  );

  const detectedNames = scope === "global"
    ? Object.keys(KNOWN_IDES)
    : (await detectIDEs(cwd, fs)).map((i) => i.name);

  const fwSource = sourceOverride ?? await BundledSource.load();
  let availablePacks: string[] = [];
  try {
    const allPaths = await fwSource.listFiles("framework/");
    availablePacks = extractPackNames(allPaths);
  } catch (e) {
    console.warn(
      `Warning: Could not read framework: ${(e as Error).message}`,
    );
  } finally {
    if (!sourceOverride) {
      await fwSource.dispose();
    }
  }

  const config: FlowConfig = {
    version: PACKS_VERSION,
    ides: detectedNames,
    packs: availablePacks,
    skills: { include: [], exclude: [] },
    agents: { include: [], exclude: [] },
    commands: { include: [], exclude: [] },
  };

  await saveConfig(cwd, config, fs, scope, home);
  console.log(".flowai.yaml created successfully.\n");

  return config;
}

/** Interactive config generation when .flowai.yaml is missing */
export async function generateConfig(
  cwd: string,
  fs: FsAdapter,
  sourceOverride?: FrameworkSource,
  scope: "project" | "global" = "project",
  home = "",
): Promise<FlowConfig> {
  console.log("No .flowai.yaml found. Let's create one.\n");

  // Auto-detect IDEs (project only; global mode defaults to all)
  const detectedNames = scope === "global"
    ? Object.keys(KNOWN_IDES)
    : (await detectIDEs(cwd, fs)).map((i) => i.name);
  const allIdeNames = Object.keys(KNOWN_IDES);

  const selectedIDEs = await Checkbox.prompt({
    message: "Target IDEs",
    options: allIdeNames.map((name) => ({
      name,
      value: name,
      checked: detectedNames.includes(name),
    })),
  });

  // Read available packs from bundled source
  let availablePacks: string[] = [];

  const fwSource = sourceOverride ?? await BundledSource.load();
  try {
    console.log("\nReading available packs...");
    const allPaths = await fwSource.listFiles("framework/");
    availablePacks = extractPackNames(allPaths);
  } catch (e) {
    console.warn(
      `Warning: Could not read framework: ${(e as Error).message}`,
    );
    console.warn("Proceeding with empty pack list.\n");
  } finally {
    if (!sourceOverride) {
      await fwSource.dispose();
    }
  }

  // Default: all packs selected
  let selectedPacks = [...availablePacks];

  if (availablePacks.length > 0) {
    const syncAllPacks = await Confirm.prompt({
      message: `Install all ${availablePacks.length} packs? (${
        availablePacks.join(", ")
      })`,
      default: true,
    });

    if (!syncAllPacks) {
      selectedPacks = await Checkbox.prompt({
        message: "Select packs to install",
        options: availablePacks.map((name) => ({
          name,
          value: name,
          checked: name === "core", // core always pre-selected
        })),
      });
    }
  }

  const config: FlowConfig = {
    version: PACKS_VERSION,
    ides: selectedIDEs,
    packs: selectedPacks,
    skills: { include: [], exclude: [] },
    agents: { include: [], exclude: [] },
    commands: { include: [], exclude: [] },
  };

  await saveConfig(cwd, config, fs, scope, home);
  console.log("\n.flowai.yaml created successfully.\n");

  return config;
}
