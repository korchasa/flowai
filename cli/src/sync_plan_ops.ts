// [FR-DIST.SYNC](../../documents/requirements.md#fr-dist.sync-sync-command-flowai) — plan-execution + prefix-orphan helpers
/** Plan-execution helpers shared by sync.ts and sync_kinds.ts. */
import { type FsAdapter, join } from "./adapters/fs.ts";
import { planSummary } from "./plan.ts";
import type { PlanItem, PlanItemType } from "./types.ts";
import { writeFiles } from "./writer.ts";
import type { SyncOptions, SyncResult } from "./sync.ts";

/** Process a plan: handle conflicts, write files */
export async function processPlan(
  plan: PlanItem[],
  fs: FsAdapter,
  options: SyncOptions,
  result: SyncResult,
  log: (msg: string) => void,
): Promise<void> {
  const summary = planSummary(plan);

  if (summary.create > 0) log(`  Create: ${summary.create}`);
  if (summary.delete > 0) log(`  Delete: ${summary.delete}`);
  if (summary.ok > 0) log(`  Unchanged: ${summary.ok}`);
  if (summary.conflict > 0) log(`  Conflicts: ${summary.conflict}`);

  // Handle conflicts
  const conflicts = plan.filter((i) => i.action === "conflict");
  if (conflicts.length > 0 && !options.yes) {
    if (options.promptConflicts) {
      const overwriteIndices = await options.promptConflicts(conflicts);
      // Mark non-selected conflicts as "ok" (skip)
      for (let i = 0; i < conflicts.length; i++) {
        if (!overwriteIndices.includes(i)) {
          const item = conflicts[i];
          const planIdx = plan.indexOf(item);
          plan[planIdx] = { ...item, action: "ok" };
          result.totalSkipped++;
        }
      }
      result.totalConflicts += overwriteIndices.length;
    } else {
      // No prompt handler, skip all conflicts
      for (const item of conflicts) {
        const planIdx = plan.indexOf(item);
        plan[planIdx] = { ...item, action: "ok" };
        result.totalSkipped++;
      }
    }
  } else if (conflicts.length > 0) {
    // --yes mode: overwrite all
    result.totalConflicts += conflicts.length;
  }

  // [FR-DIST.SYNC](../../documents/requirements.md#fr-dist.sync-sync-command-flowai) — dry-run: skip writes entirely so totalWritten stays at 0
  // and the renderer's "complete" vs "FAILED" header reflects a non-write run
  // truthfully. Plan-derived ResourceActions are populated upstream.
  if (options.dryRun) return;

  const writeResult = await writeFiles(plan, fs);
  result.totalWritten += writeResult.written;
  result.totalSkipped += writeResult.skipped;
  result.totalDeleted += writeResult.deleted;
  result.errors.push(...writeResult.errors);
}

/**
 * FR-DIST.CLEAN-PREFIX — scan `targetDir` and emit a delete plan for any
 * direct child whose name starts with `prefix` (default `flowai-`) and whose
 * base name (stripped of optional `ext`) is not in `keepNames`.
 *
 * Symlinks are preserved (never deleted) — guards against user-maintained
 * links that happen to share the prefix.
 */
export async function computePrefixOrphansPlan(
  targetDir: string,
  keepNames: Set<string>,
  fs: FsAdapter,
  type: PlanItemType,
  options: { prefix?: string; ext?: string } = {},
): Promise<PlanItem[]> {
  if (!(await fs.exists(targetDir))) return [];
  const prefix = options.prefix ?? "flowai-";
  const ext = options.ext ?? "";
  const plan: PlanItem[] = [];

  for await (const entry of fs.readDir(targetDir)) {
    if (entry.isSymlink) continue;
    if (!entry.name.startsWith(prefix)) continue;
    if (ext && !entry.name.endsWith(ext)) continue;
    const baseName = ext ? entry.name.slice(0, -ext.length) : entry.name;
    if (keepNames.has(baseName)) continue;
    plan.push({
      type,
      name: baseName,
      action: "delete",
      sourcePath: "",
      targetPath: join(targetDir, entry.name),
      content: "",
    });
  }

  return plan;
}
