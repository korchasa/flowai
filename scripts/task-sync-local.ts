/** Dev-only: sync framework/ → IDE config dirs directly (no bundle step) */
import { DenoFsAdapter } from "../cli/src/adapters/fs.ts";
import { loadConfig } from "../cli/src/config.ts";
import { LocalSource } from "../cli/src/source.ts";
import { sync } from "../cli/src/sync.ts";

const cwd = Deno.cwd();
const fs = new DenoFsAdapter();

const config = await loadConfig(cwd, fs);
if (!config) {
  console.error("No .flowai.yaml found in", cwd);
  Deno.exit(1);
}

const result = await sync(cwd, config, fs, {
  yes: true,
  source: new LocalSource(`${cwd}/framework`),
});

console.log(
  `\nDone: ${result.totalWritten} written, ${result.totalSkipped} skipped, ${result.totalDeleted} deleted`,
);
if (result.errors.length > 0) {
  for (const e of result.errors) console.error(`  ERROR ${e.path}: ${e.error}`);
  Deno.exit(1);
}
