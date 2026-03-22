import { type FsAdapter, join } from "./adapters/fs.ts";
import { type IDE, KNOWN_IDES } from "./types.ts";

/**
 * IDE environment variable names.
 * Detection order: CURSOR_AGENT first (may co-exist with CLAUDECODE), then CLAUDECODE, then OPENCODE.
 * See documents/ides-difference.md §3.9.
 */
const IDE_ENV_VARS = ["CURSOR_AGENT", "CLAUDECODE", "OPENCODE"] as const;

/** Check if running inside an IDE agent context via environment variables */
export function isInsideIDE(
  env: { get(key: string): string | undefined } = Deno.env,
): boolean {
  return IDE_ENV_VARS.some((v) => env.get(v) === "1");
}

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
