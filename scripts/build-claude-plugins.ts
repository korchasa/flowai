#!/usr/bin/env -S deno run -A
// implements [FR-DIST.MARKETPLACE](../documents/requirements.md#fr-dist.marketplace-claude-code-plugin-marketplace-pilot)
// Build a Claude-Code-native plugin tree from framework/<pack>/.
//
// Reads `framework/<pack>/{pack.yaml,commands,skills,agents,hooks}` and emits a
// plugin-shaped tree at `--out`:
//
//   <out>/.claude-plugin/marketplace.json
//   <out>/plugins/flowai-<pack>/.claude-plugin/plugin.json
//   <out>/plugins/flowai-<pack>/skills/<stripped-name>/SKILL.md     (+ subdirs)
//   <out>/plugins/flowai-<pack>/agents/<name>.md
//   <out>/plugins/flowai-<pack>/hooks/hooks.json                    (if any hooks)
//
// The `flowai-` prefix is stripped from skill and command directory names so
// invocations appear as /flowai-<pack>:<short-name> instead of
// /flowai-<pack>:flowai-<short-name>. Commands gain `disable-model-invocation:
// true` per FR-PACKS.CMD-INVARIANT parity with flowai CLI.

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

// Universal agent → Claude-native: fields kept verbatim.
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
// Stable emission order for Claude agent frontmatter.
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

// Skill frontmatter: known keys, in stable emission order. Unknown keys are
// preserved and appended after the known set in source order.
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
      // Non-tier values (already a model name) pass through verbatim.
      return tier;
  }
}

export interface BuildOptions {
  packs: string[];
  frameworkDir: string;
  outDir: string;
  marketplaceName?: string;
  ownerName?: string;
}

export async function buildClaudePlugins(opts: BuildOptions): Promise<void> {
  const marketplaceName = opts.marketplaceName ?? DEFAULT_MARKETPLACE_NAME;
  const ownerName = opts.ownerName ?? DEFAULT_OWNER_NAME;

  // Wipe and recreate the output dir so the build is hermetic.
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
    });
    pluginEntries.push(entry);
  }

  // Top-level marketplace.json. Each plugin entry carries a full relative
  // `source` ("./plugins/<id>") resolved from the marketplace root; we
  // intentionally omit `metadata.pluginRoot` to avoid double-prefixing.
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

interface PackContext {
  packName: string;
  packDir: string;
  outDir: string;
}

async function buildPack(
  ctx: PackContext,
): Promise<Record<string, unknown>> {
  const pluginName = `flowai-${ctx.packName}`;
  const pluginRoot = join(ctx.outDir, "plugins", pluginName);
  await ensureDir(pluginRoot);

  // Pack manifest → plugin description.
  const packYamlPath = join(ctx.packDir, "pack.yaml");
  const packManifest = parseYaml(
    await Deno.readTextFile(packYamlPath),
  ) as Record<string, unknown>;
  const description = String(
    packManifest.description ?? `flowai ${ctx.packName} pack`,
  );

  // Emit primitives. `kind === "command"` triggers
  // disable-model-invocation injection.
  await emitPrimitives({
    sourceDir: join(ctx.packDir, "commands"),
    outDir: join(pluginRoot, "skills"),
    kind: "command",
  });
  await emitPrimitives({
    sourceDir: join(ctx.packDir, "skills"),
    outDir: join(pluginRoot, "skills"),
    kind: "skill",
  });
  await emitAgents({
    sourceDir: join(ctx.packDir, "agents"),
    outDir: join(pluginRoot, "agents"),
  });
  // Hooks: stub for multi-pack rollout (core has none).
  await emitHooks({
    sourceDir: join(ctx.packDir, "hooks"),
    outDir: join(pluginRoot, "hooks"),
  });

  // Plugin manifest. version intentionally omitted so the downstream commit
  // SHA is the version key (Claude Code resolves per FR-DIST.MARKETPLACE).
  const license = await readLicenseId(ctx.packDir).catch(() => undefined);
  const plugin: Record<string, unknown> = {
    name: pluginName,
    description,
    author: { name: DEFAULT_OWNER_NAME },
    repository: DEFAULT_REPO,
    homepage: DEFAULT_HOMEPAGE,
    keywords: DEFAULT_KEYWORDS,
    category: DEFAULT_CATEGORY,
  };
  if (license) plugin.license = license;
  await ensureDir(join(pluginRoot, ".claude-plugin"));
  await Deno.writeTextFile(
    join(pluginRoot, ".claude-plugin", "plugin.json"),
    JSON.stringify(plugin, null, 2) + "\n",
  );

  return {
    name: pluginName,
    source: `./plugins/${pluginName}`,
    description,
  };
}

interface EmitPrimitivesOpts {
  sourceDir: string;
  outDir: string;
  kind: "command" | "skill";
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
    const stripped = stripFlowaiPrefix(srcName);
    const dstDir = join(opts.outDir, stripped);
    await ensureDir(dstDir);

    // Copy all supporting files first (subdirs like references/, scripts/),
    // then overwrite SKILL.md with the transformed version.
    for await (const child of Deno.readDir(srcPath)) {
      if (child.name === "SKILL.md") continue;
      // Skip acceptance-tests — they're framework-side only.
      if (child.name === "acceptance-tests") continue;
      const childSrc = join(srcPath, child.name);
      const childDst = join(dstDir, child.name);
      await copy(childSrc, childDst, { overwrite: true });
    }

    // Transform SKILL.md frontmatter.
    const sourceText = await Deno.readTextFile(skillFile);
    const transformed = transformSkillFile(sourceText, {
      kind: opts.kind,
      sourceFile: skillFile,
    });
    await Deno.writeTextFile(join(dstDir, "SKILL.md"), transformed);
  }
}

function stripFlowaiPrefix(name: string): string {
  return name.startsWith("flowai-") ? name.slice("flowai-".length) : name;
}

interface TransformSkillCtx {
  kind: "command" | "skill";
  sourceFile: string;
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

  // Invariant guards — FR-PACKS.CMD-INVARIANT / FR-PACKS.SKILL-INVARIANT.
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

  // Resolve `model` tier if present.
  if (typeof fm.model === "string") {
    const resolved = resolveModelTier(fm.model);
    if (resolved === undefined) delete fm.model;
    else fm.model = resolved;
  }

  const orderedFm = orderObjectKeys(fm, SKILL_KEY_ORDER);
  const yaml = stringifyYaml(orderedFm).trimEnd();
  return `---\n${yaml}\n---\n${body}`;
}

function orderObjectKeys(
  obj: Record<string, unknown>,
  preferredOrder: string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of preferredOrder) {
    if (k in obj) out[k] = obj[k];
  }
  // Append unknown keys in original insertion order.
  for (const k of Object.keys(obj)) {
    if (!(k in out)) out[k] = obj[k];
  }
  return out;
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
 * - Keeps: name, description, tools, disallowedTools, model, effort, maxTurns,
 *   background, isolation, color (FR-DIST.MAPPING).
 * - Drops: readonly, mode, opencode_tools, and any unknown key.
 * - Resolves `model` tier names to Claude model strings.
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

async function emitHooks(opts: EmitHooksOpts): Promise<void> {
  if (!(await exists(opts.sourceDir))) return;
  // The contract: read every framework/<pack>/hooks/<name>/hook.yaml and
  // assemble a Claude-Code hooks/hooks.json. For the pilot pack (core),
  // there are no hooks — short-circuit. Multi-pack rollout (devtools) will
  // exercise this path.
  const hookDirs: string[] = [];
  for await (const e of Deno.readDir(opts.sourceDir)) {
    if (e.isDirectory) hookDirs.push(e.name);
  }
  if (hookDirs.length === 0) return;

  // Stub: emit a hooks.json scaffold so multi-pack consumers can extend.
  // Real transform lives in flowai-cli; vendoring is deferred per Solution.
  await ensureDir(opts.outDir);
  await Deno.writeTextFile(
    join(opts.outDir, "hooks.json"),
    JSON.stringify({ hooks: {} }, null, 2) + "\n",
  );
}

async function readLicenseId(packDir: string): Promise<string | undefined> {
  // Walk up to find LICENSE or deno.json with a license field.
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
