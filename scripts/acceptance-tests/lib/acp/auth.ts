/**
 * ACP-side sandbox isolation + auth env (FR-ACCEPT-ISOLATION, FR-ACCEPT.ACP).
 *
 * The ACP transport reaches Claude through the `claude-code-acp` wrapper, which
 * runs the Claude Agent SDK → the same code-signed `claude` binary. To preserve
 * isolation, the wrapper is launched under an isolated `$HOME` identical in
 * intent to `ClaudeAdapter.prepareWorkspace`:
 *   - empty `.claude/skills/` so the user-level `~/.claude/skills/` snapshot
 *     cannot shadow sandbox-level skills via the Skill tool resolution path;
 *   - symlinks back to `~/Library/Keychains` and `~/.local/share/claude` so
 *     macOS Keychain releases the OAuth token by code-signing identity
 *     (subscription auth — proven to survive the wrapper by the Phase-0 spike).
 *
 * `~/.claude/skills/` is NEVER read or written here — the symlink set
 * deliberately excludes it, so the user-level snapshot is byte-identical
 * before/after a bench run.
 *
 * NOTE: intentionally duplicates the bench-home construction from
 * `adapters/claude.ts`. The direct adapter is deleted at the per-IDE cutover
 * (DoD 7); this becomes the single owner. Until then the two MUST stay in sync.
 */
import { dirname, join } from "@std/path";

/** Real-`$HOME` entries symlinked into the bench-home for OAuth/Keychain auth. */
const ISOLATED_HOME_LINKS = [
  "Library/Keychains",
  ".local/share/claude",
] as const;

/**
 * Builds the isolated bench-home for an ACP Claude launch, a sibling of the
 * sandbox (NOT inside it — an in-sandbox bench-home shows as `untracked` in
 * `git status` and trips clean-tree scenarios). Returns the env to merge into
 * the spawned wrapper process (`HOME` + the registry's launch env).
 */
// implements [REF:fr:accept-isolation | FR-ACCEPT-ISOLATION]
export async function prepareAcpClaudeHome(
  sandboxPath: string,
): Promise<{ HOME: string }> {
  const benchHome = join(dirname(sandboxPath), "bench-home");
  await Deno.mkdir(join(benchHome, ".claude", "skills"), { recursive: true });

  const realHome = Deno.env.get("HOME");
  if (realHome) {
    for (const rel of ISOLATED_HOME_LINKS) {
      const src = join(realHome, rel);
      const dst = join(benchHome, rel);
      try {
        await Deno.lstat(src);
      } catch {
        continue; // Source missing (e.g. Linux without Keychains) → skip.
      }
      await Deno.mkdir(dirname(dst), { recursive: true });
      try {
        await Deno.symlink(src, dst);
      } catch (e) {
        if (!(e instanceof Deno.errors.AlreadyExists)) throw e;
      }
    }
  }

  return { HOME: benchHome };
}
