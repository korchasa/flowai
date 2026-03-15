import type { FsAdapter } from "./adapters/fs.ts";
import type { PlanItem } from "./types.ts";

/** Result of write operation */
interface WriteResult {
  written: number;
  skipped: number;
  errors: Array<{ path: string; error: string }>;
}

/** Write files according to plan */
export async function writeFiles(
  plan: PlanItem[],
  fs: FsAdapter,
): Promise<WriteResult> {
  const result: WriteResult = { written: 0, skipped: 0, errors: [] };

  for (const item of plan) {
    if (item.action === "ok") {
      result.skipped++;
      continue;
    }

    try {
      await fs.writeFile(item.targetPath, item.content);
      result.written++;
    } catch (e) {
      result.errors.push({
        path: item.targetPath,
        error: (e as Error).message,
      });
    }
  }

  return result;
}
