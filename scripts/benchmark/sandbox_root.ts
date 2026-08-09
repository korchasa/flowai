/**
 * External sandbox root for bench runs (FR-BENCH-SWE).
 *
 * Ancestor-directory memory files (`CLAUDE.md`/`AGENTS.md` up the agent's cwd
 * path, e.g. `~/AGENTS.md`) load REGARDLESS of the isolated `HOME` — proven by
 * bisection on the gate emulator (see human_emulator.ts) and observed live: bench agents
 * inherited the developer's personal rules in every run whose sandbox lived
 * under the repo (hence under `$HOME`). Agent sandboxes therefore live in a
 * temp root OUTSIDE the developer's home; the run dir keeps symlinks so
 * post-run analysis workflows (transcript + sandbox reads) are unchanged.
 */

import { basename, join, resolve } from "@std/path";
import { ensureDir } from "@std/fs";

/**
 * Deterministic per-run root under `tmpBase`: same outDir → same root
 * (orchestrator resume stays valid), different outDirs never collide.
 * Throws when the root would land under `home` — that would silently
 * reopen the contamination channel this module closes.
 */
export async function externalSandboxRoot(
  outDir: string,
  opts: { tmpBase?: string; home?: string } = {},
): Promise<string> {
  const tmpBase = opts.tmpBase ?? Deno.env.get("TMPDIR") ?? "/tmp";
  const home = opts.home ?? Deno.env.get("HOME");
  const abs = resolve(outDir);
  // crypto.subtle rejects Uint8Array views over ArrayBufferLike — copy into a
  // fresh ArrayBuffer first (known Deno TS2345 quirk).
  const bytes = new TextEncoder().encode(abs);
  const buf = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buf).set(bytes);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", buf));
  const hash = Array.from(digest.slice(0, 4))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const root = join(
    resolve(tmpBase),
    "flowai-bench",
    `${basename(abs)}-${hash}`,
  );
  if (
    home && (root === resolve(home) || root.startsWith(resolve(home) + "/"))
  ) {
    throw new Error(
      `external sandbox root ${root} lies under HOME (${home}) — ancestor memory files would contaminate the bench agent; point TMPDIR outside the home directory`,
    );
  }
  return root;
}

/**
 * Replace `instDir/sandbox` and `instDir/bench-home` with symlinks to the
 * external instance dir. Idempotent: a resumed run re-links in place.
 *
 * implements [FR-BENCH-SWE.ISOLATION]: `emulatorHome`, when given, is linked as
 * `instDir/emulator-home`. The two session stores are kept apart from each
 * other but BOTH are reachable from the run dir, which is the harness side —
 * whoever reads a campaign after the fact needs both halves of the conversation.
 * It is a separate argument because the emulator's root deliberately lives
 * outside `extInstDir`, so walking up from the agent's sandbox does not find it.
 */
export async function linkIntoRunDir(
  instDir: string,
  extInstDir: string,
  emulatorHome?: string,
): Promise<void> {
  await ensureDir(instDir);
  const targets: Array<[string, string]> = [
    ["sandbox", join(extInstDir, "sandbox")],
    ["bench-home", join(extInstDir, "bench-home")],
    ...(emulatorHome
      ? [["emulator-home", emulatorHome] as [string, string]]
      : []),
  ];
  for (const [name, target] of targets) {
    const link = join(instDir, name);
    try {
      await Deno.remove(link, { recursive: true });
    } catch (e) {
      if (!(e instanceof Deno.errors.NotFound)) throw e;
    }
    await Deno.symlink(target, link);
  }
}
