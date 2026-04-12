// FR-DIST.SYNC — resource indexing and filtering
/** Build pack indexes (scaffolds, assets), extract per-resource actions, filter by include/exclude */
import type { PackDefinition, PlanItem, ResourceAction } from "./types.ts";

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
