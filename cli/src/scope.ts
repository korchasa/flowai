// [FR-DIST.GLOBAL](../../documents/requirements.md#fr-dist.global-scope-selection-global-local-auto) — sync scope abstraction (project vs global mode).
// Threads through config loading, IDE path resolution, and hook writer so
// every scope-dependent path lives in one place.
import { type FsAdapter, join } from "./adapters/fs.ts";
import { KNOWN_IDES } from "./types.ts";

/** Sync scope: project-local install vs global (IDE user-level dirs) install. */
export type SyncScope = "project" | "global";

/** User-visible scope selection: `auto` defers to `resolveAutoScope`, the two
 * explicit modes bypass the ladder. */
export type ScopeMode = "global" | "local" | "auto";

/** Purpose discriminator for `resolveIdeBaseDir`.
 * Codex global mode splits primitives across two user-level dirs:
 * `~/.codex/` for agents (TOML sidecar flow) and `~/.agents/skills/`
 * for user-level skills (Codex convention, verified 2026-04-16).
 * Other IDEs return the same path regardless of purpose. */
export type IdeTargetPurpose = "skills" | "agents" | "default";

/** Read --global flag from a generic options bag (legacy helper for explicit
 * global-vs-project selection; see `resolveScopeMode` for the three-mode
 * CLI surface). */
export function resolveScope(flags: { global?: boolean }): SyncScope {
  return flags.global === true ? "global" : "project";
}

/** Translate CLI flags into the three-mode scope selector.
 * - `--global` → `"global"`; `--local` → `"local"`; neither → `"auto"` (default).
 * - Both flags set → throws (CLI surfaces the error; mutually exclusive). */
export function resolveScopeMode(flags: {
  global?: boolean;
  local?: boolean;
}): ScopeMode {
  const g = flags.global === true;
  const l = flags.local === true;
  if (g && l) {
    throw new Error(
      "--global and --local are mutually exclusive; pass only one.",
    );
  }
  if (g) return "global";
  if (l) return "local";
  return "auto";
}

/** Auto-resolve scope for the default (`--auto`) mode.
 *
 * Resolution ladder:
 *   1. `<cwd>/.flowai.yaml` exists → `"project"` (repo opt-in wins).
 *   2. `<home>/.flowai.yaml` exists → `"global"` (user-level install).
 *   3. Neither exists → `null` (caller prompts or defaults to global in `-y`).
 *
 * The function makes no writes and throws on a missing fs adapter, which
 * forces callers to use the real or in-memory adapter explicitly. */
export function resolveAutoScope(
  cwd: string,
  home: string,
  fs: FsAdapter,
): Promise<SyncScope | null> {
  if (!fs) {
    return Promise.reject(
      new Error("resolveAutoScope: fs adapter is required"),
    );
  }
  return (async () => {
    if (await fs.exists(join(cwd, ".flowai.yaml"))) return "project";
    if (await fs.exists(join(home, ".flowai.yaml"))) return "global";
    return null;
  })();
}

/** Resolve the `.flowai.yaml` path for a given scope.
 * Project: `<cwd>/.flowai.yaml`. Global: `<home>/.flowai.yaml`. */
export function resolveConfigPath(
  scope: SyncScope,
  cwd: string,
  home: string,
): string {
  return scope === "global"
    ? join(home, ".flowai.yaml")
    : join(cwd, ".flowai.yaml");
}

/** Resolve the IDE base dir for install targets.
 *
 * Project mode: `<cwd>/<ide.configDir>` — unchanged from pre-global behavior.
 *
 * Global mode per IDE (purpose = "skills" | "agents" | "default"):
 *   - claude:   `<home>/.claude`
 *   - cursor:   `<home>/.cursor`
 *   - opencode: `<home>/.config/opencode`
 *   - codex:    `<home>/.codex` (agents/default) / `<home>/.agents` (skills)
 *
 * Note: `~/.agents/` is returned as the Codex skills base dir; the `skills/`
 * subdir is appended by downstream code consistent with the project-mode
 * pattern (`<base>/skills/<name>/`). */
export function resolveIdeBaseDir(
  ideName: string,
  scope: SyncScope,
  cwd: string,
  home: string,
  purpose: IdeTargetPurpose = "default",
): string {
  if (scope === "project") {
    const ide = KNOWN_IDES[ideName];
    if (!ide) {
      throw new Error(
        `Unknown IDE: ${ideName}. Known: ${Object.keys(KNOWN_IDES).join(", ")}`,
      );
    }
    return join(cwd, ide.configDir);
  }

  // Global mode: native user-level paths per IDE.
  switch (ideName) {
    case "claude":
      return join(home, ".claude");
    case "cursor":
      return join(home, ".cursor");
    case "opencode":
      return join(home, ".config", "opencode");
    case "codex":
      return purpose === "skills"
        ? join(home, ".agents")
        : join(home, ".codex");
    default:
      throw new Error(
        `Unknown IDE for global mode: ${ideName}. Known: ${
          Object.keys(KNOWN_IDES).join(", ")
        }`,
      );
  }
}

/** Resolve the user's home dir. Uses HOME on Unix/macOS, USERPROFILE on Windows.
 * Throws a clear error if neither is set — avoids silent fallback to cwd. */
export function resolveHomeDir(
  env: { get(key: string): string | undefined } = Deno.env,
): string {
  const home = env.get("HOME") ?? env.get("USERPROFILE");
  if (!home) {
    throw new Error(
      "Cannot resolve home directory: neither HOME nor USERPROFILE is set.",
    );
  }
  return home;
}
