/**
 * Single source of truth for composite-skill names.
 *
 * Composite skills inline `<step_by_step>` blocks from 2+ source skills
 * (sync-enforced by `check-skill-sync.ts`). Their byte count is mechanically
 * dictated by the inlined sources, so the FR-UNIVERSAL.DISCLOSURE token cap
 * is relaxed for them — see `check-skills.ts` `validateProgressiveDisclosure`.
 * The 500-line cap and the 100-token frontmatter (catalog) cap still apply.
 *
 * Add a name here ONLY when adding a corresponding `SYNC_CHECKS` entry in
 * `check-skill-sync.ts`. The two lists must agree (verified by
 * `check-composite-list-sync` test).
 */
export const COMPOSITE_SKILLS = [
  "flowai-review-and-commit",
  "flowai-do-with-plan",
] as const;

export function isComposite(skillName: string): boolean {
  return (COMPOSITE_SKILLS as readonly string[]).includes(skillName);
}
