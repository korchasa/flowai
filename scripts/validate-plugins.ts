#!/usr/bin/env -S deno run -A
// implements [REF:fr:dist.marketplace | FR-DIST.MARKETPLACE]
// Validate a shared Claude Code + Codex plugin marketplace tree before publication.
//
// Runs over the OUTPUT of scripts/build-plugins.ts (or any conforming
// tree). Catches schema drift, cross-link mismatches, and frontmatter issues
// BEFORE the tree is pushed to the downstream marketplace repo.
//
// Layered checks:
//   1. .claude-plugin/marketplace.json validates against MarketplaceSchema.
//   2. Each plugin entry's relative `source` path resolves to an existing dir
//      that contains `.claude-plugin/plugin.json`.
//   3. .agents/plugins/marketplace.json validates against CodexMarketplaceSchema.
//   4. Each Codex plugin entry's local source path resolves to an existing dir
//      that contains `.codex-plugin/plugin.json`.
//   5. plugin.json validates against PluginManifestSchema. `name` matches
//      the marketplace entry's `name`.
//   6. Each plugin's skills/<n>/SKILL.md frontmatter parses, has `name` +
//      `description`. Same for agents/<n>.md. Same for hooks/hooks.json
//      (JSON only — schema deferred until multi-pack hooks land).
// Failures exit non-zero with a precise message naming the offending file.

import { join, relative, resolve } from "@std/path";
import { exists } from "@std/fs";
import { parse as parseYaml } from "@std/yaml";
import { z } from "zod";

// ---------- Schemas ----------

const KebabName = z.string().regex(
  /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/,
  "must be kebab-case (lowercase alnum + single hyphens, no leading/trailing)",
);

const Owner = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
}).strict();

const Author = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
}).strict();

// Reserved marketplace names per
// https://code.claude.com/docs/en/plugin-marketplaces (Required fields → Note).
const RESERVED_MARKETPLACE_NAMES = new Set([
  "claude-code-marketplace",
  "claude-code-plugins",
  "claude-plugins-official",
  "anthropic-marketplace",
  "anthropic-plugins",
  "agent-skills",
  "knowledge-work-plugins",
  "life-sciences",
]);

const Sha40 = z.string().regex(/^[0-9a-f]{40}$/);

const PluginSource = z.union([
  z.string().regex(/^\.\//, "relative source must start with './'"),
  z.object({
    source: z.literal("github"),
    repo: z.string().regex(
      /^[^/\s]+\/[^/\s]+$/,
      "github source repo must be owner/name",
    ),
    ref: z.string().optional(),
    sha: Sha40.optional(),
  }).strict(),
  z.object({
    source: z.literal("url"),
    url: z.string().min(1),
    ref: z.string().optional(),
    sha: Sha40.optional(),
  }).strict(),
  z.object({
    source: z.literal("git-subdir"),
    url: z.string().min(1),
    path: z.string().min(1),
    ref: z.string().optional(),
    sha: Sha40.optional(),
  }).strict(),
  z.object({
    source: z.literal("npm"),
    package: z.string().min(1),
    version: z.string().optional(),
    registry: z.string().url().optional(),
  }).strict(),
]);

// Plugin entries inside marketplace.json. Per docs they accept "any field from
// the plugin manifest schema" plus marketplace-specific fields, so .passthrough.
const PluginEntrySchema = z.object({
  name: KebabName,
  source: PluginSource,
  description: z.string().optional(),
  version: z.string().optional(),
  author: Author.optional(),
  homepage: z.string().url().optional(),
  repository: z.string().optional(),
  license: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  strict: z.boolean().optional(),
  skills: z.union([z.string(), z.array(z.string())]).optional(),
  commands: z.union([z.string(), z.array(z.string())]).optional(),
  agents: z.union([z.string(), z.array(z.string())]).optional(),
  hooks: z.unknown().optional(),
  mcpServers: z.unknown().optional(),
  lspServers: z.unknown().optional(),
}).passthrough();

export const MarketplaceSchema = z.object({
  name: KebabName.refine(
    (n) => !RESERVED_MARKETPLACE_NAMES.has(n),
    { message: "name is reserved for official Anthropic marketplaces" },
  ),
  owner: Owner,
  description: z.string().optional(),
  version: z.string().optional(),
  metadata: z.object({
    pluginRoot: z.string().optional(),
    version: z.string().optional(),
    description: z.string().optional(),
  }).passthrough().optional(),
  allowCrossMarketplaceDependenciesOn: z.array(z.unknown()).optional(),
  $schema: z.string().optional(),
  plugins: z.array(PluginEntrySchema).min(1),
}).passthrough();

const Semver = z.string().regex(
  /^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/,
  "version must be semver MAJOR.MINOR.PATCH (optionally with -pre / +build)",
);

export const PluginManifestSchema = z.object({
  name: KebabName,
  description: z.string().optional(),
  version: Semver,
  author: Author.optional(),
  homepage: z.string().url().optional(),
  repository: z.string().optional(),
  license: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  strict: z.boolean().optional(),
}).passthrough();

const CodexLocalSource = z.object({
  source: z.literal("local"),
  path: z.string().regex(/^\.\//, "must start with './'"),
}).strict();

const CodexPolicy = z.object({
  installation: z.string().min(1),
  authentication: z.string().min(1),
}).strict();

const CodexPluginEntrySchema = z.object({
  name: KebabName,
  source: CodexLocalSource,
  policy: CodexPolicy.optional(),
  category: z.string().optional(),
}).passthrough();

export const CodexMarketplaceSchema = z.object({
  name: KebabName,
  interface: z.object({
    displayName: z.string().min(1),
  }).passthrough(),
  plugins: z.array(CodexPluginEntrySchema).min(1),
}).passthrough();

const CodexComponentPath = z.string().regex(
  /^\.\//,
  "component path must start with './'",
);

export const CodexPluginManifestSchema = z.object({
  name: KebabName,
  version: Semver,
  description: z.string().min(1),
  author: Author.optional(),
  repository: z.string().optional(),
  license: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  skills: CodexComponentPath,
  hooks: CodexComponentPath.optional(),
  mcpServers: CodexComponentPath.optional(),
  interface: z.object({
    displayName: z.string().min(1),
    shortDescription: z.string().optional(),
    developerName: z.string().optional(),
    category: z.string().optional(),
    capabilities: z.array(z.string()).optional(),
  }).passthrough().optional(),
}).passthrough();

// Claude Code plugin hook schema: per docs, hooks/hooks.json is
//   { hooks: { <EventName>: [{ matcher: string, hooks: [{ type, command, timeout? }] }] } }
const HookCommandSchema = z.object({
  type: z.literal("command"),
  command: z.string().min(1),
  timeout: z.number().int().positive().optional(),
}).strict();

const HookEntrySchema = z.object({
  matcher: z.string(),
  hooks: z.array(HookCommandSchema).min(1),
}).strict();

export const HooksFileSchema = z.object({
  hooks: z.record(z.string(), z.array(HookEntrySchema)),
}).strict();

// ---------- Validator ----------

export interface ValidationIssue {
  file: string;
  message: string;
}

class ValidationContext {
  issues: ValidationIssue[] = [];
  constructor(public root: string) {}
  add(file: string, message: string) {
    this.issues.push({ file: relative(Deno.cwd(), file), message });
  }
}

export async function validateMarketplaceTree(
  inDir: string,
): Promise<ValidationIssue[]> {
  const ctx = new ValidationContext(inDir);
  await validateClaudeMarketplace(ctx, inDir);
  await validateCodexMarketplace(ctx, inDir);
  return ctx.issues;
}

async function validateClaudeMarketplace(
  ctx: ValidationContext,
  inDir: string,
): Promise<void> {
  const marketplacePath = join(inDir, ".claude-plugin", "marketplace.json");

  if (!(await exists(marketplacePath))) {
    ctx.add(marketplacePath, "marketplace.json not found at expected path");
    return;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(await Deno.readTextFile(marketplacePath));
  } catch (e) {
    ctx.add(marketplacePath, `invalid JSON: ${(e as Error).message}`);
    return;
  }

  const result = MarketplaceSchema.safeParse(parsed);
  if (!result.success) {
    for (const issue of result.error.issues) {
      ctx.add(
        marketplacePath,
        `schema: ${issue.path.join(".") || "<root>"}: ${issue.message}`,
      );
    }
    return;
  }

  const marketplace = result.data;
  const pluginRoot = marketplace.metadata?.pluginRoot ?? "./";

  for (const entry of marketplace.plugins) {
    if (typeof entry.source !== "string") {
      // Only validate filesystem-resolvable entries (relative path).
      // github/url/git-subdir/npm sources are remote, not in this tree.
      continue;
    }
    const resolvedRel = resolveSource(pluginRoot, entry.source);
    const pluginDir = resolve(inDir, resolvedRel);
    if (!(await exists(pluginDir))) {
      ctx.add(
        marketplacePath,
        `plugin "${entry.name}": source "${entry.source}" → "${
          relative(inDir, pluginDir)
        }" does not exist`,
      );
      continue;
    }
    await validateClaudePlugin(ctx, entry.name, pluginDir);
  }
}

function resolveSource(pluginRoot: string, source: string): string {
  // marketplace.json: source = "./flowai"; pluginRoot = "./plugins" →
  // resolves to "./plugins/flowai" relative to marketplace root.
  const stripDot = (s: string) => s.replace(/^\.\//, "");
  const root = stripDot(pluginRoot).replace(/\/$/, "");
  const src = stripDot(source).replace(/^\//, "");
  return root ? `${root}/${src}` : src;
}

async function validateCodexMarketplace(
  ctx: ValidationContext,
  inDir: string,
): Promise<void> {
  const marketplacePath = join(
    inDir,
    ".agents",
    "plugins",
    "marketplace.json",
  );

  if (!(await exists(marketplacePath))) {
    ctx.add(marketplacePath, "marketplace.json not found at expected path");
    return;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(await Deno.readTextFile(marketplacePath));
  } catch (e) {
    ctx.add(marketplacePath, `invalid JSON: ${(e as Error).message}`);
    return;
  }

  const result = CodexMarketplaceSchema.safeParse(parsed);
  if (!result.success) {
    for (const issue of result.error.issues) {
      ctx.add(
        marketplacePath,
        `codex schema: ${issue.path.join(".") || "<root>"}: ${issue.message}`,
      );
    }
    return;
  }

  for (const entry of result.data.plugins) {
    const pluginDir = resolveSafeRelativePath(
      inDir,
      entry.source.path,
      marketplacePath,
      ctx,
      `plugin "${entry.name}" source.path`,
    );
    if (!pluginDir) continue;
    if (!(await exists(pluginDir))) {
      ctx.add(
        marketplacePath,
        `plugin "${entry.name}": source.path "${entry.source.path}" -> "${
          relative(inDir, pluginDir)
        }" does not exist`,
      );
      continue;
    }
    await validateCodexPlugin(ctx, entry.name, pluginDir);
  }
}

async function validateClaudePlugin(
  ctx: ValidationContext,
  entryName: string,
  pluginDir: string,
): Promise<void> {
  const manifestPath = join(pluginDir, ".claude-plugin", "plugin.json");
  if (!(await exists(manifestPath))) {
    ctx.add(manifestPath, "plugin.json not found");
    return;
  }
  let manifest: unknown;
  try {
    manifest = JSON.parse(await Deno.readTextFile(manifestPath));
  } catch (e) {
    ctx.add(manifestPath, `invalid JSON: ${(e as Error).message}`);
    return;
  }
  const parsed = PluginManifestSchema.safeParse(manifest);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      ctx.add(
        manifestPath,
        `schema: ${issue.path.join(".") || "<root>"}: ${issue.message}`,
      );
    }
    return;
  }
  if (parsed.data.name !== entryName) {
    ctx.add(
      manifestPath,
      `name mismatch: marketplace lists "${entryName}", manifest is "${parsed.data.name}"`,
    );
  }

  await validateSkillsDir(ctx, join(pluginDir, "skills"));
  await validateAgentsDir(ctx, join(pluginDir, "agents"));
  await validateHooksFile(ctx, join(pluginDir, "hooks", "hooks.json"));
}

async function validateCodexPlugin(
  ctx: ValidationContext,
  entryName: string,
  pluginDir: string,
): Promise<void> {
  const manifestPath = join(pluginDir, ".codex-plugin", "plugin.json");
  if (!(await exists(manifestPath))) {
    ctx.add(manifestPath, "plugin.json not found");
    return;
  }
  let manifest: unknown;
  try {
    manifest = JSON.parse(await Deno.readTextFile(manifestPath));
  } catch (e) {
    ctx.add(manifestPath, `invalid JSON: ${(e as Error).message}`);
    return;
  }
  const parsed = CodexPluginManifestSchema.safeParse(manifest);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      ctx.add(
        manifestPath,
        `codex schema: ${issue.path.join(".") || "<root>"}: ${issue.message}`,
      );
    }
    return;
  }
  if (parsed.data.name !== entryName) {
    ctx.add(
      manifestPath,
      `name mismatch: marketplace lists "${entryName}", manifest is "${parsed.data.name}"`,
    );
  }
  await validateCodexComponentPath(
    ctx,
    pluginDir,
    manifestPath,
    "skills",
    parsed.data.skills,
  );
  if (parsed.data.hooks) {
    await validateCodexComponentPath(
      ctx,
      pluginDir,
      manifestPath,
      "hooks",
      parsed.data.hooks,
    );
  }
  if (parsed.data.mcpServers) {
    await validateCodexComponentPath(
      ctx,
      pluginDir,
      manifestPath,
      "mcpServers",
      parsed.data.mcpServers,
    );
  }
}

async function validateCodexComponentPath(
  ctx: ValidationContext,
  pluginDir: string,
  manifestPath: string,
  component: string,
  relPath: string,
): Promise<void> {
  const resolved = resolveSafeRelativePath(
    pluginDir,
    relPath,
    manifestPath,
    ctx,
    `${component} component path`,
  );
  if (!resolved) return;
  if (!(await exists(resolved))) {
    ctx.add(
      manifestPath,
      `${component} component path "${relPath}" -> "${
        relative(pluginDir, resolved)
      }" does not exist`,
    );
  }
}

function resolveSafeRelativePath(
  root: string,
  relPath: string,
  file: string,
  ctx: ValidationContext,
  label: string,
): string | undefined {
  if (!relPath.startsWith("./")) {
    ctx.add(file, `${label} must start with './'`);
    return undefined;
  }
  const resolvedPath = resolve(root, relPath);
  const relativePath = relative(root, resolvedPath);
  if (
    relativePath === ".." || relativePath.startsWith(`..${separator()}`) ||
    resolve(root) === resolvedPath
  ) {
    ctx.add(file, `${label} must stay inside ${relative(Deno.cwd(), root)}`);
    return undefined;
  }
  return resolvedPath;
}

function separator(): string {
  return Deno.build.os === "windows" ? "\\" : "/";
}

async function validateSkillsDir(
  ctx: ValidationContext,
  skillsDir: string,
): Promise<void> {
  if (!(await exists(skillsDir))) return;
  for await (const entry of Deno.readDir(skillsDir)) {
    if (!entry.isDirectory) continue;
    if (entry.name.startsWith("flowai-")) {
      ctx.add(
        join(skillsDir, entry.name),
        "skill dir name retains 'flowai-' prefix (should be stripped)",
      );
    }
    const skillFile = join(skillsDir, entry.name, "SKILL.md");
    if (!(await exists(skillFile))) {
      ctx.add(skillFile, "SKILL.md missing inside skill directory");
      continue;
    }
    await validateMarkdownFrontmatter(ctx, skillFile, {
      requireName: true,
      requireDescription: true,
    });
    await validateAssetReferences(ctx, join(skillsDir, entry.name));
    await validateNoUnnamespacedSlashCommands(ctx, skillFile);
  }
}

/**
 * Catches build regressions where `/flowai-foo` references survive into the
 * emitted SKILL.md — under a plugin namespace those slash commands resolve to
 * `/<plugin>:foo`. Only flags raw `/flowai-<name>` without a `:`.
 */
async function validateNoUnnamespacedSlashCommands(
  ctx: ValidationContext,
  skillFile: string,
): Promise<void> {
  const text = await Deno.readTextFile(skillFile);
  // Same boundary rule as the build rewriter: only match a slash command at a
  // real word boundary, not a `/flowai-*` substring inside a file path or URL.
  const re = /(?<![A-Za-z0-9_.-])\/flowai-[a-z0-9][a-z0-9-]*(?![a-z0-9-:])/g;
  const matches = text.match(re);
  if (matches && matches.length > 0) {
    ctx.add(
      skillFile,
      `leaking unnamespaced slash invocation(s): ${
        Array.from(new Set(matches)).join(", ")
      }`,
    );
  }
}

async function validateAgentsDir(
  ctx: ValidationContext,
  agentsDir: string,
): Promise<void> {
  if (!(await exists(agentsDir))) return;
  for await (const entry of Deno.readDir(agentsDir)) {
    if (!entry.isFile || !entry.name.endsWith(".md")) continue;
    await validateMarkdownFrontmatter(ctx, join(agentsDir, entry.name), {
      requireName: true,
      requireDescription: true,
    });
  }
}

async function validateHooksFile(
  ctx: ValidationContext,
  hooksPath: string,
): Promise<void> {
  if (!(await exists(hooksPath))) return;
  let parsed: unknown;
  try {
    parsed = JSON.parse(await Deno.readTextFile(hooksPath));
  } catch (e) {
    ctx.add(hooksPath, `invalid JSON: ${(e as Error).message}`);
    return;
  }
  const result = HooksFileSchema.safeParse(parsed);
  if (!result.success) {
    for (const issue of result.error.issues) {
      ctx.add(
        hooksPath,
        `schema: ${issue.path.join(".") || "<root>"}: ${issue.message}`,
      );
    }
    return;
  }
  // Cross-check: every `command` references a file that exists on disk.
  const hooksDir = hooksPath.replace(/\/hooks\.json$/, "");
  const cmdRe = /\$\{CLAUDE_PLUGIN_ROOT\}\/hooks\/([^\s]+\.ts)/;
  for (const arr of Object.values(result.data.hooks)) {
    for (const entry of arr) {
      for (const h of entry.hooks) {
        const m = h.command.match(cmdRe);
        if (!m) continue;
        const rel = m[1];
        const absPath = join(hooksDir, rel);
        if (!(await exists(absPath))) {
          ctx.add(
            hooksPath,
            `hook command references missing file: ${rel}`,
          );
        }
      }
    }
  }
}

async function validateAssetReferences(
  ctx: ValidationContext,
  skillDir: string,
): Promise<void> {
  const skillFile = join(skillDir, "SKILL.md");
  if (!(await exists(skillFile))) return;
  const text = await Deno.readTextFile(skillFile);
  // Only flag the build-script regression that motivates this check: a
  // surviving `../assets/...` reference (build pass should have rewritten
  // it to local `assets/...`). Per-file existence is enforced fail-fast by
  // the build itself; doc-style mentions of `assets/<example>` inside meta
  // skills (e.g. `engineer-command`) are not real refs and must not
  // false-positive here.
  if (/\.\.\/(?:\.\.\/)*assets\//.test(text)) {
    ctx.add(
      skillFile,
      "leaking '../assets/...' reference — build pass missed asset rewrite",
    );
  }
}

interface FrontmatterReq {
  requireName: boolean;
  requireDescription: boolean;
}

async function validateMarkdownFrontmatter(
  ctx: ValidationContext,
  path: string,
  req: FrontmatterReq,
): Promise<void> {
  const text = await Deno.readTextFile(path);
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) {
    ctx.add(path, "missing YAML frontmatter (--- ... ---)");
    return;
  }
  let fm: unknown;
  try {
    fm = parseYaml(m[1]);
  } catch (e) {
    ctx.add(path, `invalid YAML frontmatter: ${(e as Error).message}`);
    return;
  }
  if (typeof fm !== "object" || fm === null) {
    ctx.add(path, "frontmatter must be an object");
    return;
  }
  const obj = fm as Record<string, unknown>;
  if (req.requireName && typeof obj.name !== "string") {
    ctx.add(path, "frontmatter missing required 'name' string");
  }
  if (req.requireDescription && typeof obj.description !== "string") {
    ctx.add(path, "frontmatter missing required 'description' string");
  }
}

// ---------- CLI ----------

if (import.meta.main) {
  let inDir = join(Deno.cwd(), "dist", "claude-plugins");
  for (let i = 0; i < Deno.args.length; i++) {
    const a = Deno.args[i];
    if (a === "--in") inDir = Deno.args[++i];
    else if (a === "--help" || a === "-h") {
      console.log(
        "Usage: validate-plugins.ts [--in dist/claude-plugins]",
      );
      Deno.exit(0);
    } else {
      console.error(`unknown flag: ${a}`);
      Deno.exit(2);
    }
  }
  const issues = await validateMarketplaceTree(inDir);
  if (issues.length === 0) {
    console.log(
      `OK: Claude Code + Codex plugin marketplace at ${
        relative(Deno.cwd(), inDir)
      } passes validation.`,
    );
    Deno.exit(0);
  }
  console.error(
    `FAIL: ${issues.length} issue(s) in Claude Code + Codex plugin marketplace at ${
      relative(Deno.cwd(), inDir)
    }:`,
  );
  for (const issue of issues) {
    console.error(`  - ${issue.file}: ${issue.message}`);
  }
  Deno.exit(1);
}
