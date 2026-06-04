/**
 * SALP — Semantic Anchor / Link Protocol.
 *
 * Pure parser + serializer for the canonical cross-reference grammar:
 *
 *   - Anchor:     `[ANC:<ns>:<id>]`
 *   - Reference:  `[REF:<ns>:<id>]` or `[REF:<ns>:<id> | <display>]`
 *
 * Where:
 *   - `<ns>` matches `[a-z][a-z0-9-]*`. The set is open — any value matching
 *     the grammar is accepted. `EXAMPLE_NAMESPACES` enumerates the ones in
 *     active use by this project as a documentation hint, NOT as a closed
 *     allowlist.
 *   - `<id>` matches `[a-z0-9][a-z0-9-]*`.
 *   - `<display>` is free-form text up to the closing `]` (trimmed).
 *
 * SALP-short (`[ANC:id]` / `[REF:id]`, no namespace) is REJECTED by design:
 * the namespace is what disambiguates multi-hop traversal across heterogeneous
 * page types (`mx-concept` vs `mx-source` carrying the same slug).
 *
 * No I/O. Throws `SalpSyntaxError` on grammar violation so callers (validator,
 * migration script) can surface a single uniform error type.
 */

/** Example namespaces currently in use across this project. Provided as a
 *  documentation hint only — the validator does NOT restrict `<ns>` to this
 *  set. Any value matching the grammar `[a-z][a-z0-9-]*` is accepted; new
 *  consumers may introduce new namespaces without touching this list. */
export const EXAMPLE_NAMESPACES: readonly string[] = [
  "fr",
  "sds",
  "task",
  "nfr",
  "code",
  "mx-concept",
  "mx-person",
  "mx-source",
  "mx-answer",
];

export type SalpPos = { line: number; col: number };

export type SalpAnchor = { ns: string; id: string; pos: SalpPos };

export type SalpRef = {
  ns: string;
  id: string;
  display?: string;
  pos: SalpPos;
};

export type LegacyGrammarKind =
  | "gfm-fr-link"
  | "wikilink"
  | "bare-fr-comment";

export type LegacyGrammarHit = {
  kind: LegacyGrammarKind;
  raw: string;
  pos: SalpPos;
};

/** Thrown on any grammar violation. Carries position so the validator can
 *  surface `file:line:col` diagnostics. */
export class SalpSyntaxError extends Error {
  constructor(
    message: string,
    public readonly pos: SalpPos,
    public readonly snippet: string,
  ) {
    super(`${message} at line ${pos.line}, col ${pos.col}: ${snippet}`);
    this.name = "SalpSyntaxError";
  }
}

const NS_RE = "[a-z][a-z0-9-]*";
/** ID grammar allows lowercase alphanumerics, hyphen, and period. Period
 *  preserves hierarchical FR IDs (`FR-ACCEPT.TRIGGER` → `accept.trigger`,
 *  `FR-DIST.MARKETPLACE` → `dist.marketplace`). Period MUST appear between
 *  alphanumerics — no leading or trailing dot, no consecutive dots. */
const ID_RE = "[a-z0-9](?:[a-z0-9-]*(?:\\.[a-z0-9][a-z0-9-]*)*)?";

const ANC_OK_RE = new RegExp(`^\\[ANC:(${NS_RE}):(${ID_RE})\\]$`);
const REF_OK_RE = new RegExp(
  `^\\[REF:(${NS_RE}):(${ID_RE})(?:\\s*\\|\\s*([^\\]]+?))?\\]$`,
);

/** Greedy scan: find every `[ANC:…]` token, valid or not, so the parser can
 *  reject salp-short and other malformations explicitly. */
const ANC_SCAN_RE = /\[ANC:([^\]]*)\]/g;
const REF_SCAN_RE = /\[REF:([^\]]*)\]/g;

/** Parse all SALP anchors out of `text`. Throws `SalpSyntaxError` on any
 *  malformed `[ANC:…]` occurrence. */
export function parseAnchors(text: string): SalpAnchor[] {
  return scanTokens(text, "ANC", ANC_SCAN_RE, (raw, body, pos) => {
    const m = raw.match(ANC_OK_RE);
    if (!m) {
      // Distinguish salp-short (`[ANC:id]`, no namespace separator) from
      // other malformations to give the user a clearer error.
      if (!body.includes(":")) {
        throw new SalpSyntaxError(
          "SALP anchor must include namespace (salp-short form rejected)",
          pos,
          raw,
        );
      }
      throw new SalpSyntaxError(
        "Invalid SALP anchor grammar",
        pos,
        raw,
      );
    }
    return { ns: m[1], id: m[2], pos };
  });
}

/** Parse all SALP references out of `text`. Throws on malformation. */
export function parseRefs(text: string): SalpRef[] {
  return scanTokens(text, "REF", REF_SCAN_RE, (raw, body, pos) => {
    const m = raw.match(REF_OK_RE);
    if (!m) {
      if (!body.includes(":")) {
        throw new SalpSyntaxError(
          "SALP ref must include namespace (salp-short form rejected)",
          pos,
          raw,
        );
      }
      throw new SalpSyntaxError(
        "Invalid SALP ref grammar",
        pos,
        raw,
      );
    }
    const display = m[3]?.trim();
    const ref: SalpRef = { ns: m[1], id: m[2], pos };
    if (display) ref.display = display;
    return ref;
  });
}

function scanTokens<T>(
  text: string,
  _kind: "ANC" | "REF",
  scan: RegExp,
  build: (raw: string, body: string, pos: SalpPos) => T,
): T[] {
  const out: T[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    scan.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = scan.exec(line)) !== null) {
      const pos: SalpPos = { line: i + 1, col: m.index + 1 };
      out.push(build(m[0], m[1], pos));
    }
  }
  return out;
}

export function serializeAnchor(a: { ns: string; id: string }): string {
  return `[ANC:${a.ns}:${a.id}]`;
}

export function serializeRef(
  r: { ns: string; id: string; display?: string },
): string {
  return r.display
    ? `[REF:${r.ns}:${r.id} | ${r.display}]`
    : `[REF:${r.ns}:${r.id}]`;
}

/** Detect legacy cross-reference grammars surviving in source text. Used by
 *  the validator to reject files that should have been migrated. Returns
 *  position-tagged hits; does NOT throw. */
export function detectLegacyGrammars(text: string): LegacyGrammarHit[] {
  const out: LegacyGrammarHit[] = [];
  const lines = text.split("\n");
  // FR-shaped GFM link: `[FR-X](path.md#anchor)` or `[FR-X](path.md)`.
  const GFM_FR_LINK =
    /\[FR-[A-Z][A-Z0-9-]*(?:\.[A-Z][A-Z0-9-]*)*\]\([^)\s]+\)/g;
  // Wikilink: `[[slug]]` or `[[slug|Display]]`.
  const WIKILINK = /\[\[[a-z0-9][a-z0-9-]*(?:\|[^\]]+)?\]\]/g;
  // Bare `// FR-X` or `# FR-X` comment with no GFM link on the same line.
  const BARE_FR =
    /^[ \t]*(?:\/\/|#)\s+(FR-[A-Z][A-Z0-9-]*(?:\.[A-Z][A-Z0-9-]*)*)\b/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const m of line.matchAll(GFM_FR_LINK)) {
      out.push({
        kind: "gfm-fr-link",
        raw: m[0],
        pos: { line: i + 1, col: m.index + 1 },
      });
    }
    for (const m of line.matchAll(WIKILINK)) {
      out.push({
        kind: "wikilink",
        raw: m[0],
        pos: { line: i + 1, col: m.index + 1 },
      });
    }
    const bare = line.match(BARE_FR);
    if (bare) {
      // Skip lines that ALSO carry SALP or GFM: those are migrated, not legacy.
      const hasSalpRef = /\[REF:[a-z][a-z0-9-]*:[a-z0-9][a-z0-9-]*/.test(line);
      const hasGfmLink = /\[[^\]]+\]\([^)]+\)/.test(line);
      if (!hasSalpRef && !hasGfmLink) {
        out.push({
          kind: "bare-fr-comment",
          raw: bare[0].trim(),
          pos: { line: i + 1, col: line.indexOf(bare[1]) + 1 },
        });
      }
    }
  }
  return out;
}
