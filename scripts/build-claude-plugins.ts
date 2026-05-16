#!/usr/bin/env -S deno run -A
// implements [FR-DIST.MARKETPLACE](../documents/requirements.md#fr-dist.marketplace-claude-code-plugin-marketplace-pilot)
// Build a Claude-Code-native plugin tree from framework/<pack>/.
//
// Reads `framework/<pack>/{pack.yaml,commands,skills,agents,hooks,assets}` and
// emits a plugin-shaped tree at `--out`:
//
//   <out>/.claude-plugin/marketplace.json
//   <out>/plugins/flowai-<pack>/.claude-plugin/plugin.json
//   <out>/plugins/flowai-<pack>/skills/<stripped-name>/SKILL.md     (+ subdirs, + per-skill assets/)
//   <out>/plugins/flowai-<pack>/agents/<name>.md
//   <out>/plugins/flowai-<pack>/hooks/hooks.json                    (if any hooks)
//   <out>/plugins/flowai-<pack>/hooks/<name>/run.ts                 (per hook)
//
// Transform passes (in order):
//   (a) scope filter — drop primitives with `scope: project-only`.
//   (b) emit skills + commands; commands get disable-model-invocation injected.
//   (c) asset copy + path rewrite — pack-level `assets/*` referenced by SKILL.md
//       is copied INTO the consuming skill's own dir, paths rewritten to local.
//   (d) flowai-init fence strip — block between
//       `<!-- begin: cli-only-skill-update -->` and `<!-- end: cli-only-skill-update -->`
//       is removed during plugin emit.
//   (e) cross-skill slash rewrite — `/flowai-foo` → `/flowai-<pack>:foo`.
//   (f) version inject — read upstream deno.json `.version`, inject into
//       plugin.json AND marketplace entry.
//   (g) tag union — collect SKILL.md `tags:` arrays, dedupe + sort + cap 8,
//       inject into marketplace plugin entry only.
//   (h) hook transform — `framework/<pack>/hooks/<name>/{hook.yaml,run.ts}` →
//       `hooks/hooks.json` + per-hook run.ts copy.

import { join, relative } from "@std/path";
import { copy, ensureDir, exists } from "@std/fs";
import { parse as parseYaml, stringify as stringifyYaml } from "@std/yaml";

export const DEFAULT_MARKETPLACE_NAME = "flowai-plugins";
const DEFAULT_OWNER_NAME = "korchasa";
const DEFAULT_REPO = "https://github.com/korchasa/flowai";
const DEFAULT_HOMEPAGE =
  "https://github.com/korchasa/flowai#claude-code-plugin-marketplace";
const DEFAULT_KEYWORDS = ["ai", "workflow", "framework", "assistflow"];
const DEFAULT_CATEGORY = "development-workflows";
const MAX_TAGS_PER_PLUGIN = 8;

const CLI_ONLY_FENCE_RE =
  /<!--\s*begin:\s*cli-only-skill-update\s*-->[\s\S]*?<!--\s*end:\s*cli-only-skill-update\s*-->\n?/g;

const CLAUDE_AGENT_KEEP = new Set([
  "name",
  "description",
  "tools",
  "disallowedTools",
  "model",
  "effort",
  "maxTurns",
  "background",
  "isolation",
  "color",
]);
const CLAUDE_AGENT_KEY_ORDER = [
  "name",
  "description",
  "tools",
  "disallowedTools",
  "model",
  "effort",
  "maxTurns",
  "background",
  "isolation",
  "color",
];

const SKILL_KEY_ORDER = [
  "name",
  "description",
  "disable-model-invocation",
  "argument-hint",
  "allowed-tools",
  "model",
  "effort",
  "license",
  "scope",
];

export type ModelTier = "max" | "smart" | "fast" | "cheap" | "inherit";

export function resolveModelTier(
  tier: string | undefined,
): string | undefined {
  switch (tier) {
    case "max":
      return "opus";
    case "smart":
      return "sonnet";
    case "fast":
      return "haiku";
    case "cheap":
      return "haiku";
    case "inherit":
    case undefined:
      return undefined;
    default:
      return tier;
  }
}

export interface BuildOptions {
  packs: string[];
  frameworkDir: string;
  outDir: string;
  marketplaceName?: string;
  ownerName?: string;
  /**
   * Optional override for the version injected into plugin.json + marketplace
   * entries. Defaults to reading `<frameworkDir>/../deno.json` `.version`.
   */
  version?: string;
}

export async function buildClaudePlugins(opts: BuildOptions): Promise<void> {
  const marketplaceName = opts.marketplaceName ?? DEFAULT_MARKETPLACE_NAME;
  const ownerName = opts.ownerName ?? DEFAULT_OWNER_NAME;
  const version = opts.version ?? await readUpstreamVersion(opts.frameworkDir);

  await Deno.remove(opts.outDir, { recursive: true }).catch(() => {});
  await ensureDir(opts.outDir);

  const pluginEntries: Array<Record<string, unknown>> = [];
  for (const packName of opts.packs.slice().sort()) {
    const packDir = join(opts.frameworkDir, packName);
    if (!(await exists(packDir))) {
      throw new Error(`pack not found: ${packDir}`);
    }
    const entry = await buildPack({
      packName,
      packDir,
      outDir: opts.outDir,
      version,
    });
    pluginEntries.push(entry);
  }

  const marketplace: Record<string, unknown> = {
    name: marketplaceName,
    owner: { name: ownerName },
    description: "AssistFlow framework — Claude Code plugin marketplace",
    plugins: pluginEntries,
  };
  await ensureDir(join(opts.outDir, ".claude-plugin"));
  await Deno.writeTextFile(
    join(opts.outDir, ".claude-plugin", "marketplace.json"),
    JSON.stringify(marketplace, null, 2) + "\n",
  );
}

async function readUpstreamVersion(frameworkDir: string): Promise<string> {
  const denoJsonPath = join(frameworkDir, "..", "deno.json");
  const raw = await Deno.readTextFile(denoJsonPath);
  const parsed = JSON.parse(raw) as { version?: unknown };
  if (typeof parsed.version !== "string" || parsed.version.length === 0) {
    throw new Error(
      `upstream deno.json at ${denoJsonPath} has no .version string`,
    );
  }
  return parsed.version;
}

interface PackContext {
  packName: string;
  packDir: string;
  outDir: string;
  version: string;
}

async function buildPack(
  ctx: PackContext,
): Promise<Record<string, unknown>> {
  const pluginName = `flowai-${ctx.packName}`;
  const pluginRoot = join(ctx.outDir, "plugins", pluginName);
  await ensureDir(pluginRoot);

  const packYamlPath = join(ctx.packDir, "pack.yaml");
  const packManifest = parseYaml(
    await Deno.readTextFile(packYamlPath),
  ) as Record<string, unknown>;
  const description = String(
    packManifest.description ?? `flowai ${ctx.packName} pack`,
  );

  const collectedTags = new Set<string>();
  const slashRewriter = makeSlashRewriter(pluginName);

  await emitPrimitives({
    sourceDir: join(ctx.packDir, "commands"),
    outDir: join(pluginRoot, "skills"),
    kind: "command",
    packDir: ctx.packDir,
    collectedTags,
    slashRewriter,
  });
  await emitPrimitives({
    sourceDir: join(ctx.packDir, "skills"),
    outDir: join(pluginRoot, "skills"),
    kind: "skill",
    packDir: ctx.packDir,
    collectedTags,
    slashRewriter,
  });
  await emitAgents({
    sourceDir: join(ctx.packDir, "agents"),
    outDir: join(pluginRoot, "agents"),
  });
  await emitHooks({
    sourceDir: join(ctx.packDir, "hooks"),
    outDir: join(pluginRoot, "hooks"),
  });

  const license = await readLicenseId(ctx.packDir).catch(() => undefined);
  const plugin: Record<string, unknown> = {
    name: pluginName,
    description,
    version: ctx.version,
    author: { name: DEFAULT_OWNER_NAME },
    repository: DEFAULT_REPO,
    homepage: DEFAULT_HOMEPAGE,
  };
  if (license) plugin.license = license;
  await ensureDir(join(pluginRoot, ".claude-plugin"));
  await Deno.writeTextFile(
    join(pluginRoot, ".claude-plugin", "plugin.json"),
    JSON.stringify(plugin, null, 2) + "\n",
  );

  const entry: Record<string, unknown> = {
    name: pluginName,
    source: `./plugins/${pluginName}`,
    description,
    version: ctx.version,
    keywords: DEFAULT_KEYWORDS,
    category: DEFAULT_CATEGORY,
  };
  if (collectedTags.size > 0) {
    entry.tags = Array.from(collectedTags).sort().slice(0, MAX_TAGS_PER_PLUGIN);
  }
  return entry;
}

interface EmitPrimitivesOpts {
  sourceDir: string;
  outDir: string;
  kind: "command" | "skill";
  packDir: string;
  collectedTags: Set<string>;
  slashRewriter: (text: string) => string;
}

async function emitPrimitives(opts: EmitPrimitivesOpts): Promise<void> {
  if (!(await exists(opts.sourceDir))) return;
  await ensureDir(opts.outDir);

  const entries: string[] = [];
  for await (const e of Deno.readDir(opts.sourceDir)) {
    if (e.isDirectory) entries.push(e.name);
  }
  entries.sort();

  for (const srcName of entries) {
    const srcPath = join(opts.sourceDir, srcName);
    const skillFile = join(srcPath, "SKILL.md");
    if (!(await exists(skillFile))) {
      throw new Error(`missing SKILL.md in ${srcPath}`);
    }

    // (a) Scope filter — skip project-only primitives entirely.
    const sourceText = await Deno.readTextFile(skillFile);
    const m = sourceText.match(/^---\n([\s\S]*?)\n---\n?/);
    if (!m) throw new Error(`missing frontmatter in ${skillFile}`);
    const rawFm = m[1];
    const fmPeek = parseYaml(rawFm) as Record<string, unknown>;
    if (fmPeek.scope === "project-only") {
      console.error(`skipped (project-only): ${srcName}`);
      continue;
    }

    const stripped = stripFlowaiPrefix(srcName);
    const dstDir = join(opts.outDir, stripped);
    await ensureDir(dstDir);

    for await (const child of Deno.readDir(srcPath)) {
      if (child.name === "SKILL.md") continue;
      if (child.name === "acceptance-tests") continue;
      const childSrc = join(srcPath, child.name);
      const childDst = join(dstDir, child.name);
      await copy(childSrc, childDst, { overwrite: true });
    }

    const transformed = transformSkillFile(sourceText, {
      kind: opts.kind,
      sourceFile: skillFile,
      slashRewriter: opts.slashRewriter,
      collectedTags: opts.collectedTags,
    });

    // (c) Copy pack-level assets referenced by this skill into its own dir,
    // then rewrite the body to use local relative paths.
    const finalText = await copyReferencedAssets({
      skillText: transformed,
      skillFile,
      packDir: opts.packDir,
      dstDir,
    });

    await Deno.writeTextFile(join(dstDir, "SKILL.md"), finalText);
  }
}

function stripFlowaiPrefix(name: string): string {
  return name.startsWith("flowai-") ? name.slice("flowai-".length) : name;
}

interface TransformSkillCtx {
  kind: "command" | "skill";
  sourceFile: string;
  slashRewriter: (text: string) => string;
  collectedTags: Set<string>;
}

function transformSkillFile(
  text: string,
  ctx: TransformSkillCtx,
): string {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) {
    throw new Error(`missing frontmatter in ${ctx.sourceFile}`);
  }
  const rawFm = m[1];
  const body = text.slice(m[0].length);
  const fm = parseYaml(rawFm) as Record<string, unknown>;

  if (ctx.kind === "command" && "disable-model-invocation" in fm) {
    throw new Error(
      `FR-PACKS.CMD-INVARIANT violated: ${ctx.sourceFile} carries disable-model-invocation in source. ` +
        `Commands must rely on writer injection.`,
    );
  }
  if (ctx.kind === "skill" && "disable-model-invocation" in fm) {
    throw new Error(
      `FR-PACKS.SKILL-INVARIANT violated: ${ctx.sourceFile} carries disable-model-invocation. ` +
        `Move the primitive under commands/ if it is user-only.`,
    );
  }

  if (ctx.kind === "command") {
    fm["disable-model-invocation"] = true;
  }

  if (typeof fm.model === "string") {
    const resolved = resolveModelTier(fm.model);
    if (resolved === undefined) delete fm.model;
    else fm.model = resolved;
  }

  // (g) Collect tags for the marketplace entry, then drop from frontmatter —
  // tags belong only on the marketplace entry per claude plugin validate.
  if (Array.isArray(fm.tags)) {
    for (const t of fm.tags) {
      if (typeof t === "string" && t.length > 0) ctx.collectedTags.add(t);
    }
    delete fm.tags;
  }

  const orderedFm = orderObjectKeys(fm, SKILL_KEY_ORDER);
  const yaml = stringifyYaml(orderedFm).trimEnd();

  // (d) Strip CLI-only fenced blocks before any other body transform.
  let processedBody = body.replace(CLI_ONLY_FENCE_RE, "");

  // (e) Rewrite cross-skill slash invocations.
  processedBody = ctx.slashRewriter(processedBody);

  return `---\n${yaml}\n---\n${processedBody}`;
}

/**
 * Rewrites `/flowai-foo` → `/flowai-<pack>:foo` in skill bodies.
 *
 * The replacement is idempotent: `/flowai-core:commit` does not match because
 * the trailing `:` is not part of the captured suffix and the `\b` after the
 * suffix would still match — but the second pass would produce
 * `/flowai-<pack>:core:commit` which is wrong. To stay idempotent we explicitly
 * skip occurrences that already contain `:` immediately after the suffix.
 */
function makeSlashRewriter(pluginName: string): (text: string) => string {
  // Match /flowai-<name> followed by NOT-`:` (so already-rewritten invocations
  // like /flowai-core:commit are left alone — the negative lookahead on `:`
  // ensures idempotency).
  const re = /\/flowai-([a-z0-9][a-z0-9-]*)(?![a-z0-9-:])/g;
  return (text: string) =>
    text.replace(re, (match, suffix: string) => {
      // Defensive: do not rewrite when the captured suffix already starts with
      // the pack name + `:` separator (cannot happen with the lookahead, but
      // makes the intent explicit).
      if (match.includes(":")) return match;
      return `/${pluginName}:${suffix}`;
    });
}

function orderObjectKeys(
  obj: Record<string, unknown>,
  preferredOrder: string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of preferredOrder) {
    if (k in obj) out[k] = obj[k];
  }
  for (const k of Object.keys(obj)) {
    if (!(k in out)) out[k] = obj[k];
  }
  return out;
}

interface CopyAssetsOpts {
  skillText: string;
  skillFile: string;
  packDir: string;
  dstDir: string;
}

/**
 * Finds `assets/<name>` references in the skill body and copies the matching
 * pack-level file to `<dstDir>/assets/<name>`. The skill text is left intact
 * apart from collapsing leading `../`-prefixed paths to the local form, so
 * sentences like "Read template file from `../../assets/AGENTS.template.md`"
 * become "Read template file from `assets/AGENTS.template.md`".
 */
async function copyReferencedAssets(
  opts: CopyAssetsOpts,
): Promise<string> {
  const packAssetsDir = join(opts.packDir, "assets");
  const packAssetsExist = await exists(packAssetsDir);

  // Catch all references of the form `assets/<file>` even when prefixed by
  // `../` or `../../`. Files cited inside frontmatter `description:` are part
  // of skillText because we re-emit the frontmatter unchanged.
  const refRe = /(?:\.\.\/)*assets\/([A-Za-z0-9_.-]+)/g;
  const referenced = new Set<string>();
  for (const m of opts.skillText.matchAll(refRe)) {
    referenced.add(m[1]);
  }

  if (packAssetsExist && referenced.size > 0) {
    const localAssetsDir = join(opts.dstDir, "assets");
    await ensureDir(localAssetsDir);
    for (const name of referenced) {
      const srcAsset = join(packAssetsDir, name);
      if (!(await exists(srcAsset))) {
        throw new Error(
          `asset reference not found: ${name} referenced by ${opts.skillFile}`,
        );
      }
      await copy(srcAsset, join(localAssetsDir, name), { overwrite: true });
    }
  }

  // Rewrite leading `../` prefixes so paths become local to the skill. Done
  // for file references AND bare directory references — both can appear in
  // doc-like sentences such as "Read templates from `../../assets/`".
  const withFilesRewritten = opts.skillText.replace(
    refRe,
    (_match, file: string) => `assets/${file}`,
  );
  return withFilesRewritten.replace(
    /(?:\.\.\/)+assets(\/|\b)/g,
    "assets$1",
  );
}

interface EmitAgentsOpts {
  sourceDir: string;
  outDir: string;
}

async function emitAgents(opts: EmitAgentsOpts): Promise<void> {
  if (!(await exists(opts.sourceDir))) return;
  await ensureDir(opts.outDir);

  const entries: string[] = [];
  for await (const e of Deno.readDir(opts.sourceDir)) {
    if (e.isFile && e.name.endsWith(".md")) entries.push(e.name);
  }
  entries.sort();

  for (const name of entries) {
    const srcPath = join(opts.sourceDir, name);
    const text = await Deno.readTextFile(srcPath);
    const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
    if (!m) {
      throw new Error(`agent ${srcPath} has no frontmatter`);
    }
    const rawFm = m[1];
    const body = text.slice(m[0].length);
    const fm = parseYaml(rawFm) as Record<string, unknown>;
    const transformed = transformAgentFrontmatter(fm);
    const ordered = orderObjectKeys(transformed, CLAUDE_AGENT_KEY_ORDER);
    const yaml = stringifyYaml(ordered).trimEnd();
    await Deno.writeTextFile(
      join(opts.outDir, name),
      `---\n${yaml}\n---\n${body}`,
    );
  }
}

/**
 * Universal agent frontmatter → Claude-native subset.
 */
export function transformAgentFrontmatter(
  src: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(src)) {
    if (!CLAUDE_AGENT_KEEP.has(k)) continue;
    out[k] = v;
  }
  if (typeof out.model === "string") {
    const resolved = resolveModelTier(out.model);
    if (resolved === undefined) delete out.model;
    else out.model = resolved;
  }
  return out;
}

interface EmitHooksOpts {
  sourceDir: string;
  outDir: string;
}

/**
 * Translates `framework/<pack>/hooks/<name>/{hook.yaml,run.ts}` into Claude
 * plugin hooks/hooks.json. Per Claude Code plugin docs hooks/hooks.json holds
 *   { hooks: { <EventName>: [{ matcher, hooks: [{ type: "command", command }] }] } }
 * The `command` field shells `deno run -A ${CLAUDE_PLUGIN_ROOT}/hooks/<name>/run.ts`.
 *
 * Core has zero hooks today; the code path exists for devtools / memex rollout.
 */
async function emitHooks(opts: EmitHooksOpts): Promise<void> {
  if (!(await exists(opts.sourceDir))) return;

  const hookDirs: string[] = [];
  for await (const e of Deno.readDir(opts.sourceDir)) {
    if (e.isDirectory) hookDirs.push(e.name);
  }
  if (hookDirs.length === 0) return;
  hookDirs.sort();

  await ensureDir(opts.outDir);
  const eventBuckets: Record<
    string,
    Array<
      {
        matcher: string;
        hooks: Array<{ type: "command"; command: string; timeout?: number }>;
      }
    >
  > = {};

  for (const hookName of hookDirs) {
    const hookDir = join(opts.sourceDir, hookName);
    const yamlPath = join(hookDir, "hook.yaml");
    if (!(await exists(yamlPath))) {
      throw new Error(`hook missing hook.yaml: ${hookDir}`);
    }
    const meta = parseYaml(await Deno.readTextFile(yamlPath)) as Record<
      string,
      unknown
    >;
    const event = typeof meta.event === "string" ? meta.event : "";
    const matcher = typeof meta.matcher === "string" ? meta.matcher : "";
    const timeout = typeof meta.timeout === "number" ? meta.timeout : undefined;
    if (event === "") {
      throw new Error(`hook ${hookDir}: hook.yaml missing 'event'`);
    }

    const runSrc = join(hookDir, "run.ts");
    if (!(await exists(runSrc))) {
      throw new Error(`hook ${hookDir}: run.ts missing`);
    }
    await ensureDir(join(opts.outDir, hookName));
    await Deno.copyFile(runSrc, join(opts.outDir, hookName, "run.ts"));

    const command =
      `deno run -A \${CLAUDE_PLUGIN_ROOT}/hooks/${hookName}/run.ts`;
    const hookSpec: {
      type: "command";
      command: string;
      timeout?: number;
    } = { type: "command", command };
    if (timeout !== undefined) hookSpec.timeout = timeout;

    if (!eventBuckets[event]) eventBuckets[event] = [];
    eventBuckets[event].push({ matcher, hooks: [hookSpec] });
  }

  // Stable key order: sort event names so the output is byte-deterministic.
  const sortedEvents: Record<string, unknown> = {};
  for (const ev of Object.keys(eventBuckets).sort()) {
    sortedEvents[ev] = eventBuckets[ev];
  }
  await Deno.writeTextFile(
    join(opts.outDir, "hooks.json"),
    JSON.stringify({ hooks: sortedEvents }, null, 2) + "\n",
  );
}

async function readLicenseId(packDir: string): Promise<string | undefined> {
  let dir = packDir;
  for (let i = 0; i < 6; i++) {
    const license = join(dir, "LICENSE");
    if (await exists(license)) {
      const first = (await Deno.readTextFile(license)).split("\n")[0]
        .toLowerCase();
      if (first.includes("mit")) return "MIT";
      if (first.includes("apache")) return "Apache-2.0";
      return undefined;
    }
    const denoJson = join(dir, "deno.json");
    if (await exists(denoJson)) {
      const dj = JSON.parse(await Deno.readTextFile(denoJson));
      if (typeof dj.license === "string") return dj.license;
    }
    const parent = join(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return undefined;
}

// --- CLI entry ---

if (import.meta.main) {
  const flags = parseFlags(Deno.args);
  const cwd = Deno.cwd();
  const frameworkDir = flags.framework ?? join(cwd, "framework");
  const outDir = flags.out ?? join(cwd, "dist", "claude-plugins");
  const packs = flags.packs.length === 0 ? ["core"] : flags.packs;

  await buildClaudePlugins({
    packs,
    frameworkDir,
    outDir,
    marketplaceName: flags.marketplaceName,
  });

  const rel = relative(cwd, outDir);
  console.log(
    `Built Claude Code plugin marketplace at ${rel} (packs: ${
      packs.join(", ")
    }).`,
  );
}

interface ParsedFlags {
  packs: string[];
  framework?: string;
  out?: string;
  marketplaceName?: string;
}

function parseFlags(args: string[]): ParsedFlags {
  const flags: ParsedFlags = { packs: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--pack") flags.packs.push(args[++i]);
    else if (a === "--framework") flags.framework = args[++i];
    else if (a === "--out") flags.out = args[++i];
    else if (a === "--marketplace-name") flags.marketplaceName = args[++i];
    else if (a === "--help" || a === "-h") {
      console.log(
        "Usage: build-claude-plugins.ts [--pack core] [--framework ./framework] [--out ./dist/claude-plugins] [--marketplace-name flowai-plugins]",
      );
      Deno.exit(0);
    } else {
      console.error(`unknown flag: ${a}`);
      Deno.exit(2);
    }
  }
  return flags;
}
