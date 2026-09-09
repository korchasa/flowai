/**
 * Single source of truth for skill / composite SKILL.md size limits.
 *
 * Consumers (keep this list current when adding new ones):
 *   - scripts/check-skills.ts — FR-UNIVERSAL.DISCLOSURE and FR-DESC-QUALITY
 *     validators.
 *   - scripts/generate-skill-composites.ts — atom and composite canon
 *     validators.
 *   - scripts/check-skills_test.ts — boundary tests.
 *
 * Why a shared module: these are policy values, not arbitrary literals.
 * Drifting copies in different validators are silent bugs (a composite that
 * sits between two thresholds would be accepted by one validator and
 * rejected by another).
 *
 * Cap rationale:
 *   - 700 lines: covers a `review`-class atom (≈400 lines) inlined into the
 *     longest composite (`ship`, 5 phases) with headroom for one more
 *     phase. Bump only when a new composite phase or major atom growth
 *     justifies it; document the reason in the bump commit.
 *   - 10000 tokens (chars/4): bumped from the original 5000
 *     (agentskills.io progressive-disclosure guidance) — the 5000 cap
 *     forced lossy prose compression on grown atoms (e.g. the review
 *     existing-suite gate, commit 1b101164). Composites listed in
 *     framework/composites.yaml are exempt (see
 *     scripts/lib/composite-list.ts) because their byte count is
 *     mechanically dictated by inlined atom sources; standalone skills are
 *     not exempt and must stay under this cap.
 *   - 100 frontmatter tokens (catalog metadata = name + description):
 *     agentskills.io cap on what is loaded at session start. NOTE: while
 *     DESCRIPTION_MAX_CHARS stands, this cap can no longer be reached — a
 *     conforming skill tops out around 70 tokens — so it states the spec
 *     ceiling rather than gating anything. Re-derive it if the description
 *     cap moves.
 *   - 250 description characters: the IDE skill listing shows one line per
 *     installed skill on every turn, and Claude Code budgets that listing at
 *     ~1% of the context window with a 250 char/skill cap
 *     (documents/ides-difference.md). Past that the entry is truncated and
 *     description-based routing degrades. This is a per-ENTRY ceiling: it does
 *     not by itself keep a multi-pack listing inside the total budget.
 */

/** Max lines of a rendered composite or standalone SKILL.md. */
export const SKILL_MAX_LINES = 700;
/** Max lines of an atom source file (caps authoring cruft). */
export const ATOM_MAX_LINES = 1000;
/** Max tokens (chars/4) of a non-composite SKILL.md. */
export const SKILL_MAX_TOKENS = 10000;
/** Max tokens (chars/4) of frontmatter catalog metadata (name + description). */
export const FRONTMATTER_MAX_TOKENS = 100;
/** Max characters of a single `description`, per the IDE skill-listing budget. */
export const DESCRIPTION_MAX_CHARS = 250;
