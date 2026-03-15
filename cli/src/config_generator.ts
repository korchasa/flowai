/** Interactive config generation — prompts user for IDEs, skills/agents, writes .flow.yaml */
import { Checkbox, Confirm } from "@cliffy/prompt";
import type { FsAdapter } from "./adapters/fs.ts";
import { saveConfig } from "./config.ts";
import { detectIDEs } from "./ide.ts";
import {
  BundledSource,
  extractAgentNames,
  extractSkillNames,
  type FrameworkSource,
} from "./source.ts";
import { DEFAULT_VERSION, type FlowConfig, KNOWN_IDES } from "./types.ts";

/** Interactive config generation when .flow.yaml is missing */
export async function generateConfig(
  cwd: string,
  fs: FsAdapter,
  sourceOverride?: FrameworkSource,
): Promise<FlowConfig> {
  console.log("No .flow.yaml found. Let's create one.\n");

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

  // Read available skills/agents from bundled source
  let availableSkills: string[] = [];
  let availableAgents: string[] = [];

  const fwSource = sourceOverride ?? await BundledSource.load();
  try {
    console.log("\nReading available skills and agents...");
    const allPaths = await fwSource.listFiles("framework/");
    availableSkills = extractSkillNames(allPaths);
    availableAgents = extractAgentNames(allPaths);
  } catch (e) {
    console.warn(
      `Warning: Could not read framework: ${(e as Error).message}`,
    );
    console.warn("Proceeding with empty skill/agent lists.\n");
  } finally {
    if (!sourceOverride) {
      await fwSource.dispose();
    }
  }

  let skillsInclude: string[] = [];
  const skillsExclude: string[] = [];

  if (availableSkills.length > 0) {
    const syncAllSkills = await Confirm.prompt({
      message: `Sync all ${availableSkills.length} skills?`,
      default: true,
    });

    if (!syncAllSkills) {
      skillsInclude = await Checkbox.prompt({
        message: "Select skills to include",
        options: availableSkills,
      });
    }
  }

  let agentsInclude: string[] = [];
  const agentsExclude: string[] = [];

  if (availableAgents.length > 0) {
    const syncAllAgents = await Confirm.prompt({
      message: `Sync all ${availableAgents.length} agents?`,
      default: true,
    });

    if (!syncAllAgents) {
      agentsInclude = await Checkbox.prompt({
        message: "Select agents to include",
        options: availableAgents,
      });
    }
  }

  const config: FlowConfig = {
    version: DEFAULT_VERSION,
    ides: selectedIDEs,
    skills: { include: skillsInclude, exclude: skillsExclude },
    agents: { include: agentsInclude, exclude: agentsExclude },
  };

  await saveConfig(cwd, config, fs);
  console.log("\n.flow.yaml created successfully.\n");

  return config;
}
