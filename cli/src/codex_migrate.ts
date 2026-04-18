// FR-DIST.MIGRATE — Codex-specific agent migration
/** Scan Codex agents from config.toml sidecars and migrate agents to Codex format */
import { type FsAdapter, join } from "./adapters/fs.ts";
import { crossTransformAgent, DEFAULT_MODEL_MAPS } from "./transform.ts";
import { resolveIdeBaseDir, type SyncScope } from "./scope.ts";
import type { IDE } from "./types.ts";
import type { SyncResult } from "./sync.ts";
import type { ScannedResource } from "./migrate.ts";
import { parse as parseToml } from "@std/toml";
import {
  buildCodexAgentSidecar,
  type CodexAgentChange,
  mergeCodexConfig,
  readCodexManifest,
  writeCodexManifest,
} from "./toml_merge.ts";

/**
 * Scan Codex config.toml for `[agents.<name>]` blocks and reconstruct each as
 * a synthetic universal markdown ScannedResource (so downstream migration can
 * route them through the standard frontmatter transform path).
 *
 * The synthetic markdown uses `name`/`description` from the TOML + the sidecar
 * `.codex/agents/<name>.toml` file's `developer_instructions` as the body.
 * When a sidecar is missing or unreadable, the agent is skipped with a warning.
 */
export async function scanCodexAgents(
  cwd: string,
  fromIde: IDE,
  fs: FsAdapter,
  scope: SyncScope = "project",
  home: string = "",
): Promise<ScannedResource[]> {
  const base = resolveIdeBaseDir(fromIde.name, scope, cwd, home, "default");
  const configPath = join(base, "config.toml");
  if (!(await fs.exists(configPath))) return [];
  let parsed: Record<string, unknown>;
  try {
    parsed = parseToml(await fs.readFile(configPath)) as Record<
      string,
      unknown
    >;
  } catch {
    return [];
  }
  const agentsRaw = parsed.agents;
  if (
    !agentsRaw || typeof agentsRaw !== "object" || Array.isArray(agentsRaw)
  ) {
    return [];
  }
  const out: ScannedResource[] = [];
  for (
    const [name, entryRaw] of Object.entries(
      agentsRaw as Record<string, unknown>,
    )
  ) {
    if (!entryRaw || typeof entryRaw !== "object") continue;
    const entry = entryRaw as Record<string, unknown>;
    const description = String(entry.description ?? "").trim();
    const configFile = String(entry.config_file ?? "").trim();
    if (!configFile) continue;

    // Resolve sidecar path — config_file is relative to the config.toml dir.
    const sidecarPath = configFile.startsWith("./")
      ? join(base, configFile.slice(2))
      : join(base, configFile);

    if (!(await fs.exists(sidecarPath))) continue;
    let sidecarParsed: Record<string, unknown>;
    try {
      sidecarParsed = parseToml(await fs.readFile(sidecarPath)) as Record<
        string,
        unknown
      >;
    } catch {
      continue;
    }
    const body = String(sidecarParsed.developer_instructions ?? "").trimEnd();
    const sidecarDescription = String(
      sidecarParsed.description ?? description,
    );
    const sidecarName = String(sidecarParsed.name ?? name);

    const markdown = [
      "---",
      `name: ${sidecarName}`,
      `description: ${
        /[:#\n]/.test(sidecarDescription)
          ? `"${sidecarDescription.replace(/"/g, '\\"')}"`
          : sidecarDescription
      }`,
      "---",
      "",
      body,
      "",
    ].join("\n");

    out.push({
      name,
      type: "agent",
      files: [{ relPath: `${name}.md`, content: markdown }],
    });
  }
  return out;
}

/**
 * Write agents to Codex-target via the sidecar + config.toml merge path.
 * Mirrors `syncCodexAgents` in `codex_sync.ts` but sourced from migrate's
 * scanned universal markdown bodies (after `crossTransformAgent`). Preserves
 * non-managed user tables.
 */
export async function migrateAgentsToCodex(
  agents: ScannedResource[],
  fromIde: IDE,
  toIde: IDE,
  cwd: string,
  fs: FsAdapter,
  log: (msg: string) => void,
  result: SyncResult,
  scope: SyncScope = "project",
  home: string = "",
): Promise<void> {
  const toBase = resolveIdeBaseDir(toIde.name, scope, cwd, home, "default");
  const sidecarsDir = join(toBase, "agents");
  const changes: CodexAgentChange[] = [];
  let created = 0;
  let skipped = 0;

  for (const agent of agents) {
    if (agent.files.length === 0) continue;
    const rawContent = agent.files[0].content;
    // Transform frontmatter fields for Codex (drops claude/cursor-only keys).
    const transformed = crossTransformAgent(
      rawContent,
      fromIde.name,
      "codex",
      log,
      DEFAULT_MODEL_MAPS.codex,
    );
    let sidecar: string;
    let change: CodexAgentChange;
    try {
      const built = buildCodexAgentSidecar(transformed);
      sidecar = built.sidecar;
      change = built.change;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      log(`  Warning: skipping agent ${agent.name} — ${msg}`);
      skipped++;
      continue;
    }
    const sidecarPath = join(sidecarsDir, `${change.name}.toml`);
    const currentContent = await fs.exists(sidecarPath)
      ? await fs.readFile(sidecarPath)
      : null;
    if (currentContent !== sidecar) {
      await fs.writeFile(sidecarPath, sidecar);
      created++;
      result.totalWritten++;
    } else {
      skipped++;
    }
    changes.push(change);
  }

  // Merge into config.toml.
  const configPath = join(toBase, "config.toml");
  const manifestPath = join(toBase, "flowai-agents.json");
  const existingToml = await fs.exists(configPath)
    ? await fs.readFile(configPath)
    : "";
  const existingManifest = readCodexManifest(
    await fs.exists(manifestPath) ? await fs.readFile(manifestPath) : null,
  );
  const { content: newToml, manifest: newManifest } = mergeCodexConfig(
    existingToml,
    changes,
    existingManifest,
  );
  if (newToml !== existingToml) {
    await fs.writeFile(configPath, newToml);
    result.totalWritten++;
  }
  await fs.writeFile(manifestPath, writeCodexManifest(newManifest));

  log(
    `  Agents (TOML sidecars): ${created} created, ${skipped} unchanged, 0 conflicts`,
  );
}
