/**
 * Composite skill list — derived from framework/composites.yaml
 * (FR-SKILL-COMPOSE). Replaces the legacy `scripts/composite-skills.ts`
 * hardcoded `COMPOSITE_SKILLS` array, removed in Commit 5 of
 * generate-skills-from-atoms.
 *
 * Consumers:
 *   - scripts/check-skills.ts `validateProgressiveDisclosure`: exempts
 *     composite SKILL.md files from the 5000-token cap (their byte count
 *     is mechanically dictated by the inlined atom sources; the 500-line
 *     cap and frontmatter catalog cap still apply).
 *
 * Parses the manifest synchronously on import. If composites are added /
 * renamed, the next `deno task check` picks them up without further code
 * changes.
 */
import { parse as parseYaml } from "@std/yaml";

const MANIFEST_PATH = "framework/composites.yaml";

let cached: ReadonlySet<string> | null = null;

function loadCompositeNames(): ReadonlySet<string> {
  if (cached) return cached;
  let raw: string;
  try {
    raw = Deno.readTextFileSync(MANIFEST_PATH);
  } catch (e) {
    throw new Error(
      `[composite-list] cannot read ${MANIFEST_PATH}: ${
        e instanceof Error ? e.message : String(e)
      }`,
    );
  }
  const parsed = parseYaml(raw) as { composites?: Record<string, unknown> };
  const names = new Set<string>(Object.keys(parsed?.composites ?? {}));
  cached = names;
  return names;
}

export function compositeNames(): ReadonlySet<string> {
  return loadCompositeNames();
}

export function isComposite(skillName: string): boolean {
  return loadCompositeNames().has(skillName);
}
