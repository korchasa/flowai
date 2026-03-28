import { type FsAdapter, join } from "./adapters/fs.ts";
import type {
  PlanAction,
  PlanItem,
  PlanItemType,
  UpstreamFile,
} from "./types.ts";

/** Compute sync plan: compare upstream files vs local files */
export async function computePlan(
  upstreamFiles: UpstreamFile[],
  targetDir: string,
  type: PlanItemType,
  fs: FsAdapter,
): Promise<PlanItem[]> {
  const plan: PlanItem[] = [];

  for (const upstream of upstreamFiles) {
    const targetPath = join(targetDir, upstream.path);
    const name = extractName(upstream.path, type);

    let action: PlanAction;
    if (!(await fs.exists(targetPath))) {
      action = "create";
    } else {
      const localContent = await fs.readFile(targetPath);
      if (localContent === upstream.content) {
        action = "ok";
      } else {
        action = "conflict";
      }
    }

    plan.push({
      type,
      name,
      action,
      sourcePath: upstream.path,
      targetPath,
      content: upstream.content,
    });
  }

  return plan;
}

/** Extract item name from relative path */
function extractName(path: string, type: PlanItemType): string {
  if (type === "skill" || type === "hook") {
    // skills/{name}/... or hooks/{name}/... → name
    const parts = path.split("/");
    return parts[0];
  }
  if (type === "script") {
    // scripts/{filename} → filename
    const filename = path.split("/").pop() ?? path;
    return filename;
  }
  // agents/{name}.md or commands/{name}.md → name
  const filename = path.split("/").pop() ?? path;
  return filename.replace(/\.md$/, "");
}

/** Filter plan to only actionable items (exclude "ok") */
export function filterActionable(plan: PlanItem[]): PlanItem[] {
  return plan.filter((item) => item.action !== "ok");
}

/** Get plan summary */
export function planSummary(
  plan: PlanItem[],
): Record<PlanAction, number> {
  const summary: Record<PlanAction, number> = {
    create: 0,
    update: 0,
    ok: 0,
    conflict: 0,
    delete: 0,
  };
  for (const item of plan) {
    summary[item.action]++;
  }
  return summary;
}
