// FR-DIST.SYNC — resource file readers
/** Read skill/command/agent/hook/script/asset files from framework source */
import { extractPackAssetPaths, type FrameworkSource } from "./source.ts";
import { transformAgent, transformSkillModel } from "./transform.ts";
import type { HookDefinition, PackDefinition, UpstreamFile } from "./types.ts";
import { parse as parseYaml } from "@std/yaml";

/** Check if a path is dev-only (benchmarks or test files) and should not be distributed */
export function isDevOnlyPath(path: string): boolean {
  if (/\/benchmarks\//.test(path)) return true;
  if (/_test\.\w+$/.test(path)) return true;
  return false;
}

/**
 * Inject `disable-model-invocation: true` as the last key of the SKILL.md
 * frontmatter block. Directory placement under `commands/` is the single
 * source of truth for the user-only nature of a framework command; the flag
 * is added here so the installed file still carries the IDE signal without
 * authors needing to remember it.
 *
 * Idempotent — if the key is already present (any value), the content is
 * returned unchanged. Preserves CRLF line endings if the input uses them.
 *
 * Throws if the content has no leading frontmatter block — commands MUST
 * have a SKILL.md frontmatter; missing frontmatter is a validator failure
 * and should be surfaced at read time, not silently tolerated.
 */
export function injectDisableModelInvocation(content: string): string {
  // Detect line ending from the frontmatter region (first ~200 chars).
  const head = content.slice(0, 200);
  const crlf = /\r\n/.test(head);
  const eol = crlf ? "\r\n" : "\n";

  // Match opening `---` and closing `---` of the frontmatter block.
  // [\s\S] to cross lines; non-greedy to stop at the first closing marker.
  const fmRe = /^---\r?\n([\s\S]*?)\r?\n---/;
  const match = content.match(fmRe);
  if (!match) {
    throw new Error(
      "injectDisableModelInvocation: content has no frontmatter block",
    );
  }

  const fmBody = match[1];
  // Idempotent: if key already present (in any form), return unchanged.
  if (/^\s*disable-model-invocation\s*:/m.test(fmBody)) {
    return content;
  }

  const newFmBody = fmBody + eol + "disable-model-invocation: true";
  const newFrontmatter = `---${eol}${newFmBody}${eol}---`;
  return content.replace(fmRe, newFrontmatter);
}

/** Read skill files from legacy flat framework/skills/ */
export async function readSkillFiles(
  skillNames: string[],
  allPaths: string[],
  source: FrameworkSource,
  ideName?: string,
  modelMap?: Record<string, string>,
): Promise<UpstreamFile[]> {
  const files: UpstreamFile[] = [];
  for (const name of skillNames) {
    const prefix = `framework/skills/${name}/`;
    const paths = allPaths.filter((p) =>
      p.startsWith(prefix) && !isDevOnlyPath(p)
    );
    for (const path of paths) {
      let content = await source.readFile(path);
      // Transform model tier in SKILL.md files
      if (ideName && path.endsWith("/SKILL.md")) {
        content = transformSkillModel(content, ideName, modelMap);
      }
      const relativePath = path.substring("framework/skills/".length);
      files.push({ path: relativePath, content });
    }
  }
  return files;
}

/** Read skill files from pack structure framework/<pack>/skills/ */
export async function readPackSkillFiles(
  skillNames: string[],
  allPaths: string[],
  source: FrameworkSource,
  ideName?: string,
  modelMap?: Record<string, string>,
): Promise<UpstreamFile[]> {
  const files: UpstreamFile[] = [];
  const nameSet = new Set(skillNames);

  // Find all pack skill paths matching requested names (exclude dev-only files)
  const packSkillRegex = /^framework\/[^/]+\/skills\/([^/]+)\//;
  for (const path of allPaths) {
    const match = path.match(packSkillRegex);
    if (match && nameSet.has(match[1]) && !isDevOnlyPath(path)) {
      let content = await source.readFile(path);
      // Transform model tier in SKILL.md files
      if (ideName && path.endsWith("/SKILL.md")) {
        content = transformSkillModel(content, ideName, modelMap);
      }
      // Extract relative path: strip framework/<pack>/skills/ → <name>/...
      const skillName = match[1];
      const prefixEnd = path.indexOf(`/skills/${skillName}/`) +
        "/skills/".length;
      const relativePath = path.substring(prefixEnd);
      files.push({ path: relativePath, content });
    }
  }
  return files;
}

/** Read command files from legacy flat framework/commands/. Symmetric with
 * `readSkillFiles` but injects `disable-model-invocation: true` into SKILL.md. */
export async function readCommandFiles(
  commandNames: string[],
  allPaths: string[],
  source: FrameworkSource,
  ideName?: string,
  modelMap?: Record<string, string>,
): Promise<UpstreamFile[]> {
  const files: UpstreamFile[] = [];
  for (const name of commandNames) {
    const prefix = `framework/commands/${name}/`;
    const paths = allPaths.filter((p) =>
      p.startsWith(prefix) && !isDevOnlyPath(p)
    );
    for (const path of paths) {
      let content = await source.readFile(path);
      if (path.endsWith("/SKILL.md")) {
        if (ideName) {
          content = transformSkillModel(content, ideName, modelMap);
        }
        content = injectDisableModelInvocation(content);
      }
      const relativePath = path.substring("framework/commands/".length);
      files.push({ path: relativePath, content });
    }
  }
  return files;
}

/** Read command files from pack structure framework/<pack>/commands/.
 * Commands install into `.{ide}/skills/` alongside skills; the directory
 * `commands/` is the framework-level classifier, and the writer injects
 * `disable-model-invocation: true` into each command's SKILL.md at sync time. */
export async function readPackCommandFiles(
  commandNames: string[],
  allPaths: string[],
  source: FrameworkSource,
  ideName?: string,
  modelMap?: Record<string, string>,
): Promise<UpstreamFile[]> {
  const files: UpstreamFile[] = [];
  const nameSet = new Set(commandNames);

  const packCommandRegex = /^framework\/[^/]+\/commands\/([^/]+)\//;
  for (const path of allPaths) {
    const match = path.match(packCommandRegex);
    if (match && nameSet.has(match[1]) && !isDevOnlyPath(path)) {
      let content = await source.readFile(path);
      if (path.endsWith("/SKILL.md")) {
        if (ideName) {
          content = transformSkillModel(content, ideName, modelMap);
        }
        content = injectDisableModelInvocation(content);
      }
      const commandName = match[1];
      const prefixEnd = path.indexOf(`/commands/${commandName}/`) +
        "/commands/".length;
      const relativePath = path.substring(prefixEnd);
      files.push({ path: relativePath, content });
    }
  }
  return files;
}

/** Read agent files from legacy flat framework/agents/ and transform for target IDE */
export async function readAgentFiles(
  agentNames: string[],
  ideName: string,
  allPaths: string[],
  source: FrameworkSource,
  modelMap?: Record<string, string>,
): Promise<UpstreamFile[]> {
  const files: UpstreamFile[] = [];
  for (const name of agentNames) {
    const agentPath = `framework/agents/${name}.md`;
    if (allPaths.includes(agentPath)) {
      const raw = await source.readFile(agentPath);
      const content = transformAgent(raw, ideName, modelMap);
      files.push({ path: `${name}.md`, content });
    }
  }
  return files;
}

/** Read agent files from pack structure framework/<pack>/agents/ */
export async function readPackAgentFiles(
  agentNames: string[],
  ideName: string,
  allPaths: string[],
  source: FrameworkSource,
  modelMap?: Record<string, string>,
): Promise<UpstreamFile[]> {
  const files: UpstreamFile[] = [];
  const nameSet = new Set(agentNames);

  const packAgentRegex = /^framework\/[^/]+\/agents\/([^/]+)\.md$/;
  for (const path of allPaths) {
    const match = path.match(packAgentRegex);
    if (match && nameSet.has(match[1])) {
      const raw = await source.readFile(path);
      const content = transformAgent(raw, ideName, modelMap);
      files.push({ path: `${match[1]}.md`, content });
    }
  }
  return files;
}

/** Read hook files from pack structure framework/<pack>/hooks/<name>/ */
export async function readPackHookFiles(
  hookNames: string[],
  allPaths: string[],
  source: FrameworkSource,
): Promise<UpstreamFile[]> {
  const files: UpstreamFile[] = [];
  const nameSet = new Set(hookNames);

  const packHookRegex = /^framework\/[^/]+\/hooks\/([^/]+)\/(.+)$/;
  for (const path of allPaths) {
    const match = path.match(packHookRegex);
    if (match && nameSet.has(match[1])) {
      const content = await source.readFile(path);
      // Install as <hook-name>/<filename> (e.g., lint-on-edit/run.ts)
      files.push({ path: `${match[1]}/${match[2]}`, content });
    }
  }
  return files;
}

/** Read script files from pack structure framework/<pack>/scripts/<name> */
export async function readPackScriptFiles(
  scriptNames: string[],
  allPaths: string[],
  source: FrameworkSource,
): Promise<UpstreamFile[]> {
  const files: UpstreamFile[] = [];
  const nameSet = new Set(scriptNames);

  const packScriptRegex = /^framework\/[^/]+\/scripts\/([^/]+)$/;
  for (const path of allPaths) {
    const match = path.match(packScriptRegex);
    if (match && nameSet.has(match[1])) {
      const content = await source.readFile(path);
      files.push({ path: match[1], content });
    }
  }
  return files;
}

/** Read asset files from pack structure framework/<pack>/assets/.
 * Currently only core pack has shared assets (AGENTS.md templates). */
// FR-DIST.SYNC
export async function readPackAssetFiles(
  allPaths: string[],
  source: FrameworkSource,
  selectedPacks: string[],
): Promise<UpstreamFile[]> {
  const files: UpstreamFile[] = [];

  for (const pack of selectedPacks) {
    const assetPaths = extractPackAssetPaths(allPaths, pack);
    for (const path of assetPaths) {
      const content = await source.readFile(path);
      // Strip framework/<pack>/assets/ → assets/<filename>
      const prefix = `framework/${pack}/assets/`;
      const relativePath = "assets/" + path.substring(prefix.length);
      files.push({ path: relativePath, content });
    }
  }

  return files;
}

/** Read pack.yaml definitions (with scaffolds) from bundle */
export async function readPackDefinitions(
  allPaths: string[],
  source: FrameworkSource,
): Promise<PackDefinition[]> {
  const packYamls = allPaths.filter((p) =>
    /^framework\/[^/]+\/pack\.yaml$/.test(p)
  );
  const packs: PackDefinition[] = [];
  for (const path of packYamls) {
    const content = await source.readFile(path);
    const data = parseYaml(content) as Record<string, unknown>;

    // Parse scaffolds: Record<string, string[]>
    let scaffolds: Record<string, string[]> | undefined;
    if (data.scaffolds && typeof data.scaffolds === "object") {
      scaffolds = {};
      for (
        const [skill, paths] of Object.entries(
          data.scaffolds as Record<string, unknown>,
        )
      ) {
        if (Array.isArray(paths)) {
          scaffolds[skill] = paths.map(String);
        }
      }
    }

    // Parse assets: Record<string, string>
    let assets: Record<string, string> | undefined;
    if (data.assets && typeof data.assets === "object") {
      assets = {};
      for (
        const [template, artifactPath] of Object.entries(
          data.assets as Record<string, unknown>,
        )
      ) {
        assets[template] = String(artifactPath);
      }
    }

    packs.push({
      name: String(data.name ?? ""),
      version: String(data.version ?? "0.0.0"),
      description: String(data.description ?? ""),
      scaffolds,
      assets,
    });
  }
  return packs.sort((a, b) => a.name.localeCompare(b.name));
}

/** Read hook.yaml definitions for all hook names from source */
export async function readHookDefinitions(
  hookNames: string[],
  allPaths: string[],
  source: FrameworkSource,
): Promise<Array<{ name: string; hook: HookDefinition }>> {
  const defs: Array<{ name: string; hook: HookDefinition }> = [];
  const hookYamlRegex = /^framework\/[^/]+\/hooks\/([^/]+)\/hook\.yaml$/;

  for (const path of allPaths) {
    const match = path.match(hookYamlRegex);
    if (match && hookNames.includes(match[1])) {
      const content = await source.readFile(path);
      const data = parseYaml(content) as Record<string, unknown>;
      defs.push({
        name: match[1],
        hook: {
          event: String(data.event ?? ""),
          matcher: data.matcher ? String(data.matcher) : undefined,
          description: String(data.description ?? ""),
          timeout: data.timeout ? Number(data.timeout) : undefined,
        },
      });
    }
  }
  return defs;
}
