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
import { basename, dirname, join, resolve } from "@std/path";

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
 *
 * An empty `.claude/skills/` only isolates the USER-level snapshot. Claude
 * Code's BUNDLED skills are extracted outside `$HOME` and stay reachable, so
 * they are switched off explicitly — the bench measures the framework's skills,
 * and a bundled one that wins the routing measures the CLI instead.
 */
// implements [REF:fr:accept-isolation | FR-ACCEPT-ISOLATION]
export async function prepareAcpClaudeHome(
  sandboxPath: string,
): Promise<{ HOME: string; CLAUDE_CODE_DISABLE_BUNDLED_SKILLS: string }> {
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

  return { HOME: benchHome, CLAUDE_CODE_DISABLE_BUNDLED_SKILLS: "1" };
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
 * Builds the benchmark's ONE codex config root, under `~/.flowai-dev`
 * (FR-BENCH-SWE.ISOLATION, user decision 2026-08-09).
 *
 * Layout — one predictable place outside the project, per-run stores beneath it:
 *
 *     ~/.flowai-dev/auth.json            -> ~/.codex/auth.json
 *     ~/.flowai-dev/bench/<runKey>/.codex/
 *         auth.json                      -> ~/.flowai-dev/auth.json
 *         skills/                        (empty)
 *
 * The single root-level `auth.json` is the point: credentials live in one named
 * place the maintainer can inspect and repair, instead of a symlink per run into
 * a temp directory the OS purges. The agent under test and the human emulator
 * SHARE the per-run store — they no longer get separate ones, because codex has
 * no sandbox mode that denies disk reads (measured on 0.144.6), so separating
 * them bought a removed pointer rather than a guarantee. What replaced it is a
 * check: `peek_audit.ts` flags any shell command that reached for a session
 * store, in either transcript.
 *
 * The store stays PER RUN rather than one directory for the whole benchmark
 * because the cost harvest attributes tokens by walking a store: instances run
 * four at a time by default, and a shared directory would interleave four
 * sessions' rollouts with no way to tell them apart.
 *
 * `runKey` is therefore the instance name plus a hash of the FULL sandbox path,
 * unique per (campaign, rep, arm, instance) and stable across a resume. The
 * instance name alone is not enough, and the first version of this function got
 * exactly that wrong: the rep lives a level above `<arm>/<instance>`, so all
 * three reps of one instance shared a store and rep2's harvest counted rep1's
 * rollouts as well — measured on the 2026-08-09 baseline campaign,
 * `transcriptFiles` ran 2, 4, 6 across the reps and 45 sessions left only 15
 * stores on disk.
 *
 * Empty `skills/` and no `config.toml` for the reason `prepareAcpCodexHome`
 * documents: `~/.codex/skills/` would shadow the sandbox pack, and
 * `~/.codex/config.toml` globally pins model + reasoning effort.
 *
 * Unlike the temp-root homes, nothing purges this tree — that is deliberate (the
 * sessions stay readable after a campaign) and it grows. Pruning is the
 * maintainer's call, never this function's.
 */
// implements [FR-BENCH-SWE.ISOLATION]
export async function prepareBenchCodexHome(
  sandboxPath: string,
): Promise<string> {
  const realHome = Deno.env.get("HOME");
  if (realHome === undefined) {
    throw new Error("HOME is unset — cannot place the bench codex home");
  }
  const root = join(realHome, ".flowai-dev");
  const rootAuth = join(root, "auth.json");
  await Deno.mkdir(root, { recursive: true });
  await linkOnce(join(realHome, ".codex", "auth.json"), rootAuth);

  const runKey = await benchRunKey(sandboxPath);
  const codexHome = join(root, "bench", runKey, ".codex");
  await Deno.mkdir(join(codexHome, "skills"), { recursive: true });
  await linkOnce(rootAuth, join(codexHome, "auth.json"));
  return codexHome;
}

/**
 * `<instance>-<8 hex of the full sandbox path>`.
 *
 * Readable at a glance and unique across reps and arms, which the bare parent
 * directory name is not — see `prepareBenchCodexHome`. Deterministic, so a
 * resumed run re-prepares the same store instead of orphaning it.
 */
export async function benchRunKey(sandboxPath: string): Promise<string> {
  const abs = resolve(sandboxPath);
  // crypto.subtle rejects Uint8Array views over ArrayBufferLike — copy into a
  // fresh ArrayBuffer first (known Deno TS2345 quirk).
  const bytes = new TextEncoder().encode(abs);
  const buf = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buf).set(bytes);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", buf));
  const hash = Array.from(digest.slice(0, 4))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${basename(dirname(abs))}-${hash}`;
}

/**
 * Symlink `dst` -> `src`, tolerating a re-prepare. A missing source leaves no
 * link at all, so the session surfaces a real auth error rather than a dangling
 * one.
 */
async function linkOnce(src: string, dst: string): Promise<void> {
  try {
    await Deno.lstat(src);
  } catch {
    return;
  }
  try {
    await Deno.symlink(src, dst);
  } catch (e) {
    if (!(e instanceof Deno.errors.AlreadyExists)) throw e;
  }
}
