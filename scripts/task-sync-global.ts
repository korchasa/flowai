// [FR-DIST.GLOBAL](../documents/requirements.md#fr-dist.global-scope-selection-global-local-auto) — install local framework/ into global IDE configs (~/.claude, ~/.cursor, ~/.config/opencode, ~/.codex, ~/.agents)
/** Dev-only: sync framework/ → user-level IDE config dirs (no bundle step) */
import { DenoFsAdapter } from "../cli/src/adapters/fs.ts";
import { loadConfig } from "../cli/src/config.ts";
import { resolveHomeDir } from "../cli/src/scope.ts";
import { LocalSource } from "../cli/src/source.ts";
import { sync } from "../cli/src/sync.ts";

const cwd = Deno.cwd();
const fs = new DenoFsAdapter();
const home = resolveHomeDir();

const config = await loadConfig(cwd, fs, "global", home);
if (!config) {
  console.error(`No .flowai.yaml found in ${home}`);
  Deno.exit(1);
}

const result = await sync(cwd, config, fs, {
  yes: true,
  scope: "global",
  home,
  source: new LocalSource(`${cwd}/framework`),
});

console.log(
  `\nDone: ${result.totalWritten} written, ${result.totalSkipped} skipped, ${result.totalDeleted} deleted`,
);
if (result.errors.length > 0) {
  for (const e of result.errors) console.error(`  ERROR ${e.path}: ${e.error}`);
  Deno.exit(1);
}
