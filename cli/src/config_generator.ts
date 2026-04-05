// FR-DIST.CONFIG — interactive/non-interactive config generation
// FR-PACKS.DEFAULTS — default pack selection
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

/** Non-interactive config generation: auto-detect IDEs, select all packs */
export async function generateConfigNonInteractive(
  cwd: string,
  fs: FsAdapter,
  sourceOverride?: FrameworkSource,
): Promise<FlowConfig> {
  console.log(
    "No .flowai.yaml found. Generating with defaults (non-interactive).\n",
  );

  const detectedIDEs = await detectIDEs(cwd, fs);
  const detectedNames = detectedIDEs.map((i) => i.name);

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

  await saveConfig(cwd, config, fs);
  console.log(".flowai.yaml created successfully.\n");

  return config;
}

/** Interactive config generation when .flowai.yaml is missing */
export async function generateConfig(
  cwd: string,
  fs: FsAdapter,
  sourceOverride?: FrameworkSource,
): Promise<FlowConfig> {
  console.log("No .flowai.yaml found. Let's create one.\n");

  // Auto-detect IDEs
  const detectedIDEs = await detectIDEs(cwd, fs);
  const detectedNames = detectedIDEs.map((i) => i.name);
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

  await saveConfig(cwd, config, fs);
  console.log("\n.flowai.yaml created successfully.\n");

  return config;
}
