/**
 * Composite Skill Generator (FR-SKILL-COMPOSE).
 *
 * Reads framework/composites.yaml and materializes SKILL.md files for every
 * atom and composite into their canonical paths. Replaces the legacy
 * "hand-copy + check-skill-sync.ts" duplication pattern.
 *
 * Modes:
 *   --check   regenerate into memory, diff-compare to on-disk SKILL.md,
 *             exit 1 on drift with a per-file unified diff + --write hint.
 *             Default behaviour when invoked from `deno task check`.
 *   --write   write regenerated SKILL.md files in place.
 *
 * Deterministic output: stable YAML key order, LF line endings, no
 * timestamps. Same manifest + same atoms => same bytes across runs.
 *
 * See documents/tasks/2026/05/generate-skills-from-atoms.md for the design.
 */
import { parse as parseYaml } from "@std/yaml";

export const MANIFEST_PATH = "framework/composites.yaml";

export interface AtomEntry {
  /** Source `_atom.md` path (sibling of generated SKILL.md). */
  source: string;
  /** Target `SKILL.md` path. */
  target: string;
  /** Default values for the atom's `{{PARAM}}` placeholders. */
  default_params?: Record<string, string>;
}

export interface CompositePhase {
  /** Free-form phase title rendered as `### <title>`. */
  title: string;
  /** Atom id referenced from `atoms:`. Mutually exclusive with `inline`. */
  atom?: string;
  /** When true, the phase body is supplied by the composite wrapper. */
  inline?: boolean;
  /** Per-phase overrides for atom params. */
  params?: Record<string, string>;
}

export interface CompositeEntry {
  /** Target `SKILL.md` path. */
  target: string;
  /** Wrapper `_composite.md` path (sibling of generated SKILL.md). */
  wrapper: string;
  /** Ordered list of phases. */
  phases: CompositePhase[];
}

export interface Manifest {
  schema_version: number;
  atoms: Record<string, AtomEntry>;
  composites: Record<string, CompositeEntry>;
}

/** Loads + validates the manifest at MANIFEST_PATH (or supplied path). */
export async function loadManifest(
  path: string = MANIFEST_PATH,
): Promise<Manifest> {
  let raw: string;
  try {
    raw = await Deno.readTextFile(path);
  } catch (e) {
    throw new Error(
      `[generate-skill-composites] manifest not found at ${path}: ${
        e instanceof Error ? e.message : String(e)
      }`,
    );
  }
  let parsed: unknown;
  try {
    parsed = parseYaml(raw);
  } catch (e) {
    throw new Error(
      `[generate-skill-composites] malformed YAML in ${path}: ${
        e instanceof Error ? e.message : String(e)
      }`,
    );
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error(
      `[generate-skill-composites] manifest ${path} is empty or not an object`,
    );
  }
  const obj = parsed as Record<string, unknown>;
  const schemaVersion = obj.schema_version;
  if (typeof schemaVersion !== "number") {
    throw new Error(
      `[generate-skill-composites] ${path}: missing or non-numeric schema_version`,
    );
  }
  if (schemaVersion !== 1) {
    throw new Error(
      `[generate-skill-composites] ${path}: unsupported schema_version ${schemaVersion} (expected 1)`,
    );
  }
  const atoms = (obj.atoms ?? {}) as Record<string, AtomEntry>;
  const composites = (obj.composites ?? {}) as Record<string, CompositeEntry>;
  validateManifestRefs(atoms, composites, path);
  return { schema_version: schemaVersion, atoms, composites };
}

/** Cross-checks that every composite phase's `atom:` exists in `atoms:`. */
function validateManifestRefs(
  atoms: Record<string, AtomEntry>,
  composites: Record<string, CompositeEntry>,
  path: string,
): void {
  for (const [compId, comp] of Object.entries(composites)) {
    if (!Array.isArray(comp.phases)) {
      throw new Error(
        `[generate-skill-composites] ${path}: composite '${compId}' missing 'phases:' list`,
      );
    }
    for (const [i, phase] of comp.phases.entries()) {
      const has_atom = typeof phase.atom === "string" && phase.atom.length > 0;
      const inline = phase.inline === true;
      if (has_atom === inline) {
        throw new Error(
          `[generate-skill-composites] ${path}: composite '${compId}' phase #${
            i + 1
          } must specify exactly one of 'atom:' or 'inline: true'`,
        );
      }
      if (has_atom && !(phase.atom! in atoms)) {
        throw new Error(
          `[generate-skill-composites] ${path}: composite '${compId}' phase #${
            i + 1
          } references unknown atom '${phase.atom}'`,
        );
      }
    }
  }
}

/** Render plan: a target path and the rendered SKILL.md body. */
export interface RenderedTarget {
  target: string;
  /** Relative source paths used (for the GENERATED-FROM marker). */
  sources: string[];
  body: string;
}

/**
 * Renders every target listed in the manifest. Pure: does not touch disk for
 * targets (only reads atom/wrapper sources). Returns a deterministic list.
 *
 * Commit-1 skeleton: empty manifest yields an empty list. Commit-2+ extend
 * with atom rendering; Commit-4+ with composite rendering.
 */
export async function renderAll(manifest: Manifest): Promise<RenderedTarget[]> {
  const out: RenderedTarget[] = [];
  // Stable iteration order: sort atoms then composites by id.
  for (const id of Object.keys(manifest.atoms).sort()) {
    out.push(await renderAtomTarget(id, manifest.atoms[id]));
  }
  for (const id of Object.keys(manifest.composites).sort()) {
    out.push(await renderCompositeTarget(id, manifest));
  }
  return out;
}

/** Parameter spec extracted from `_atom.md` frontmatter `_params:`. */
export interface ParamSpec {
  name: string;
  choices: string[];
  default: string;
  description?: string;
}

/**
 * Splits a raw `_atom.md` (or `_composite.md`) source into:
 *   - frontmatter YAML (with `_params:` stripped — extracted into paramSpecs)
 *   - body (with `<param-branch>` blocks parsed out)
 *   - paramSpecs (zero or more parameters with their branch bodies)
 *
 * Used by atom rendering (Commit 2) and composite rendering (Commit 4).
 */
export interface ParsedAtom {
  /** Frontmatter YAML body (after `_params:` extraction), as a string. */
  frontmatterYaml: string;
  /** Frontmatter parsed object (after `_params:` removal). */
  frontmatter: Record<string, unknown>;
  /** Body with `<param-branch>` blocks removed and `{{PARAM}}` placeholders intact. */
  body: string;
  /** Map: param name -> spec + map(value -> branch body). */
  params: Map<string, ParamSpec & { branches: Map<string, string> }>;
}

export function parseAtomSource(
  source: string,
  sourcePath: string,
): ParsedAtom {
  const m = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) {
    throw new Error(
      `[generate-skill-composites] ${sourcePath}: missing frontmatter (--- ... ---)`,
    );
  }
  const fmRaw = m[1];
  let bodyRaw = m[2];
  const fmParsed = parseYaml(fmRaw) as Record<string, unknown>;
  if (!fmParsed || typeof fmParsed !== "object") {
    throw new Error(
      `[generate-skill-composites] ${sourcePath}: frontmatter is not an object`,
    );
  }
  const paramSpecsRaw = (fmParsed._params ?? {}) as Record<string, {
    choices: string[];
    default: string;
    description?: string;
  }>;
  delete (fmParsed as Record<string, unknown>)._params;
  const params = new Map<
    string,
    ParamSpec & { branches: Map<string, string> }
  >();
  for (const [name, spec] of Object.entries(paramSpecsRaw)) {
    if (!Array.isArray(spec.choices) || spec.choices.length === 0) {
      throw new Error(
        `[generate-skill-composites] ${sourcePath}: param '${name}' missing 'choices:' list`,
      );
    }
    if (
      typeof spec.default !== "string" || !spec.choices.includes(spec.default)
    ) {
      throw new Error(
        `[generate-skill-composites] ${sourcePath}: param '${name}' default '${spec.default}' not in choices`,
      );
    }
    params.set(name, {
      name,
      choices: spec.choices,
      default: spec.default,
      description: spec.description,
      branches: new Map(),
    });
  }
  // Parse `<param-branch name="X" value="Y">…</param-branch>` blocks.
  const branchRe =
    /<param-branch\s+name="([^"]+)"\s+value="([^"]+)">\n?([\s\S]*?)\n?<\/param-branch>\n?/g;
  bodyRaw = bodyRaw.replace(
    branchRe,
    (_full, name: string, value: string, branchBody: string) => {
      const spec = params.get(name);
      if (!spec) {
        throw new Error(
          `[generate-skill-composites] ${sourcePath}: <param-branch> references unknown param '${name}'`,
        );
      }
      if (!spec.choices.includes(value)) {
        throw new Error(
          `[generate-skill-composites] ${sourcePath}: <param-branch name="${name}" value="${value}"> value not in choices [${
            spec.choices.join(", ")
          }]`,
        );
      }
      spec.branches.set(value, branchBody);
      return ""; // strip from body
    },
  );
  // Validate every param has a branch for every choice.
  for (const spec of params.values()) {
    for (const choice of spec.choices) {
      if (!spec.branches.has(choice)) {
        throw new Error(
          `[generate-skill-composites] ${sourcePath}: param '${spec.name}' missing <param-branch> for choice '${choice}'`,
        );
      }
    }
  }
  // Normalise: collapse runs of blank lines left behind by branch removal.
  const body = bodyRaw.replace(/\n{3,}/g, "\n\n").trimStart();
  // Re-stringify frontmatter — deterministic key order matters; rely on a
  // canonical layout (alphabetical, with `name`/`description`/`kind` first).
  const frontmatterYaml = stringifyAtomFrontmatter(fmParsed);
  return { frontmatterYaml, frontmatter: fmParsed, body, params };
}

const FRONTMATTER_PRIORITY_KEYS = [
  "name",
  "description",
  "argument-hint",
  "effort",
  "kind",
];

function stringifyAtomFrontmatter(fm: Record<string, unknown>): string {
  const orderedKeys = [
    ...FRONTMATTER_PRIORITY_KEYS.filter((k) => k in fm),
    ...Object.keys(fm).filter((k) => !FRONTMATTER_PRIORITY_KEYS.includes(k))
      .sort(),
  ];
  const lines: string[] = [];
  for (const k of orderedKeys) {
    const v = fm[k];
    if (typeof v === "string") {
      // Bare string — quote ONLY when the value contains chars that need quoting.
      if (/[:#\n]/.test(v)) {
        lines.push(`${k}: ${JSON.stringify(v)}`);
      } else {
        lines.push(`${k}: ${v}`);
      }
    } else {
      lines.push(`${k}: ${JSON.stringify(v)}`);
    }
  }
  return lines.join("\n");
}

/** Substitutes {{PARAM}} placeholders in body using resolved param values. */
export function substituteParams(
  body: string,
  params: ParsedAtom["params"],
  overrides: Record<string, string>,
  sourcePath: string,
): string {
  return body.replace(/\{\{([A-Z][A-Z0-9_]*)\}\}/g, (_full, name: string) => {
    const spec = params.get(name);
    if (!spec) {
      throw new Error(
        `[generate-skill-composites] ${sourcePath}: placeholder {{${name}}} has no _params: declaration`,
      );
    }
    const value = overrides[name] ?? spec.default;
    if (!spec.choices.includes(value)) {
      const closest = spec.choices.reduce((best, c) =>
        levenshtein(value, c) < levenshtein(value, best) ? c : best
      );
      throw new Error(
        `[generate-skill-composites] ${sourcePath}: param '${name}' value '${value}' not in choices [${
          spec.choices.join(", ")
        }] (did you mean '${closest}'?)`,
      );
    }
    return spec.branches.get(value)!;
  });
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/** Render an atom into a standalone SKILL.md at its target path. */
export async function renderAtomTarget(
  id: string,
  entry: AtomEntry,
): Promise<RenderedTarget> {
  const raw = await Deno.readTextFile(entry.source);
  const parsed = parseAtomSource(raw, entry.source);
  const overrides = entry.default_params ?? {};
  const renderedBody = substituteParams(
    parsed.body,
    parsed.params,
    overrides,
    entry.source,
  );
  validateAtomCanon(id, renderedBody, entry.target);
  const marker =
    `<!-- GENERATED FROM ${entry.source} via scripts/generate-skill-composites.ts — DO NOT EDIT BY HAND -->`;
  const body =
    `---\n${parsed.frontmatterYaml}\n---\n\n${marker}\n\n${renderedBody.trimEnd()}\n`;
  return { target: entry.target, sources: [entry.source], body };
}

/** Atom canon: exactly one `<step_by_step>` block, ≤ 500 lines. */
export function validateAtomCanon(
  id: string,
  body: string,
  target: string,
): void {
  const stepCount = (body.match(/<step_by_step>/g) ?? []).length;
  if (stepCount !== 1) {
    throw new Error(
      `[generate-skill-composites] atom '${id}' (${target}): expected exactly 1 <step_by_step> block, found ${stepCount}`,
    );
  }
  const lineCount = body.split("\n").length;
  if (lineCount > 500) {
    throw new Error(
      `[generate-skill-composites] atom '${id}' (${target}): ${lineCount} lines exceeds 500-line cap`,
    );
  }
}

/** Placeholder for the composite-render pipeline (Commit 4). */
export function renderCompositeTarget(
  _id: string,
  _m: Manifest,
): Promise<RenderedTarget> {
  throw new Error(
    "[generate-skill-composites] composite rendering not implemented yet (Commit 4 introduces it)",
  );
}

/** Compare rendered targets against on-disk; return per-target unified diffs. */
export async function diffAgainstDisk(
  rendered: RenderedTarget[],
): Promise<Array<{ target: string; diff: string }>> {
  const drifts: Array<{ target: string; diff: string }> = [];
  for (const r of rendered) {
    let onDisk = "";
    try {
      onDisk = await Deno.readTextFile(r.target);
    } catch {
      // Missing file is treated as max drift.
    }
    if (onDisk !== r.body) {
      drifts.push({
        target: r.target,
        diff: unifiedDiff(onDisk, r.body, r.target),
      });
    }
  }
  return drifts;
}

/** Minimal line-based unified diff. No external deps; sufficient for CI output. */
export function unifiedDiff(a: string, b: string, label: string): string {
  const aLines = a.split("\n");
  const bLines = b.split("\n");
  const out: string[] = [
    `--- ${label} (on-disk)`,
    `+++ ${label} (regenerated)`,
  ];
  const max = Math.max(aLines.length, bLines.length);
  for (let i = 0; i < max; i++) {
    const x = aLines[i];
    const y = bLines[i];
    if (x === y) {
      out.push(`  ${x ?? ""}`);
      continue;
    }
    if (x !== undefined) out.push(`- ${x}`);
    if (y !== undefined) out.push(`+ ${y}`);
  }
  return out.join("\n");
}

/** Write a rendered SKILL.md target to disk (creates parent dirs). */
export async function writeTarget(r: RenderedTarget): Promise<void> {
  const dir = r.target.replace(/\/[^/]+$/, "");
  await Deno.mkdir(dir, { recursive: true });
  await Deno.writeTextFile(r.target, r.body);
}

/** List the targets the generator would write (one per line on stdout). */
export async function listTargets(): Promise<string[]> {
  const manifest = await loadManifest();
  const out: string[] = [];
  for (const id of Object.keys(manifest.atoms).sort()) {
    out.push(manifest.atoms[id].target);
  }
  for (const id of Object.keys(manifest.composites).sort()) {
    out.push(manifest.composites[id].target);
  }
  return out;
}

async function main(args: string[]): Promise<number> {
  const mode = args.includes("--write")
    ? "write"
    : args.includes("--list-targets")
    ? "list"
    : "check";
  const manifest = await loadManifest();
  if (mode === "list") {
    const targets = await listTargets();
    console.log(targets.join("\n"));
    return 0;
  }
  const rendered = await renderAll(manifest);
  if (mode === "write") {
    for (const r of rendered) await writeTarget(r);
    console.log(
      `[generate-skill-composites] wrote ${rendered.length} target(s)`,
    );
    return 0;
  }
  const drifts = await diffAgainstDisk(rendered);
  if (drifts.length === 0) {
    if (rendered.length === 0) {
      console.log(
        "[generate-skill-composites] manifest is empty; nothing to regenerate",
      );
    } else {
      console.log(
        `[generate-skill-composites] ${rendered.length} target(s) up-to-date`,
      );
    }
    return 0;
  }
  for (const d of drifts) {
    console.error(d.diff);
    console.error("");
  }
  console.error(
    `[generate-skill-composites] ${drifts.length} target(s) out of sync. ` +
      `Run: deno run -A scripts/generate-skill-composites.ts --write`,
  );
  return 1;
}

if (import.meta.main) {
  try {
    const code = await main(Deno.args);
    Deno.exit(code);
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    Deno.exit(1);
  }
}
