import { parse, stringify } from "@std/yaml";
import { type FsAdapter, join } from "./adapters/fs.ts";
import { DEFAULT_VERSION, type FlowConfig, PACKS_VERSION } from "./types.ts";

const CONFIG_FILENAME = ".flowai.yaml";

/** Load and parse .flowai.yaml from cwd. Returns null if not found. */
export async function loadConfig(
  cwd: string,
  fs: FsAdapter,
): Promise<FlowConfig | null> {
  const configPath = join(cwd, CONFIG_FILENAME);
  if (!(await fs.exists(configPath))) {
    return null;
  }

  const raw = await fs.readFile(configPath);
  const data = parse(raw) as Record<string, unknown>;

  return parseConfigData(data);
}

/** Parse raw YAML data into FlowConfig with validation */
export function parseConfigData(data: Record<string, unknown>): FlowConfig {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid .flowai.yaml: expected object");
  }

  const version = String(data.version ?? DEFAULT_VERSION);

  const ides = Array.isArray(data.ides) ? data.ides.map(String) : [];

  const skillsRaw = (data.skills ?? {}) as Record<string, unknown>;
  const agentsRaw = (data.agents ?? {}) as Record<string, unknown>;
  const commandsRaw = (data.commands ?? {}) as Record<string, unknown>;

  const skills = {
    include: Array.isArray(skillsRaw.include)
      ? skillsRaw.include.map(String)
      : [],
    exclude: Array.isArray(skillsRaw.exclude)
      ? skillsRaw.exclude.map(String)
      : [],
  };

  const agents = {
    include: Array.isArray(agentsRaw.include)
      ? agentsRaw.include.map(String)
      : [],
    exclude: Array.isArray(agentsRaw.exclude)
      ? agentsRaw.exclude.map(String)
      : [],
  };

  const commands = {
    include: Array.isArray(commandsRaw.include)
      ? commandsRaw.include.map(String)
      : [],
    exclude: Array.isArray(commandsRaw.exclude)
      ? commandsRaw.exclude.map(String)
      : [],
  };

  // Include + exclude mutually exclusive
  if (skills.include.length > 0 && skills.exclude.length > 0) {
    throw new Error(
      "Invalid .flowai.yaml: skills.include and skills.exclude are mutually exclusive",
    );
  }
  if (agents.include.length > 0 && agents.exclude.length > 0) {
    throw new Error(
      "Invalid .flowai.yaml: agents.include and agents.exclude are mutually exclusive",
    );
  }
  if (commands.include.length > 0 && commands.exclude.length > 0) {
    throw new Error(
      "Invalid .flowai.yaml: commands.include and commands.exclude are mutually exclusive",
    );
  }

  const userSync = data.user_sync === true;

  // Parse packs (v1.1+). undefined = legacy mode (all resources).
  const packs = Array.isArray(data.packs) ? data.packs.map(String) : undefined;

  // Parse models (optional): Record<string, Record<string, string>>
  let models: Record<string, Record<string, string>> | undefined;
  if (
    data.models && typeof data.models === "object" &&
    !Array.isArray(data.models)
  ) {
    models = {};
    for (
      const [ide, mapping] of Object.entries(
        data.models as Record<string, unknown>,
      )
    ) {
      if (mapping && typeof mapping === "object" && !Array.isArray(mapping)) {
        models[ide] = {};
        for (
          const [tier, model] of Object.entries(
            mapping as Record<string, unknown>,
          )
        ) {
          models[ide][tier] = String(model);
        }
      }
    }
  }

  // Parse sessionDocs (optional string array)
  const sessionDocs = Array.isArray(data.sessionDocs)
    ? data.sessionDocs.filter((d): d is string => typeof d === "string")
    : undefined;

  return {
    version,
    ides,
    packs,
    skills,
    agents,
    commands,
    userSync,
    models,
    sessionDocs,
  };
}

/** Migrate v1 config to v1.1 by adding packs: (all available packs) */
export function migrateV1ToV1_1(
  config: FlowConfig,
  availablePackNames: string[],
): FlowConfig {
  if (config.packs !== undefined) return config; // already v1.1+
  return {
    ...config,
    version: PACKS_VERSION,
    packs: [...availablePackNames],
  };
}

/** Save FlowConfig to .flowai.yaml */
export async function saveConfig(
  cwd: string,
  config: FlowConfig,
  fs: FsAdapter,
): Promise<void> {
  const configPath = join(cwd, CONFIG_FILENAME);
  const data: Record<string, unknown> = {
    version: config.version,
    ides: config.ides,
  };
  if (config.packs !== undefined) {
    data.packs = config.packs;
  }
  data.skills = config.skills;
  data.agents = config.agents;
  data.commands = config.commands;
  if (config.userSync) {
    data.user_sync = config.userSync;
  }
  if (config.models && Object.keys(config.models).length > 0) {
    data.models = config.models;
  }
  if (config.sessionDocs && config.sessionDocs.length > 0) {
    data.sessionDocs = config.sessionDocs;
  }
  const yaml = stringify(data);
  await fs.writeFile(configPath, yaml);
}
