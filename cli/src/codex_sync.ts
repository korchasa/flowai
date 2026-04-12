// FR-DIST.CODEX-AGENTS — Codex-specific agent sync
/**
 * Sync framework agents to Codex subagent format.
 *
 * Writes each agent as two artifacts:
 * 1. `<cwd>/.codex/agents/<name>.toml` — sidecar with `name`, `description`,
 *    `developer_instructions` (the agent body as a TOML multi-line literal).
 * 2. `[agents.<name>]` block merged into `<cwd>/.codex/config.toml` with
 *    `description` and `config_file` keys pointing at the sidecar.
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
): Promise<void> {
  // 1. Read raw universal agent files and build sidecars + changes.
  const sidecarsDir = join(cwd, ide.configDir, "agents");
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
  const configPath = join(cwd, ide.configDir, "config.toml");
  const manifestPath = join(cwd, ide.configDir, "flowai-agents.json");
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
