// FR-DIST.CODEX-AGENTS — Codex-specific agent sync
// FR-DIST.GLOBAL — Codex agent sync resolves base dir via scope.
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
 * Idempotent. Removing an agent from `.flowai.yaml` removes both the sidecar
 * and the `[agents.<name>]` block on next sync. User-hand-edited tables outside
 * the flowai manifest survive untouched.
 */
import { type FsAdapter, join } from "./adapters/fs.ts";
import type { FrameworkSource } from "./source.ts";
import {
  buildCodexAgentSidecar,
  type CodexAgentChange,
  mergeCodexConfig,
  readCodexManifest,
  writeCodexManifest,
} from "./toml_merge.ts";
import type { IDE, PlanAction, PlanItem } from "./types.ts";
import { extractResourceActions } from "./resource_index.ts";
import { processPlan, type SyncResult } from "./sync.ts";

/**
 * Syncs framework agents into Codex IDE: writes each as `.codex/prompts/<name>.md` and
 * updates `.codex/config.toml` via `toml_merge`. `isFirstIde` controls whether the
 * TOML manifest is reset (only the first IDE in a sync run owns it).
 */
export async function syncCodexAgents(
  cwd: string,
  ide: IDE,
  agentNames: string[],
  allAgentNames: string[],
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

  // 2. Compute sidecars to delete (agents excluded from current sync but
  //    still present on disk under our manifest).
  const includedSet = new Set(agentNames);
  const deletionCandidates = allAgentNames.filter((n) => !includedSet.has(n));
  for (const name of deletionCandidates) {
    const sidecarPath = join(sidecarsDir, `${name}.toml`);
    if (await fs.exists(sidecarPath)) {
      sidecarPlan.push({
        type: "agent",
        name,
        action: "delete",
        sourcePath: "",
        targetPath: sidecarPath,
        content: "",
      });
    }
  }

  if (isFirstIde) {
    result.agentActions = extractResourceActions(
      sidecarPlan,
      agentNames,
      new Map(),
    );
  }

  // 3. Write sidecars via the shared writer (handles conflict prompts).
  await processPlan(sidecarPlan, fs, { yes: true }, result, log);

  // 4. Read existing config.toml + manifest, merge, write.
  const configPath = join(base, "config.toml");
  const manifestPath = join(base, "flowai-agents.json");
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
}
