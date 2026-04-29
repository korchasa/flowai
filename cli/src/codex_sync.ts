// [FR-DIST.CODEX-AGENTS](../../documents/requirements.md#fr-dist.codex-agents-openai-codex-subagent-sync) — Codex-specific agent sync
// [FR-DIST.CLEAN-PREFIX](../../documents/requirements.md#fr-dist.clean-prefix-prefix-based-orphan-cleanup) — prefix-based orphan cleanup (no manifest).
// [FR-DIST.GLOBAL](../../documents/requirements.md#fr-dist.global-scope-selection-global-local-auto) — Codex agent sync resolves base dir via scope.
/**
 * Sync framework agents to Codex subagent format.
 *
 * Writes each agent as two artifacts:
 * 1. `<codex-base>/agents/<name>.toml` — sidecar with `name`, `description`,
 *    `developer_instructions` (the agent body as a TOML multi-line literal).
 * 2. `[agents.<name>]` block merged into `<codex-base>/config.toml` with
 *    `description` and `config_file` keys pointing at the sidecar.
 *
 * `<codex-base>` = `<cwd>/.codex/` in project mode, `~/.codex/` in global mode.
 *
 * Idempotent. Removing or renaming an agent removes both the sidecar and the
 * `[agents.<name>]` block on next sync via the `flowai-` prefix rule. User-
 * authored `[agents.<name>]` tables without the `flowai-` prefix survive
 * untouched.
 */
import { type FsAdapter, join } from "./adapters/fs.ts";
import type { FrameworkSource } from "./source.ts";
import {
  buildCodexAgentSidecar,
  type CodexAgentChange,
  mergeCodexConfig,
} from "./toml_merge.ts";
import type { IDE, PlanAction, PlanItem } from "./types.ts";
import { extractResourceActions } from "./resource_index.ts";
import {
  computePrefixOrphansPlan,
  processPlan,
  type SyncResult,
} from "./sync.ts";

/**
 * Syncs framework agents into Codex IDE: writes each as
 * `<codex-base>/agents/<name>.toml` and updates `<codex-base>/config.toml`
 * via `mergeCodexConfig`. `isFirstIde` controls which pass owns the per-IDE
 * action accounting.
 */
export async function syncCodexAgents(
  cwd: string,
  ide: IDE,
  agentNames: string[],
  _allAgentNames: string[],
  allPaths: string[],
  source: FrameworkSource,
  fs: FsAdapter,
  isFirstIde: boolean,
  result: SyncResult,
  log: (msg: string) => void,
  codexBaseDir?: string,
): Promise<void> {
  // 1. Read raw universal agent files and build sidecars + changes.
  const base = codexBaseDir ?? join(cwd, ide.configDir);
  const sidecarsDir = join(base, "agents");
  const sidecarPlan: PlanItem[] = [];
  const changes: CodexAgentChange[] = [];

  // Find the raw source path for each agent — pack-based or legacy flat.
  const packAgentRegex = /^framework\/[^/]+\/agents\/([^/]+)\.md$/;
  const packAgentPaths = new Map<string, string>();
  for (const p of allPaths) {
    const m = p.match(packAgentRegex);
    if (m) packAgentPaths.set(m[1], p);
  }

  for (const name of agentNames) {
    const srcPath = packAgentPaths.get(name) ??
      (allPaths.includes(`framework/agents/${name}.md`)
        ? `framework/agents/${name}.md`
        : null);
    if (!srcPath) continue;
    const raw = await source.readFile(srcPath);
    const { sidecar, change } = buildCodexAgentSidecar(raw);
    changes.push(change);
    const sidecarPath = join(sidecarsDir, `${name}.toml`);
    const action: PlanAction = await fs.exists(sidecarPath)
      ? (await fs.readFile(sidecarPath)) === sidecar ? "ok" : "conflict"
      : "create";
    sidecarPlan.push({
      type: "agent",
      name,
      action,
      sourcePath: srcPath,
      targetPath: sidecarPath,
      content: sidecar,
    });
  }

  // 2. FR-DIST.CLEAN-PREFIX — delete any flowai-*.toml sidecar not in the
  //    current agent set. Replaces the old manifest-based deletion that
  //    missed renames.
  const orphanPlan = await computePrefixOrphansPlan(
    sidecarsDir,
    new Set(agentNames),
    fs,
    "agent",
    { ext: ".toml" },
  );
  sidecarPlan.push(...orphanPlan);

  if (isFirstIde) {
    result.agentActions = extractResourceActions(
      sidecarPlan,
      agentNames,
      new Map(),
    );
  }

  // 3. Write sidecars via the shared writer (handles conflict prompts).
  await processPlan(sidecarPlan, fs, { yes: true }, result, log);

  // 4. Read existing config.toml, merge with changes (prefix rule strips
  //    stale flowai-* tables), write.
  const configPath = join(base, "config.toml");
  const existingToml = await fs.exists(configPath)
    ? await fs.readFile(configPath)
    : "";

  const { content: newToml } = mergeCodexConfig(existingToml, changes);

  if (newToml !== existingToml) {
    await fs.writeFile(configPath, newToml);
    result.totalWritten++;
  }

  // 5. One-shot migration: drop the legacy flowai-agents.json manifest left
  //    by pre-CLEAN-PREFIX versions. No-op on fresh installs.
  const legacyManifestPath = join(base, "flowai-agents.json");
  if (await fs.exists(legacyManifestPath)) {
    await fs.remove(legacyManifestPath);
    result.totalDeleted++;
  }
}
