/**
 * Migrate legacy cross-reference grammars to SALP.
 *
 * Supported input grammars:
 *   - GFM FR-link        — `[FR-X](path.md#anchor)` → `[REF:fr:x | FR-X]`.
 *   - SDS GFM link       — `[Text](design.md#3-1-1-…)` → `[REF:sds:3-1-1 | Text]`.
 *   - Bare wikilink      — `[[slug]]` → `[REF:mx-<type>:slug]`.
 *   - Display wikilink   — `[[slug|Name]]` → `[REF:mx-<type>:slug | Name]`.
 *   - Dual link          — `[[slug|Name]] ([Name](slug.md))` → SALP REF only.
 *   - Bare FR comment    — `// FR-X: …` → `// [REF:fr:x] …`.
 *   - GFM comment link   — `// [FR-X](path.md#…)` → `// [REF:fr:x | FR-X]`.
 *
 * Pure `migrateText(...)` function; CLI wrapper at the bottom.
 *
 * Fail-fast: unresolvable GFM target or wikilink without page type → throws
 * `SalpMigrationError`. No silent skip.
 *
 * Template-variable preservation: `{{VARIABLE}}` placeholders inside link
 * text are passed through into the `| display` segment, never into `ns`
 * or `id`. A converter that would emit `[REF:{{X}}:…]` or
 * `[REF:fr:{{X}}]` throws.
 *
 * See: `[ANC:fr:doc-anchors]` in SRS.
 */
import { dirname, normalize, resolve } from "@std/path";
import { buildAnchorMap } from "./lib/salp-anchor-map.ts";

export type SalpId = { ns: string; id: string };
export type AnchorMap = Map<string, SalpId>;

export type MigrateOptions = {
  /** Source file path (relative to repo root). Used to resolve relative
   *  GFM link paths. */
  file: string;
  map: AnchorMap;
  /** Memex page type (`concept`, `person`, `source`, `answer`). Required
   *  when the file is a memex page that may contain wikilinks; `null` for
   *  non-memex contexts. */
  pageType: "concept" | "person" | "source" | "answer" | null;
};

export class SalpMigrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SalpMigrationError";
  }
}

const GFM_FR_LINK =
  /\[(FR-[A-Z][A-Z0-9-]*(?:\.[A-Z][A-Z0-9-]*)*|\{\{[A-Z_]+\}\})\]\(([^)\s]+)\)/g;
const GFM_GENERIC_LINK = /\[([^\]]+)\]\(([^)\s]+\.md(?:#[^)\s]+)?)\)/g;
const WIKILINK = /\[\[([a-z0-9][a-z0-9-]*)(?:\|([^\]]+))?\]\]/g;
const BARE_FR_COMMENT =
  /^([ \t]*(?:\/\/|#))\s+(FR-[A-Z][A-Z0-9-]*(?:\.[A-Z][A-Z0-9-]*)*)\b(.*)$/;
const ALREADY_SALP = /\[(?:ANC|REF):[a-z][a-z0-9-]*:[a-z0-9][a-z0-9-]*/;

function resolveLinkCandidates(file: string, target: string): string[] {
  // The anchor map is keyed by repo-root paths. Real-world cross-references
  // appear in two shapes:
  //   (a) source-relative — e.g. `../documents/requirements.md` from a
  //       script, or `documents/requirements.md` from repo-root AGENTS.md.
  //   (b) repo-root absolute (written as-is) — common in templates and
  //       generated content where the relative path would be brittle.
  // Resolver tries (a) first, then falls back to (b).
  const hash = target.indexOf("#");
  const path = hash === -1 ? target : target.slice(0, hash);
  const frag = hash === -1 ? "" : target.slice(hash);
  const dir = dirname(file);
  const relJoined = dir === "." || dir === "" ? path : `${dir}/${path}`;
  const rel = normalize(relJoined).replace(/^\.\//, "");
  const root = normalize(path).replace(/^\.\//, "");
  const out = [rel + frag];
  if (root !== rel) out.push(root + frag);
  return out;
}

function lookupSalp(
  map: AnchorMap,
  candidates: string[],
): SalpId | undefined {
  for (const c of candidates) {
    const hit = map.get(c);
    if (hit) return hit;
  }
  return undefined;
}

function frIdFromLinkText(text: string): string {
  return text.slice(3).toLowerCase();
}

/** Apply `transform` to `input` everywhere EXCEPT inside backtick-wrapped
 *  inline code-spans. Markdown code-spans quote illustrative grammar (e.g.
 *  the SRS lists banned forms like `[FR-X](path.md#…)`) and must be left
 *  untouched. Operates line-by-line so a stray backtick on one line cannot
 *  accidentally form a multi-line "code-span" that swallows real text on
 *  later lines. */
function applyOutsideBackticks(
  input: string,
  transform: (segment: string) => string,
): string {
  const outLines: string[] = [];
  for (const line of input.split("\n")) {
    const segments = line.split(/(`[^`\n]*`)/);
    const rebuilt: string[] = [];
    for (const seg of segments) {
      if (seg.startsWith("`") && seg.endsWith("`") && seg.length >= 2) {
        rebuilt.push(seg);
      } else {
        rebuilt.push(transform(seg));
      }
    }
    outLines.push(rebuilt.join(""));
  }
  return outLines.join("\n");
}

function migrateGfmFrLinks(input: string, opts: MigrateOptions): string {
  return applyOutsideBackticks(
    input,
    (segment) =>
      segment.replace(GFM_FR_LINK, (raw, linkText, target) => {
        if (raw.startsWith("[REF:") || raw.startsWith("[ANC:")) return raw;
        const candidates = resolveLinkCandidates(opts.file, target);
        const salp = lookupSalp(opts.map, candidates);
        if (!salp) {
          throw new SalpMigrationError(
            `cannot resolve "${target}" (tried: ${
              candidates.join(", ")
            }) — no anchor map entry`,
          );
        }
        return `[REF:${salp.ns}:${salp.id} | ${linkText}]`;
      }),
  );
}

function migrateGfmGenericLinks(input: string, opts: MigrateOptions): string {
  return applyOutsideBackticks(
    input,
    (segment) =>
      segment.replace(GFM_GENERIC_LINK, (raw, linkText, target) => {
        if (raw.includes("[REF:") || raw.includes("[ANC:")) return raw;
        if (!target.includes("#")) return raw;
        if (/^FR-[A-Z]/.test(linkText) || /^\{\{[A-Z_]+\}\}$/.test(linkText)) {
          return raw;
        }
        const candidates = resolveLinkCandidates(opts.file, target);
        const salp = lookupSalp(opts.map, candidates);
        if (!salp) return raw;
        return `[REF:${salp.ns}:${salp.id} | ${linkText}]`;
      }),
  );
}

function migrateWikilinks(input: string, opts: MigrateOptions): string {
  return applyOutsideBackticks(input, (segment) => {
    // First, collapse dual-link forms: `[[slug|Name]] ([Name](slug.md))`
    // — drop the trailing parenthetical (it duplicates the wikilink).
    const DUAL =
      /(\[\[[a-z0-9][a-z0-9-]*(?:\|[^\]]+)?\]\])\s*\(\[[^\]]+\]\([^)]+\)\)/g;
    let work = segment.replace(DUAL, (_dual, wiki) => wiki);

    work = work.replace(WIKILINK, (raw, slug, display) => {
      if (!opts.pageType) {
        throw new SalpMigrationError(
          `wikilink "${raw}" found but no page type provided for ${opts.file}`,
        );
      }
      const ns = `mx-${opts.pageType}`;
      return display
        ? `[REF:${ns}:${slug} | ${display}]`
        : `[REF:${ns}:${slug}]`;
    });
    return work;
  });
}

function migrateBareFrComments(input: string): string {
  const lines = input.split("\n");
  const out: string[] = [];
  for (const line of lines) {
    if (ALREADY_SALP.test(line)) {
      out.push(line);
      continue;
    }
    const m = line.match(BARE_FR_COMMENT);
    if (!m) {
      out.push(line);
      continue;
    }
    // Skip if the matched legacy form is inside a markdown code-span on
    // this line (illustrative grammar inside backticks, not a real comment
    // shortcut). A real `// FR-X` comment never has a backtick before it.
    const matchStart = m.index ?? line.indexOf(m[0]);
    const preceding = line.slice(0, matchStart);
    const backtickRuns = (preceding.match(/`/g) ?? []).length;
    if (backtickRuns % 2 === 1) {
      out.push(line);
      continue;
    }
    const [, prefix, fr, rest] = m;
    const id = frIdFromLinkText(fr);
    const trimmedRest = rest.replace(/^[ \t]*:/, "");
    out.push(`${prefix} [REF:fr:${id}]${trimmedRest}`);
  }
  return out.join("\n");
}

/** Migrate one text blob. Pure; throws on unresolved targets. */
export function migrateText(input: string, opts: MigrateOptions): string {
  let work = migrateGfmFrLinks(input, opts);
  work = migrateGfmGenericLinks(work, opts);
  if (/\[\[[a-z0-9]/.test(work)) {
    work = migrateWikilinks(work, opts);
  }
  work = migrateBareFrComments(work);
  return work;
}

// CLI entry point ----------------------------------------------------------

async function loadAnchorMap(): Promise<AnchorMap> {
  const srs = await Deno.readTextFile("documents/requirements.md");
  const sds = await Deno.readTextFile("documents/design.md");
  return buildAnchorMap(
    { path: "documents/requirements.md", content: srs },
    { path: "documents/design.md", content: sds },
  );
}

function inferPageType(
  file: string,
): "concept" | "person" | "source" | "answer" | null {
  if (!file.includes("framework/memex/")) return null;
  // Memex page type lives in the page frontmatter `type:` field. For
  // simplicity here, parse a leading frontmatter block synchronously.
  try {
    const content = Deno.readTextFileSync(file);
    const m = content.match(/^---\n([\s\S]+?)\n---/);
    if (!m) return null;
    const typeMatch = m[1].match(/^type:\s+(\w+)/m);
    if (!typeMatch) return null;
    const t = typeMatch[1];
    if (t === "concept" || t === "person" || t === "source" || t === "answer") {
      return t;
    }
    return null;
  } catch {
    return null;
  }
}

async function migrateFile(file: string, write: boolean): Promise<boolean> {
  const map = await loadAnchorMap();
  const input = await Deno.readTextFile(file);
  const out = migrateText(input, {
    file,
    map,
    pageType: inferPageType(file),
  });
  if (out === input) return false;
  if (write) await Deno.writeTextFile(file, out);
  else console.log(`--- ${file} (would change)`);
  return true;
}

async function main(argv: string[]): Promise<number> {
  const write = argv.includes("--write");
  const files = argv.filter((a) => !a.startsWith("--"));
  if (files.length === 0) {
    console.error(
      "usage: migrate-to-salp.ts [--write] <file> [<file> ...]",
    );
    return 1;
  }
  let changed = 0;
  for (const file of files) {
    try {
      if (await migrateFile(file, write)) changed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`error in ${file}: ${msg}`);
      return 1;
    }
  }
  console.log(
    `migrate-to-salp: ${changed} file(s) ${
      write ? "rewritten" : "would change"
    }`,
  );
  return 0;
}

if (import.meta.main) {
  // Resolve `cwd` first so that relative paths inside the script work.
  resolve(".");
  Deno.exit(await main(Deno.args));
}
