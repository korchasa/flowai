/**
 * ACP-side sandbox isolation + auth env (FR-ACCEPT-ISOLATION, FR-ACCEPT.ACP).
 *
 * The ACP transport reaches Claude through the `claude-code-acp` wrapper, which
 * runs the Claude Agent SDK → the same code-signed `claude` binary. To preserve
 * isolation, the wrapper is launched under an isolated `$HOME`:
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
 * This is the single owner of the bench-home construction (the direct
 * `ClaudeAdapter` that previously held a copy was retired with the ACP cutover).
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

/**
 * Builds the isolated environment for an ACP **Codex** launch
 * (FR-BENCH-SWE.IDE). Codex needs the same class of isolation Claude does, for
 * two reasons observed on the maintainer's host:
 *
 * - `~/.codex/skills/` holds user-level skills that Codex discovers and that
 *   would shadow the sandbox-installed pack — the codex twin of the collision
 *   FR-ACCEPT-ISOLATION fixes for Claude;
 * - `~/.codex/config.toml` sets `model` and `model_reasoning_effort` globally,
 *   so an un-isolated run would take its reasoning effort from whoever's
 *   machine launched the benchmark — exactly the leak the effort invariant
 *   (FR-BENCH-SWE.SYMMETRY) forbids, since two arms run at different times.
 *
 * Isolation is by CONSTRUCTION, not by copying: the bench `CODEX_HOME` starts
 * empty and only `auth.json` is symlinked back, so no user config can reach the
 * session. Codex also writes its session rollouts under `CODEX_HOME/sessions/`,
 * which keeps them next to the run for a future cost harvest.
 *
 * Returns `HOME` as well: the benchmark's gate/answer judge shells out to
 * `claude -p` even when the agent under test is Codex, so it still needs the
 * isolated Claude bench-home or the developer's personal `~/.claude` memory
 * leaks into judge replies.
 */
// implements [REF:fr:accept-isolation | FR-ACCEPT-ISOLATION]
export async function prepareAcpCodexHome(
  sandboxPath: string,
): Promise<{ HOME: string; CODEX_HOME: string }> {
  // The judge half — also creates the bench-home dir this CODEX_HOME sits in.
  const { HOME } = await prepareAcpClaudeHome(sandboxPath);

  const codexHome = join(HOME, ".codex");
  await Deno.mkdir(join(codexHome, "skills"), { recursive: true });

  const realHome = Deno.env.get("HOME");
  if (realHome) {
    // ONLY the credentials — never config.toml, never skills/.
    const src = join(realHome, ".codex", "auth.json");
    try {
      await Deno.lstat(src);
      await Deno.symlink(src, join(codexHome, "auth.json"));
    } catch (e) {
      // Source absent (never logged in) → no link, so the bridge surfaces a
      // real auth error instead of a dangling one. Already-linked is fine.
      if (e instanceof Deno.errors.AlreadyExists) {
        /* idempotent re-prepare */
      }
    }
  }

  return { HOME, CODEX_HOME: codexHome };
}

/**
 * Builds a SEPARATE codex config root for the benchmark's human emulator
 * (FR-BENCH-SWE.ISOLATION).
 *
 * The emulator and the agent under test used to share one `CODEX_HOME`, so both
 * session stores sat in one directory and each side's environment named it. That
 * is a measurement leak in both directions: the emulator's rollout carries the
 * human persona and the `DECISION:` protocol the agent is being graded against,
 * while the agent's rollout carries the reasoning the emulator is supposed not
 * to see (it answers from the issue text and the engineer's latest message
 * alone). Neither leak needs an adversary — one `ls` of the store either side is
 * pointed at is enough.
 *
 * The root is created OUTSIDE the run's instance directory, under the OS temp
 * root with a random name, so it is not reachable by walking up from the
 * agent's sandbox. The caller is responsible for removing it after the harvest.
 *
 * Scope, stated rather than implied: this separates the stores and removes the
 * pointer from each side's environment. It is NOT an OS-enforced denial —
 * measured on codex-cli 0.144.6, `--sandbox read-only` blocks writes and leaves
 * disk READS unrestricted, so a session that deliberately scans the temp root
 * can still reach the other store. Enforcing that would need a distinct OS user
 * or a custom seatbelt profile; neither is in place.
 */
// implements [FR-BENCH-SWE.ISOLATION]
export async function prepareEmulatorCodexHome(): Promise<
  { HOME: string; CODEX_HOME: string }
> {
  const home = await Deno.makeTempDir({ prefix: "flowai-bench-emulator-" });
  const codexHome = join(home, ".codex");
  // Empty `skills/` for the same reason the agent's root has one: a user-level
  // `~/.codex/skills/` must not reach a referee that is pinned by argv.
  await Deno.mkdir(join(codexHome, "skills"), { recursive: true });

  const realHome = Deno.env.get("HOME");
  if (realHome) {
    const src = join(realHome, ".codex", "auth.json");
    try {
      await Deno.lstat(src);
      await Deno.symlink(src, join(codexHome, "auth.json"));
    } catch (e) {
      if (e instanceof Deno.errors.AlreadyExists) {
        /* idempotent re-prepare */
      }
    }
  }

  return { HOME: home, CODEX_HOME: codexHome };
}
