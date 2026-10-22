/**
 * Where one benchmark run's session transcripts live, per IDE
 * (FR-BENCH-SWE.IDE). The cost harvest (FR-BENCH-SWE.COST), the web audit
 * (FR-BENCH-SWE.WEBAUDIT) and the session-peek audit (FR-BENCH-SWE.ISOLATION)
 * read the same files and differ only in what they look for, so finding the
 * files lives here once:
 *
 * - codex writes rollouts under `<CODEX_HOME>/sessions/**`;
 * - Claude Code writes transcripts under `<HOME>/.claude/projects/**`, with
 *   one extra file per subagent beneath the session's own directory.
 *
 * A run may span two stores of different IDEs: the agent writes into its
 * IDE's store and the human emulator into the store of ITS transport, which
 * follows the emulator's model, not the subject IDE. Each file therefore
 * carries the IDE that wrote it, so a reader picks the right parser per file.
 *
 * A store whose directory is absent fails the harvest, naming the directory:
 * a session that produced no transcript is a harness defect, not a zero-cost,
 * clean-network run.
 */
import { join } from "@std/path";
import { copy, walk } from "@std/fs";
import { benchRunKey } from "@acceptance-tests/acp/auth.ts";

export type SessionStore =
  /** Every `CODEX_HOME` the run wrote into. */
  | { ide: "codex"; codexHomes: readonly string[] }
  /** Every `HOME` whose `.claude/projects` the run wrote into. */
  | { ide: "claude"; homes: readonly string[] };

/** One store, or several of possibly different IDEs. */
export type SessionStores = SessionStore | readonly SessionStore[];

/** A transcript file and the IDE whose format it is in. */
export interface StoreFile {
  path: string;
  ide: SessionStore["ide"];
}

function asList(stores: SessionStores): readonly SessionStore[] {
  return Array.isArray(stores) ? stores : [stores as SessionStore];
}

/** The transcript directories a store covers, in order. */
export function storeDirs(store: SessionStore): string[] {
  return store.ide === "codex"
    ? store.codexHomes.map((h) => join(h, "sessions"))
    : store.homes.map((h) => join(h, ".claude", "projects"));
}

/**
 * Every transcript file of the stores, each tagged with its IDE. Throws
 * naming the first absent directory, before reading anything.
 */
export async function storeFiles(stores: SessionStores): Promise<StoreFile[]> {
  const dirs = asList(stores).flatMap((s) =>
    storeDirs(s).map((dir) => ({ dir, ide: s.ide }))
  );
  for (const { dir } of dirs) {
    try {
      await Deno.stat(dir);
    } catch {
      throw new Error(`no transcripts: sessions dir absent at ${dir}`);
    }
  }
  const files: StoreFile[] = [];
  for (const { dir, ide } of dirs) {
    const found: string[] = [];
    for await (
      const e of walk(dir, { includeDirs: false, exts: [".jsonl"] })
    ) {
      found.push(e.path);
    }
    files.push(...found.sort().map((path) => ({ path, ide })));
  }
  return files;
}

/**
 * implements [FR-BENCH-SWE.ISOLATION]: keep a claude run's transcripts after
 * the OS purges its temp bench-home. Codex writes straight into the durable
 * per-run store `~/.flowai-dev/bench/<runKey>/.codex`; Claude Code cannot,
 * because it authenticates through the Keychain links of the isolated
 * bench-home and a different config root would change the Keychain entry it
 * looks up. So the transcripts are copied next to where the codex store would
 * be, at `~/.flowai-dev/bench/<runKey>/claude-projects`, after the harvest.
 * Returns the destination, or null when the run wrote no transcript.
 */
export async function preserveClaudeTranscripts(
  benchHome: string,
  sandboxPath: string,
  realHome: string | undefined = Deno.env.get("HOME"),
): Promise<string | null> {
  if (realHome === undefined) {
    throw new Error("HOME is unset — cannot place the bench transcript copy");
  }
  const src = join(benchHome, ".claude", "projects");
  try {
    await Deno.stat(src);
  } catch {
    return null;
  }
  const dest = join(
    realHome,
    ".flowai-dev",
    "bench",
    await benchRunKey(sandboxPath),
    "claude-projects",
  );
  await copy(src, dest, { overwrite: true });
  return dest;
}
