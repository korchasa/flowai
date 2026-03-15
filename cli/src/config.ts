import { parse, stringify } from "@std/yaml";
import { type FsAdapter, join } from "./adapters/fs.ts";
import { DEFAULT_VERSION, type FlowConfig } from "./types.ts";

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

  return { version, ides, skills, agents };
}

/** Save FlowConfig to .flowai.yaml */
export async function saveConfig(
  cwd: string,
  config: FlowConfig,
  fs: FsAdapter,
): Promise<void> {
  const configPath = join(cwd, CONFIG_FILENAME);
  const yaml = stringify({
    version: config.version,
    ides: config.ides,
    skills: config.skills,
    agents: config.agents,
  });
  await fs.writeFile(configPath, yaml);
}
