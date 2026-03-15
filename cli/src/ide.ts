import { type FsAdapter, join } from "./adapters/fs.ts";
import { type IDE, KNOWN_IDES } from "./types.ts";

/** Detect IDEs by config dir presence in project cwd */
export async function detectIDEs(cwd: string, fs: FsAdapter): Promise<IDE[]> {
  const detected: IDE[] = [];
  for (const ide of Object.values(KNOWN_IDES)) {
    const dirPath = join(cwd, ide.configDir);
    if (await fs.exists(dirPath)) {
      detected.push(ide);
    }
  }
  return detected;
}

/** Resolve IDE list from config or auto-detect */
export async function resolveIDEs(
  configIdes: string[] | undefined,
  cwd: string,
  fs: FsAdapter,
): Promise<IDE[]> {
  if (configIdes && configIdes.length > 0) {
    const ides: IDE[] = [];
    for (const name of configIdes) {
      const ide = KNOWN_IDES[name];
      if (!ide) {
        throw new Error(
          `Unknown IDE: ${name}. Known: ${Object.keys(KNOWN_IDES).join(", ")}`,
        );
      }
      ides.push(ide);
    }
    return ides;
  }
  return await detectIDEs(cwd, fs);
}
