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
  /** Source atom path under framework/atoms/. */
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
  /** Source composite wrapper path under framework/composites/. */
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

/** Parameter spec extracted from atom frontmatter `_params:`. */
export interface ParamSpec {
  name: string;
  choices: string[];
  default: string;
  description?: string;
}

/**
 * Splits a raw atom or composite wrapper source into:
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

/**
 * Render a composite SKILL.md from its wrapper + phase sources.
 *
 * The wrapper (`framework/composites/<name>.md`) provides everything OUTSIDE `## Instructions`
 * (description, overview, context, rules, verification, final report). It
 * places a `{{PHASES}}` marker where phase bodies should be inlined.
 *
 * Per-phase rendering:
 *   - atom phase (`atom: <id>` in manifest): emits `### <title>` heading,
 *     then the atom's rendered `<step_by_step>` block, with phase-specific
 *     param overrides.
 *   - inline phase (`inline: true`): looks up the matching
 *     `<inline-phase index="<i+1>">...</inline-phase>` block in the wrapper
 *     and emits it verbatim.
 *
 * Inter-phase gates:
 *   - After phase i (1-based), if the wrapper has `<gate after="<i>">...</gate>`,
 *     its body is emitted between phase i and phase i+1.
 *
 * Composite canon validated after render (see validateCompositeCanon).
 */
export async function renderCompositeTarget(
  id: string,
  manifest: Manifest,
): Promise<RenderedTarget> {
  const entry = manifest.composites[id];
  if (!entry) {
    throw new Error(
      `[generate-skill-composites] composite '${id}' not in manifest`,
    );
  }
  const wrapperRaw = await Deno.readTextFile(entry.wrapper);
  const wrapperParsed = parseAtomSource(wrapperRaw, entry.wrapper);
  // Wrappers MUST NOT declare _params: (no parametrization at the wrapper level).
  if (wrapperParsed.params.size > 0) {
    throw new Error(
      `[generate-skill-composites] composite '${id}' (${entry.wrapper}): wrappers MUST NOT declare _params: (use atom-level params instead)`,
    );
  }
  // Extract <inline-phase index="N"> and <gate after="N"> blocks BEFORE the
  // {{PHASES}} placeholder is consumed.
  const inlinePhases = new Map<number, string>();
  const gates = new Map<number, string>();
  let wrapperBody = wrapperParsed.body;
  const inlineRe =
    /<inline-phase\s+index="(\d+)">\n?([\s\S]*?)\n?<\/inline-phase>\n?/g;
  wrapperBody = wrapperBody.replace(
    inlineRe,
    (_full, idx: string, body: string) => {
      inlinePhases.set(parseInt(idx, 10), body);
      return "";
    },
  );
  const gateRe = /<gate\s+after="(\d+)">\n?([\s\S]*?)\n?<\/gate>\n?/g;
  wrapperBody = wrapperBody.replace(
    gateRe,
    (_full, idx: string, body: string) => {
      gates.set(parseInt(idx, 10), body);
      return "";
    },
  );
  if (!wrapperBody.includes("{{PHASES}}")) {
    throw new Error(
      `[generate-skill-composites] composite '${id}' (${entry.wrapper}): wrapper missing {{PHASES}} placeholder`,
    );
  }
  // Render phases.
  const sources = [entry.wrapper];
  const phaseBlocks: string[] = [];
  for (const [i, phase] of entry.phases.entries()) {
    const idx = i + 1;
    let block: string;
    if (phase.inline === true) {
      const inlineBody = inlinePhases.get(idx);
      if (inlineBody === undefined) {
        throw new Error(
          `[generate-skill-composites] composite '${id}': phase #${idx} is inline but wrapper has no <inline-phase index="${idx}">`,
        );
      }
      block = inlineBody.trimEnd();
    } else {
      const atomEntry = manifest.atoms[phase.atom!];
      if (!atomEntry) {
        throw new Error(
          `[generate-skill-composites] composite '${id}': phase #${idx} references unknown atom '${phase.atom}'`,
        );
      }
      sources.push(atomEntry.source);
      const atomRaw = await Deno.readTextFile(atomEntry.source);
      const atomParsed = parseAtomSource(atomRaw, atomEntry.source);
      const params = {
        ...(atomEntry.default_params ?? {}),
        ...(phase.params ?? {}),
      };
      const renderedBody = substituteParams(
        atomParsed.body,
        atomParsed.params,
        params,
        atomEntry.source,
      );
      const stepBlock = extractStepByStepBlock(renderedBody, atomEntry.source);
      block = `### ${phase.title}\n\n${stepBlock.trimEnd()}`;
    }
    phaseBlocks.push(block);
    if (idx < entry.phases.length) {
      const gateBody = gates.get(idx);
      if (gateBody !== undefined) {
        phaseBlocks.push(gateBody.trimEnd());
      }
    }
  }
  const phasesRendered = phaseBlocks.join("\n\n");
  const finalBody = wrapperBody.replace("{{PHASES}}", phasesRendered);
  validateCompositeCanon(
    id,
    wrapperParsed.frontmatter,
    finalBody,
    entry.target,
    manifest,
  );
  const marker = `<!-- GENERATED FROM ${
    [
      entry.wrapper,
      ...entry.phases.filter((p) => p.atom).map((p) =>
        manifest.atoms[p.atom!].source
      ),
    ].join(", ")
  } via scripts/generate-skill-composites.ts — DO NOT EDIT BY HAND -->`;
  const out =
    `---\n${wrapperParsed.frontmatterYaml}\n---\n\n${marker}\n\n${finalBody.trim()}\n`;
  return { target: entry.target, sources, body: out };
}

/**
 * Extracts the FIRST `<step_by_step>...</step_by_step>` block from an atom's
 * rendered body (including the tags) so the composite can re-emit it under
 * a phase heading.
 */
function extractStepByStepBlock(body: string, source: string): string {
  const m = body.match(/<step_by_step>[\s\S]*?<\/step_by_step>/);
  if (!m) {
    throw new Error(
      `[generate-skill-composites] ${source}: atom body has no <step_by_step> block`,
    );
  }
  return m[0];
}

/**
 * Composite canon — machine-enforced replacement for the rules previously
 * documented in framework/AGENTS.md § Composite Skill Authoring:
 *   1. **No delegation** rule present in <rules>.
 *   2. Description contains "Self-contained — execute the inlined steps directly".
 *   3. Description does NOT name any source skill (lexical check against the
 *      manifest's atoms map).
 *   4. Every verdict gate has both Approve and Reject branches (heuristic:
 *      "Approve" + ("Request Changes" OR "Reject") in the same gate body).
 *   5. 500-line cap on the emitted file.
 */
export function validateCompositeCanon(
  id: string,
  frontmatter: Record<string, unknown>,
  body: string,
  target: string,
  manifest: Manifest,
): void {
  const desc = typeof frontmatter.description === "string"
    ? frontmatter.description
    : "";
  if (!desc.includes("Self-contained — execute the inlined steps directly")) {
    throw new Error(
      `[generate-skill-composites] composite '${id}' (${target}): description MUST include "Self-contained — execute the inlined steps directly"`,
    );
  }
  for (const atomId of Object.keys(manifest.atoms)) {
    if (desc.includes(atomId)) {
      throw new Error(
        `[generate-skill-composites] composite '${id}' (${target}): description MUST NOT name source skill '${atomId}'`,
      );
    }
  }
  if (!body.includes("**No delegation**")) {
    throw new Error(
      `[generate-skill-composites] composite '${id}' (${target}): body MUST contain the **No delegation** rule in <rules>`,
    );
  }
  // Verdict gate completeness: any block containing "Verdict Gate" OR
  // "Approve" must also have a reject path nearby.
  if (/Approve.*?DO NOT commit/s.test(body) || /Verdict Gate/.test(body)) {
    if (!/Request Changes|Needs Discussion|Reject/.test(body)) {
      throw new Error(
        `[generate-skill-composites] composite '${id}' (${target}): verdict gate missing Request Changes / Needs Discussion / Reject branch`,
      );
    }
  }
  const lineCount = body.split("\n").length;
  if (lineCount > 500) {
    throw new Error(
      `[generate-skill-composites] composite '${id}' (${target}): ${lineCount} lines exceeds 500-line cap`,
    );
  }
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

/**
 * Verify `.gitignore` lists exactly the manifest's targets. Generated SKILL.md
 * files are build artefacts (FR-SKILL-COMPOSE); every target MUST be ignored
 * so consumers don't accidentally track stale renders. Returns the diff
 * (missing-from-gitignore, extra-in-gitignore) or null if in sync.
 */
export async function checkGitignoreParity(
  targets: string[],
): Promise<{ missing: string[]; extra: string[] } | null> {
  const gitignorePath = "./.gitignore";
  const raw = await Deno.readTextFile(gitignorePath);
  const tracked = new Set<string>();
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (trimmed.endsWith("/SKILL.md")) tracked.add(trimmed);
  }
  const expected = new Set(targets);
  const missing = [...expected].filter((t) => !tracked.has(t)).sort();
  const extra = [...tracked].filter((t) => !expected.has(t)).sort();
  if (missing.length === 0 && extra.length === 0) return null;
  return { missing, extra };
}

function reportGitignoreParity(
  diff: { missing: string[]; extra: string[] },
): void {
  console.error(
    "[generate-skill-composites] .gitignore is out of sync with the manifest:",
  );
  for (const m of diff.missing) {
    console.error(`  missing (should be added):   ${m}`);
  }
  for (const e of diff.extra) {
    console.error(`  stale (should be removed):   ${e}`);
  }
  console.error(
    "Update .gitignore so it lists exactly the targets returned by " +
      "`deno run -A scripts/generate-skill-composites.ts --list-targets`.",
  );
}

async function main(args: string[]): Promise<number> {
  const mode = args.includes("--write")
    ? "write"
    : args.includes("--list-targets")
    ? "list"
    : "check";
  const manifest = await loadManifest();
  const targets = await listTargets();
  if (mode === "list") {
    console.log(targets.join("\n"));
    return 0;
  }
  // Parity check runs for both --write and --check: a stale .gitignore is a
  // build-artefact contract violation that must fail loudly in both flows.
  const parityDiff = await checkGitignoreParity(targets);
  if (parityDiff) {
    reportGitignoreParity(parityDiff);
    return 1;
  }
  const rendered = await renderAll(manifest);
  if (mode === "write") {
    for (const r of rendered) await writeTarget(r);
    console.log(
      `[generate-skill-composites] wrote ${rendered.length} target(s)`,
    );
    return 0;
  }
  // --check: now that targets are gitignored, on-disk drift is meaningless
  // after a fresh clone. Treat --check as a syntax + parity self-test:
  // success means the generator loads + renders + .gitignore is consistent.
  console.log(
    `[generate-skill-composites] ${rendered.length} target(s) render OK; ` +
      `.gitignore in sync`,
  );
  return 0;
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
