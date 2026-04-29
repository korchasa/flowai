// [FR-DIST.SYNC](../../documents/requirements.md#fr-dist.sync-sync-command-flowai) — resource indexing and filtering
/** Build pack indexes (scaffolds, assets), extract per-resource actions, filter by include/exclude */
import type {
  PackDefinition,
  PlanItem,
  PlanItemType,
  ResourceAction,
} from "./types.ts";

/** Build a flat scaffolds index: skill-name → artifact paths */
export function buildScaffoldsIndex(
  packs: PackDefinition[],
): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const pack of packs) {
    if (!pack.scaffolds) continue;
    for (const [skill, paths] of Object.entries(pack.scaffolds)) {
      index.set(skill, paths);
    }
  }
  return index;
}

/** Build asset mapping index: template-name → [project artifact path]
 * Uses the same Map<string, string[]> shape as scaffoldsIndex for reuse with extractResourceActions */
export function buildAssetsIndex(
  packs: PackDefinition[],
): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const pack of packs) {
    if (!pack.assets) continue;
    for (const [template, artifactPath] of Object.entries(pack.assets)) {
      index.set(template, [artifactPath]);
    }
  }
  return index;
}

/** Extract per-resource actions from a plan */
export function extractResourceActions(
  plan: PlanItem[],
  _allNames: string[],
  scaffoldsIndex: Map<string, string[]>,
): ResourceAction[] {
  // Deduplicate by name (plan may have multiple files per skill dir)
  const byName = new Map<string, ResourceAction>();
  for (const item of plan) {
    const existing = byName.get(item.name);
    // Promote action: create > update > conflict > ok
    const action = item.action === "conflict" ? "update" : item.action;
    if (
      !existing ||
      actionPriority(action) > actionPriority(existing.action)
    ) {
      byName.set(item.name, {
        name: item.name,
        action: action as ResourceAction["action"],
        scaffolds: scaffoldsIndex.get(item.name) ?? [],
      });
    }
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function actionPriority(action: string): number {
  switch (action) {
    case "create":
      return 3;
    case "update":
      return 2;
    case "delete":
      return 1;
    default:
      return 0;
  }
}

/** Mark ResourceAction items as `failed` when writeFiles reported an error
 * for that (type, name) pair. Renderer uses `failed` to relocate the entry
 * to the ERRORS block and shrink the CREATED/UPDATED counter.
 *
 * `sectionType`: the PlanItemType that `actions` corresponds to. `asset` lines
 * come from plan items of type `asset`, etc. This avoids cross-matching a
 * `failedNames` collision (e.g., a skill and an agent sharing a name). */
export function markFailedActions(
  actions: ResourceAction[],
  errors: Array<{ name?: string; type?: PlanItemType }>,
  sectionType: PlanItemType | PlanItemType[],
): void {
  const types = Array.isArray(sectionType) ? sectionType : [sectionType];
  const failedNames = new Set<string>();
  for (const e of errors) {
    if (!e.name || !e.type) continue;
    if (types.includes(e.type)) failedNames.add(e.name);
  }
  for (const a of actions) {
    if (failedNames.has(a.name)) a.failed = true;
  }
}

/** Filter names by include/exclude lists */
export function filterNames(
  all: string[],
  include: string[],
  exclude: string[],
): string[] {
  if (include.length > 0) {
    return all.filter((n) => include.includes(n));
  }
  if (exclude.length > 0) {
    return all.filter((n) => !exclude.includes(n));
  }
  return all;
}
