// FR-DIST.DETECT — IDE auto-detection by config dir presence
import { type FsAdapter, join } from "./adapters/fs.ts";
import { type IDE, KNOWN_IDES } from "./types.ts";

/**
 * IDE environment variable names that MUST equal "1" to indicate IDE context.
 * Detection order: CURSOR_AGENT first (may co-exist with CLAUDECODE), then CLAUDECODE, then OPENCODE.
 * See documents/ides-difference.md §3.9.
 */
const IDE_ENV_VARS_BOOL = ["CURSOR_AGENT", "CLAUDECODE", "OPENCODE"] as const;

/**
 * Codex environment variables. Unlike CURSOR_AGENT/CLAUDECODE/OPENCODE (which are
 * set to "1"), Codex exports session-scoped values: `CODEX_THREAD_ID=<uuid>` and
 * `CODEX_SANDBOX=seatbelt`. We treat any non-empty value as "inside Codex".
 * Verified empirically against codex-cli 0.118.0 (2026-04-11).
 */
const IDE_ENV_VARS_PRESENCE = ["CODEX_THREAD_ID", "CODEX_SANDBOX"] as const;

/** Check if running inside an IDE agent context via environment variables */
export function isInsideIDE(
  env: { get(key: string): string | undefined } = Deno.env,
): boolean {
  if (IDE_ENV_VARS_BOOL.some((v) => env.get(v) === "1")) return true;
  // FR-DIST.DETECT — Codex exports non-"1" values; any non-empty value counts.
  return IDE_ENV_VARS_PRESENCE.some((v) => {
    const value = env.get(v);
    return value !== undefined && value !== "";
  });
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
