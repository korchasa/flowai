/**
 * Builds the migration anchor map: `gfmAutoSlug` → `{ns, id}`.
 *
 * Drives `scripts/migrate-to-salp.ts` — for each legacy
 * `[X](documents/requirements.md#fr-x-…)` GFM link, the resolver looks
 * up the GFM auto-slug in this map to get the SALP `{ns, id}` pair.
 *
 * Sources:
 *   - SRS (`documents/requirements.md`) — `### FR-X:` or `#### FR-X.Y` headings
 *     → `{ns: "fr", id: lowercaseKebab(X)}` indexed by the heading's
 *     GFM auto-slug.
 *   - SDS (`documents/design.md`) — `### N.M[.K] <Title>` headings
 *     → `{ns: "sds", id: "N-M-K"}` indexed by the heading's GFM auto-slug.
 *
 * Frozen-at-start: the migration script calls this once, holds the result,
 * then mutates SRS/SDS — guaranteeing the anchor map reflects pre-migration
 * state.
 */
import { computeAutoSlug } from "../check-traceability.ts";

export type SalpId = { ns: string; id: string };
export type AnchorMap = Map<string, SalpId>;

const FR_HEADING = /^#{2,4}\s+(FR-[A-Z][A-Z0-9-]*(?:\.[A-Z][A-Z0-9-]*)*)/;
const SDS_HEADING = /^#{2,4}\s+(\d+(?:\.\d+)+(?:[a-z])?)\s+(.+?)\s*$/;

/** Strip trailing `[ANC:ns:id]` markers (and surrounding whitespace) from
 *  a heading line BEFORE computing its GFM auto-slug. The slug must match
 *  what GFM produced BEFORE the SALP migration injected the anchor — that
 *  is the slug the old `[X](path.md#…)` links were written against. */
function stripAnchorTokens(headingText: string): string {
  return headingText.replace(/\s*\[ANC:[^\]]+\]\s*/g, "").trimEnd();
}

/** Parse SRS headings and yield `{slug, salp}` pairs. The slug is the GFM
 *  auto-slug computed against the FULL heading text (matching how GitHub
 *  resolves `requirements.md#fr-cmd-exec-command-execution`). Any inline
 *  `[ANC:ns:id]` markers are stripped from the heading before slug
 *  computation so legacy GFM cross-references continue to resolve through
 *  the SALP migration. */
export function extractFrAnchors(
  srsContent: string,
): Array<{ slug: string; salp: SalpId }> {
  const out: Array<{ slug: string; salp: SalpId }> = [];
  const seen = new Map<string, number>();
  for (const line of srsContent.split("\n")) {
    const m = line.match(/^#{1,6}\s+(.+?)\s*$/);
    if (!m) continue;
    const headingText = stripAnchorTokens(m[1]);
    const baseSlug = computeAutoSlug(headingText);
    const count = seen.get(baseSlug) ?? 0;
    seen.set(baseSlug, count + 1);
    const slug = count === 0 ? baseSlug : `${baseSlug}-${count}`;
    const fr = headingText.match(FR_HEADING)?.[1] ??
      line.match(FR_HEADING)?.[1];
    if (!fr) continue;
    const id = fr.slice(3).toLowerCase();
    out.push({ slug, salp: { ns: "fr", id } });
  }
  return out;
}

/** Parse SDS section headings — `### 3.1.1 Title`, `### 3.4a Title`. */
export function extractSdsAnchors(
  sdsContent: string,
): Array<{ slug: string; salp: SalpId }> {
  const out: Array<{ slug: string; salp: SalpId }> = [];
  const seen = new Map<string, number>();
  for (const line of sdsContent.split("\n")) {
    const m = line.match(/^#{1,6}\s+(.+?)\s*$/);
    if (!m) continue;
    const headingText = stripAnchorTokens(m[1]);
    const baseSlug = computeAutoSlug(headingText);
    const count = seen.get(baseSlug) ?? 0;
    seen.set(baseSlug, count + 1);
    const slug = count === 0 ? baseSlug : `${baseSlug}-${count}`;
    const sds = line.match(SDS_HEADING);
    if (!sds) continue;
    const id = sds[1].replace(/\./g, "-").toLowerCase();
    out.push({ slug, salp: { ns: "sds", id } });
  }
  return out;
}

/** Build the unified anchor map. Keys are tagged with their target file
 *  (relative to repo root) so the migration script can distinguish
 *  `requirements.md#fr-x` from a coincidental slug in a different file. */
export function buildAnchorMap(
  srs: { path: string; content: string },
  sds: { path: string; content: string },
): AnchorMap {
  const map: AnchorMap = new Map();
  for (const { slug, salp } of extractFrAnchors(srs.content)) {
    map.set(`${srs.path}#${slug}`, salp);
  }
  for (const { slug, salp } of extractSdsAnchors(sds.content)) {
    map.set(`${sds.path}#${slug}`, salp);
  }
  return map;
}
