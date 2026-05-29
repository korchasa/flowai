// implements [FR-DIST.MARKETPLACE](../documents/requirements.md#fr-dist.marketplace-claude-code-codex-plugin-marketplace)
//
// `deno task sync-plugins-local` — framework-developer dogfood loop.
//
// Rebuilds the plugin marketplace at ./dist/claude-plugins, re-points the
// `flowai-plugins-local` marketplace in Claude Code and Codex at that local
// path, and installs / refreshes every emitted pack at user scope. Distinct
// from the downstream-tracking install flow that end users follow against
// `korchasa/flowai-plugins` on GitHub — that marketplace is the upstream
// channel and is intentionally left untouched by the dogfood loop, so
// developers can compare released vs in-development behaviour side-by-side.
//
// Missing `claude` or `codex` CLIs (or older Codex without `plugin
// marketplace`) are reported and skipped, not fatal.

import { isAbsolute, join, resolve } from "@std/path";
import { buildPlugins, DEFAULT_PACKS } from "./build-plugins.ts";

const DEFAULT_OUT_DIR = "dist/claude-plugins";
const MARKETPLACE_NAME = "flowai-plugins-local";
const LEGACY_MARKETPLACE_NAME = "flowai-plugins";

export const ENV_AUTO_INSTALL_PLUGINS = "AUTO_INSTALL_PLUGINS";

function parseDotenv(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equals = line.indexOf("=");
    if (equals < 0) continue;
    const key = line.slice(0, equals).trim();
    let value = line.slice(equals + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

/**
 * Pure check used by tests: returns true iff the dotenv content sets
 * `AUTO_INSTALL_PLUGINS=true` (exact match — any other value is treated as
 * disabled to avoid surprises with `1` / `yes` / unquoted true variants).
 */
export function autoInstallEnabled(dotenvContent: string): boolean {
  return parseDotenv(dotenvContent)[ENV_AUTO_INSTALL_PLUGINS] === "true";
}

/**
 * Process-level check: process env wins; otherwise falls back to reading the
 * given dotenv file (default `.env`). Missing dotenv is treated as disabled.
 */
export async function shouldAutoInstall(
  dotenvPath = ".env",
): Promise<boolean> {
  if (Deno.env.get(ENV_AUTO_INSTALL_PLUGINS) === "true") return true;
  try {
    return autoInstallEnabled(await Deno.readTextFile(dotenvPath));
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return false;
    throw error;
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Line-based parse of a Codex `config.toml`: identifies every
 * `[plugins."<x>@<marketplace>"]` table, removes the header and ALL body
 * lines up to the next `[section]` header (or EOF), and reports the previous
 * `enabled` value for each table. Tolerates CRLF, trailing whitespace, inline
 * `# comments` on `enabled = …`, and tables with extra keys.
 *
 * Returned `stripped` text preserves all unrelated content. Runs of three or
 * more blank lines created by stripping are collapsed to one.
 */
export function parseAndStripFlowaiTables(
  configText: string,
  marketplaceName: string = MARKETPLACE_NAME,
): { stripped: string; previousEnabled: Map<string, boolean> } {
  const tableHeader = new RegExp(
    `^\\s*\\[plugins\\."([^"]*)@${
      escapeRegex(marketplaceName)
    }"\\]\\s*(?:#.*)?$`,
  );
  const sectionHeader = /^\s*\[/;
  const enabledLine = /^\s*enabled\s*=\s*(true|false)\b/;

  const normalized = configText.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");

  const previousEnabled = new Map<string, boolean>();
  const kept: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const header = lines[i].match(tableHeader);
    if (!header) {
      kept.push(lines[i]);
      i++;
      continue;
    }
    const name = header[1];
    let enabled = true;
    i++;
    while (i < lines.length && !sectionHeader.test(lines[i])) {
      const em = lines[i].match(enabledLine);
      if (em) enabled = em[1] === "true";
      i++;
    }
    previousEnabled.set(name, enabled);
  }

  // Collapse 3+ blank-line runs introduced by stripping back to one blank line.
  const collapsed: string[] = [];
  let blankRun = 0;
  for (const line of kept) {
    if (line.trim() === "") {
      blankRun++;
      if (blankRun <= 1) collapsed.push(line);
    } else {
      blankRun = 0;
      collapsed.push(line);
    }
  }

  return {
    stripped: collapsed.join("\n"),
    previousEnabled,
  };
}

/**
 * Reconcile flowai-plugins entries in a Codex `config.toml`:
 *   1. Strip every existing `[plugins."<x>@<marketplace>"]` table (any shape).
 *   2. Append one fresh 2-line table per emitted plugin, preserving the
 *      previous `enabled` value when present (default `true` for new ones).
 *
 * Throws when `emittedNames` is empty — that signals a broken upstream build
 * and silently wiping the user's plugin set would lose data.
 */
export function reconcileCodexFlowaiPluginEntries(
  configText: string,
  emittedNames: string[],
  marketplaceName: string = MARKETPLACE_NAME,
): string {
  if (emittedNames.length === 0) {
    throw new Error(
      "reconcileCodexFlowaiPluginEntries: refusing to reconcile with an empty " +
        "emittedNames set (upstream marketplace.json yielded no plugins).",
    );
  }
  const { stripped, previousEnabled } = parseAndStripFlowaiTables(
    configText,
    marketplaceName,
  );
  const trimmed = stripped.replace(/\n+$/, "");
  const blocks = emittedNames
    .map((name) => {
      const enabled = previousEnabled.get(name) ?? true;
      return `[plugins."${name}@${marketplaceName}"]\nenabled = ${enabled}\n`;
    })
    .join("\n");
  return `${trimmed}\n\n${blocks}`;
}

async function rewriteCodexPluginEntries(
  emittedNames: string[],
): Promise<void> {
  if (emittedNames.length === 0) {
    throw new Error(
      "rewriteCodexPluginEntries: no plugins emitted by local marketplace; " +
        "refusing to mutate config.toml.",
    );
  }
  const home = Deno.env.get("CODEX_HOME") ?? `${Deno.env.get("HOME")}/.codex`;
  const configPath = `${home}/config.toml`;
  let original: string;
  try {
    original = await Deno.readTextFile(configPath);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.log(
        `[sync-plugins-local] ${configPath} does not exist; nothing to reconcile.`,
      );
      return;
    }
    throw error;
  }
  const next = reconcileCodexFlowaiPluginEntries(original, emittedNames);
  if (next === original) return;
  await Deno.writeTextFile(configPath, next);
  console.log(
    `[sync-plugins-local] Reconciled ${emittedNames.length} flowai plugin entries in ${configPath}`,
  );
}

type CommandOutput = {
  success: boolean;
  code: number;
  stdout: string;
  stderr: string;
};

type ClaudePluginListEntry = {
  id?: unknown;
  scope?: unknown;
  enabled?: unknown;
};

export type ClaudeActionPlan = {
  /**
   * Plugins to (re)install at user scope. After `marketplace remove`,
   * `claude plugin update` reports the plugin as "not installed" — we
   * therefore route every plugin the user had enabled (plus brand-new
   * ones) through `claude plugin install`, which is idempotent.
   */
  install: string[];
  /**
   * Plugins the user previously installed at user scope but explicitly
   * disabled (`enabled = false`). We do NOT re-enable them — leave the
   * mute choice intact by not installing.
   */
  skipped: string[];
};

function decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

async function runCaptured(
  cmd: string,
  args: string[],
): Promise<CommandOutput> {
  const output = await new Deno.Command(cmd, {
    args,
    stdin: "null",
    stdout: "piped",
    stderr: "piped",
  }).output();
  return {
    success: output.success,
    code: output.code,
    stdout: decode(output.stdout),
    stderr: decode(output.stderr),
  };
}

async function runInherited(cmd: string, args: string[]): Promise<void> {
  const status = await new Deno.Command(cmd, {
    args,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  }).spawn().status;
  if (!status.success) {
    throw new Error(
      `Command failed (${status.code ?? 1}): ${cmd} ${args.join(" ")}`,
    );
  }
}

async function runInheritedAllowFail(
  cmd: string,
  args: string[],
): Promise<boolean> {
  const status = await new Deno.Command(cmd, {
    args,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  }).spawn().status;
  return status.success;
}

async function commandAvailable(cmd: string): Promise<boolean> {
  try {
    const output = await new Deno.Command(cmd, {
      args: ["--version"],
      stdin: "null",
      stdout: "null",
      stderr: "null",
    }).output();
    return output.success;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return false;
    throw error;
  }
}

/**
 * Codex 0.130+ exposes `codex plugin marketplace`; older builds don't. Probe
 * the help text so we can warn + skip on older Codex without a hard abort.
 */
async function codexMarketplaceSubcommandAvailable(): Promise<boolean> {
  const result = await runCaptured("codex", [
    "plugin",
    "marketplace",
    "--help",
  ]);
  return result.success;
}

/**
 * Reads the emitted marketplace.json and returns the plugin names that the
 * local build advertises. Order: alphabetical (mirrors `build-plugins.ts`).
 */
export function readMarketplacePluginNames(marketplaceJson: string): string[] {
  const parsed = JSON.parse(marketplaceJson) as unknown;
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !Array.isArray((parsed as { plugins?: unknown }).plugins)
  ) {
    throw new Error(
      "Local marketplace.json is missing a top-level `plugins` array.",
    );
  }
  const plugins = (parsed as { plugins: unknown[] }).plugins;
  const names: string[] = [];
  for (const entry of plugins) {
    if (
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as { name?: unknown }).name === "string"
    ) {
      names.push((entry as { name: string }).name);
    }
  }
  if (names.length === 0) {
    throw new Error(
      "Local marketplace.json declares zero plugins; refusing to proceed " +
        "(the build emitted nothing — refusing to mutate IDE state).",
    );
  }
  return [...new Set(names)].sort();
}

/**
 * Plans `claude plugin install` calls for a fresh marketplace registration.
 *
 * Why install-only, no update bucket: `claude plugin marketplace remove`
 * detaches every plugin from that marketplace, so a subsequent
 * `claude plugin update <id>` reports "Plugin not installed" and aborts.
 * After re-adding the marketplace we therefore call `plugin install` for
 * every plugin the user wants — which is idempotent. The only exception
 * is plugins the user previously DISABLED at user scope: we leave them
 * alone to preserve the mute choice.
 *
 * `installedBeforeRemove` must be captured BEFORE `marketplace remove` —
 * after the remove, the listing has no flowai-plugins entries and the
 * disabled set would be lost.
 */
export function planClaudeActions(
  emittedNames: string[],
  installedBeforeRemove: ClaudePluginListEntry[],
  marketplace: string = MARKETPLACE_NAME,
): ClaudeActionPlan {
  const disabledIds = new Set<string>();
  for (const entry of installedBeforeRemove) {
    if (typeof entry.id !== "string" || entry.scope !== "user") continue;
    if (entry.enabled === false) disabledIds.add(entry.id);
  }
  const install: string[] = [];
  const skipped: string[] = [];
  for (const name of emittedNames) {
    const id = `${name}@${marketplace}`;
    if (disabledIds.has(id)) skipped.push(id);
    else install.push(id);
  }
  return { install, skipped };
}

async function readClaudePluginList(): Promise<ClaudePluginListEntry[]> {
  const result = await runCaptured("claude", ["plugin", "list", "--json"]);
  if (!result.success) {
    throw new Error(
      `Failed to list Claude Code plugins (${result.code}): ${
        result.stderr.trim() || result.stdout.trim()
      }`,
    );
  }
  const parsed = JSON.parse(result.stdout) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Claude Code plugin list returned non-array JSON.");
  }
  return parsed as ClaudePluginListEntry[];
}

/**
 * Pure path resolver: returns the on-disk path Codex uses to cache a local
 * marketplace's payload (`<CODEX_HOME>/plugins/cache/<marketplace>`). Honours
 * `CODEX_HOME`; falls back to `<HOME>/.codex`. Exported for unit tests so the
 * cache-wipe behaviour stays env-aware without spying on FS calls.
 */
export function codexCachePathFor(
  marketplaceName: string,
  env: { codexHome?: string; home?: string },
): string {
  const root = env.codexHome ?? `${env.home ?? ""}/.codex`;
  return join(root, "plugins", "cache", marketplaceName);
}

/**
 * Migration guard for pre-split dogfood installs. Older local syncs registered
 * this repo's dist under `flowai-plugins`; Codex keeps that payload cache even
 * after the marketplace is removed. Wipe that legacy cache only when the legacy
 * marketplace is absent or still points at the same local dist. A real upstream
 * `flowai-plugins` marketplace is left untouched.
 */
export function shouldWipeLegacyCodexCache(
  configText: string,
  legacyMarketplaceName: string,
  currentLocalSource: string,
): boolean {
  const header = new RegExp(
    `^\\s*\\[marketplaces\\.(?:"${escapeRegex(legacyMarketplaceName)}"|${
      escapeRegex(legacyMarketplaceName)
    })\\]\\s*(?:#.*)?$`,
  );
  const sectionHeader = /^\s*\[/;
  const sourceTypeLine = /^\s*source_type\s*=\s*["']([^"']*)["']/;
  const sourceLine = /^\s*source\s*=\s*["']([^"']*)["']/;

  let inSection = false;
  let found = false;
  let sourceType: string | undefined;
  let source: string | undefined;
  for (const line of configText.replace(/\r\n/g, "\n").split("\n")) {
    if (sectionHeader.test(line)) {
      if (inSection) break;
      if (header.test(line)) {
        inSection = true;
        found = true;
      }
      continue;
    }
    if (!inSection) continue;
    sourceType = sourceType ?? line.match(sourceTypeLine)?.[1];
    source = source ?? line.match(sourceLine)?.[1];
  }

  if (!found) return true;
  return source === currentLocalSource &&
    (sourceType === undefined || sourceType === "local");
}

/**
 * Pure check: given the parsed catalog JSON, returns null when its top-level
 * `name` matches the expected dogfood namespace, otherwise an error message
 * tailored for `--no-build`'s precondition failure. Exported for unit tests.
 */
export function validateCatalogMarketplaceName(
  catalogJson: string,
  expected: string,
  outDir: string,
): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(catalogJson);
  } catch (error) {
    return `Failed to parse ${outDir}/.claude-plugin/marketplace.json: ${
      error instanceof Error ? error.message : String(error)
    }`;
  }
  const name = (parsed as { name?: unknown }).name;
  if (name === expected) return null;
  return `${outDir}/.claude-plugin/marketplace.json carries name=${
    JSON.stringify(name)
  }, expected ${JSON.stringify(expected)}. ` +
    `Rebuild with \`deno run -A scripts/build-plugins.ts --marketplace-name ${expected} --out ${outDir}\` or drop --no-build.`;
}

async function ensureBuild(outDir: string, skipBuild: boolean): Promise<void> {
  if (skipBuild) {
    const stat = await Deno.stat(outDir).catch(() => null);
    if (!stat || !stat.isDirectory) {
      throw new Error(
        `--no-build was set but ${outDir} does not exist. Run \`deno task build-plugins\` first.`,
      );
    }
    // Fail-fast: catalog must already carry the dogfood marketplace name.
    // Otherwise `claude marketplace add <abs>` would register under the WRONG
    // namespace and silently overwrite upstream state.
    const catalogPath = join(outDir, ".claude-plugin", "marketplace.json");
    const catalogJson = await Deno.readTextFile(catalogPath);
    const err = validateCatalogMarketplaceName(
      catalogJson,
      MARKETPLACE_NAME,
      outDir,
    );
    if (err !== null) throw new Error(err);
    return;
  }
  // Regenerate composite SKILL.md atoms first. When `sync-plugins-local`
  // runs standalone (no preceding `deno task check`) composites could be
  // stale; the build below reads SKILL.md from disk. Idempotent, ~200ms.
  // Mirrors the wrapper-level call in `build-plugins.ts` we bypass via the
  // in-process API.
  await runInherited("deno", [
    "run",
    "-A",
    "scripts/generate-skill-composites.ts",
    "--write",
  ]);
  console.log(`[sync-plugins-local] Building plugin marketplace at ${outDir}`);
  await buildPlugins({
    packs: [...DEFAULT_PACKS],
    frameworkDir: resolve("framework"),
    outDir,
    marketplaceName: MARKETPLACE_NAME,
  });
}

async function syncClaude(absoluteOutDir: string): Promise<void> {
  if (!(await commandAvailable("claude"))) {
    console.log(
      "[sync-plugins-local] `claude` CLI not found in PATH; skipping Claude Code sync.",
    );
    return;
  }
  // Capture installed state BEFORE removing the marketplace — marketplace
  // remove drops entries from `claude plugin list`, which would mis-route
  // every plugin to `install` and erase the user's per-plugin enabled state.
  const installedBefore = await readClaudePluginList();

  console.log(
    `[sync-plugins-local] Re-pointing Claude marketplace ${MARKETPLACE_NAME} at ${absoluteOutDir}`,
  );
  await runInheritedAllowFail("claude", [
    "plugin",
    "marketplace",
    "remove",
    MARKETPLACE_NAME,
  ]);
  await runInherited("claude", [
    "plugin",
    "marketplace",
    "add",
    absoluteOutDir,
  ]);

  const marketplaceJson = await Deno.readTextFile(
    join(absoluteOutDir, ".claude-plugin", "marketplace.json"),
  );
  const emitted = readMarketplacePluginNames(marketplaceJson);
  const plan = planClaudeActions(emitted, installedBefore);

  for (const id of plan.install) {
    console.log(`[sync-plugins-local] Installing Claude Code ${id}`);
    await runInherited("claude", [
      "plugin",
      "install",
      id,
      "--scope",
      "user",
    ]);
  }
  for (const id of plan.skipped) {
    console.log(
      `[sync-plugins-local] Skipping disabled Claude Code plugin ${id} (preserved as enabled=false)`,
    );
  }
}

async function syncCodex(absoluteOutDir: string): Promise<void> {
  if (!(await commandAvailable("codex"))) {
    console.log(
      "[sync-plugins-local] `codex` CLI not found in PATH; skipping Codex sync.",
    );
    return;
  }
  if (!(await codexMarketplaceSubcommandAvailable())) {
    console.log(
      "[sync-plugins-local] Installed Codex CLI lacks `plugin marketplace` subcommand; " +
        "skipping Codex sync (upgrade Codex CLI to >=0.130 to enable).",
    );
    return;
  }
  console.log(
    `[sync-plugins-local] Re-pointing Codex marketplace ${MARKETPLACE_NAME} at ${absoluteOutDir}`,
  );
  await runInheritedAllowFail("codex", [
    "plugin",
    "marketplace",
    "remove",
    MARKETPLACE_NAME,
  ]);
  // Codex caches the marketplace payload at
  // `<CODEX_HOME>/plugins/cache/<marketplace>/<plugin>/<version>/` on
  // `marketplace add` and skips re-copying when that path already exists.
  // Dist rebuilds with the same version (every dogfood iteration that does
  // not bump deno.json) would otherwise leave the user pinned to whatever
  // was in cache at first add. `marketplace upgrade` only works for
  // git-source marketplaces, so for local sources we wipe the cache dir
  // ourselves to force Codex to repopulate it. NotFound = first-ever sync,
  // safe to ignore.
  const codexEnv = {
    codexHome: Deno.env.get("CODEX_HOME"),
    home: Deno.env.get("HOME"),
  };
  const cacheDir = codexCachePathFor(MARKETPLACE_NAME, {
    codexHome: codexEnv.codexHome,
    home: codexEnv.home,
  });
  console.log(`[sync-plugins-local] Wiping Codex payload cache at ${cacheDir}`);
  await Deno.remove(cacheDir, { recursive: true }).catch((error) => {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
  });
  const codexHome = codexEnv.codexHome ?? `${codexEnv.home}/.codex`;
  const configText = await Deno.readTextFile(join(codexHome, "config.toml"))
    .catch((error) => {
      if (error instanceof Deno.errors.NotFound) return "";
      throw error;
    });
  if (
    shouldWipeLegacyCodexCache(
      configText,
      LEGACY_MARKETPLACE_NAME,
      absoluteOutDir,
    )
  ) {
    const legacyCacheDir = codexCachePathFor(LEGACY_MARKETPLACE_NAME, codexEnv);
    console.log(
      `[sync-plugins-local] Wiping legacy Codex payload cache at ${legacyCacheDir}`,
    );
    await Deno.remove(legacyCacheDir, { recursive: true }).catch((error) => {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
    });
  }
  await runInherited("codex", [
    "plugin",
    "marketplace",
    "add",
    absoluteOutDir,
  ]);

  // Plugin names match across Claude/Codex catalogs; reading the Claude one
  // avoids parsing the Codex source-shape twice.
  const marketplaceJson = await Deno.readTextFile(
    join(absoluteOutDir, ".claude-plugin", "marketplace.json"),
  );
  const emitted = readMarketplacePluginNames(marketplaceJson);
  await rewriteCodexPluginEntries(emitted);
}

/**
 * Fail-fast arg parser: a flag that requires a value must be followed by a
 * non-flag token. Missing values surface as errors instead of being silently
 * swallowed into a default.
 */
export function parseArgs(
  argv: string[],
): { outDir: string; skipBuild: boolean } {
  let outDir = DEFAULT_OUT_DIR;
  let skipBuild = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--out") {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error(
          `--out requires a directory argument (got ${
            value === undefined ? "end-of-args" : `"${value}"`
          }).`,
        );
      }
      outDir = value;
      i++;
    } else if (arg === "--no-build") {
      skipBuild = true;
    } else if (arg === "-h" || arg === "--help") {
      console.log(
        "Usage: sync-plugins-local.ts [--out <dir>] [--no-build]\n" +
          "  --out <dir>   Output dir for the local marketplace (default: ./dist/claude-plugins)\n" +
          "  --no-build    Skip the build step (use an existing dist).",
      );
      Deno.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return { outDir, skipBuild };
}

async function main(): Promise<void> {
  const { outDir, skipBuild } = parseArgs(Deno.args);
  await ensureBuild(outDir, skipBuild);
  const absoluteOutDir = isAbsolute(outDir) ? outDir : resolve(outDir);
  await syncClaude(absoluteOutDir);
  await syncCodex(absoluteOutDir);
  console.log("[sync-plugins-local] Done.");
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    Deno.exit(1);
  }
}
