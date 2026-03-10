# FR-21.1: agentskills.io Compliance

## Goal

Ensure all framework skills conform to agentskills.io standard (directory structure, frontmatter, progressive disclosure, file references) so they work identically across Cursor, Claude Code, and OpenCode.

## Overview

### Context

FR-21.1 is a sub-requirement of FR-21 (Universal Skill & Script Requirements). It defines 4 acceptance criteria for structural compliance of all skills in `framework/skills/`. The agentskills.io standard mandates a specific directory layout, frontmatter schema, token budgets, and reference depth limits.

Dependency chain: FR-17 → FR-21 → FR-10 → FR-20.

### Current State

**FR-21.1.1 Directory structure** — 3 violations found:
- `flow-skill-ai-skel-ts/`: 4 reference files (`reference-core.md`, `reference-fetchers.md`, `reference-observability.md`, `reference-session.md`) at skill root instead of in `references/` subdirectory
- `flow-skill-draw-mermaid-diagrams/`: `SPEC.md` at skill root — not a standard convention
- `flow-skill-write-agent-benchmarks/`: `examples/` and `reference/` dirs — non-standard names (standard: `references/`, `assets/`)

**FR-21.1.2 Frontmatter** — 2 violations found:
- All 36 skills: `name` matches dir, ≤64 chars (max 41), charset `[a-z0-9-]`, no leading/trailing `-`, no `--` — **PASS**
- `flow-skill-setup-ai-ide-devcontainer/`: description 1098 chars (limit 1024, over by 74)
- `flow-skill-ai-skel-ts/`: description ~1008 chars (limit 1024, borderline — needs precise measurement)
- `disable-model-invocation` field used in 16 skills — allowed per FR-21.1.2 but not in agentskills.io spec (project extension)

**FR-21.1.3 Progressive disclosure** — Structurally compliant (all <500 lines, estimated <5000 tokens). No automated enforcement/validation exists.

**FR-21.1.4 File references** — All references are 1 level deep. No nested chains detected.

### Constraints

- Changes only to `framework/skills/` contents (move/rename files, update SKILL.md references)
- Validation script must be in Deno/TypeScript (FR-21.4.1)
- Must not break existing skill functionality or benchmark results
- Script must be non-interactive, structured output, idempotent (FR-21.3)
- Must work across all 3 IDEs without modification

## Definition of Done

- [x] All skills pass FR-21.1.1: only `SKILL.md` + `scripts/`, `references/`, `assets/`, `evals/` at skill root
- [x] All skills pass FR-21.1.2: frontmatter validated (name matches dir, ≤64 chars, `[a-z0-9-]`; description ≤1024 chars)
- [x] All skills pass FR-21.1.3: SKILL.md <500 lines and <5000 tokens; catalog metadata <100 tokens
- [x] All skills pass FR-21.1.4: no nested reference chains (depth >1 from SKILL.md)
- [x] Validation script `scripts/check-skills.ts` automates all 4 checks for both `framework/skills/` and `.dev/skills/`
- [x] `deno task check` includes the validation (already wired — no changes needed)
- [x] All existing benchmarks still pass after changes (no benchmarks exist for affected skills; 84/84 unit tests pass)
- [x] FR-21.1.1 in `documents/requirements.md` updated to include `evals/`

## Solution

### Step 1: RED — Write validation tests

Extend existing `scripts/check-skills.test.ts` (or create if absent) covering all FR-21.1 criteria:
- FR-21.1.1: reject non-standard files/dirs at skill root; accept only `SKILL.md` + `scripts/`, `references/`, `assets/`, `evals/`
- FR-21.1.2: name charset `[a-z0-9-]`, no `^-`/`-$`/`--`, ≤64 chars, matches dir; description ≤1024 chars; required fields present
- FR-21.1.3: SKILL.md <500 lines, <5000 tokens (chars/4 approximation — documented in script; adequate as guardrail since all skills are well under limit)
- FR-21.1.4: no subdirectories inside `references/`, `scripts/`, `assets/`, `evals/` (simple depth check — no markdown link-chain parsing, which would be over-engineering given 0 current violations)

### Step 2: GREEN — Extend `scripts/check-skills.ts`

Extend the existing validation script (currently only checks name-dir match) with all 4 criteria. Keep structured output (pass/fail per skill per criterion). Exit 1 on any failure. Already integrated into `deno task check` — no wiring changes needed.

Scan targets: both `framework/skills/` (source of truth) AND `.dev/skills/` (includes 4 dev-only skills). This ensures dev skills also comply.

### Step 3: Fix FR-21.1.1 — Directory structure violations

**3a.** `flow-skill-ai-skel-ts/`:
- Create `references/` subdir
- Move `reference-core.md`, `reference-fetchers.md`, `reference-observability.md`, `reference-session.md` → `references/`
- Update all paths in SKILL.md

**3b.** `flow-skill-draw-mermaid-diagrams/`:
- Create `references/` subdir
- Move `SPEC.md` → `references/SPEC.md`
- Update path in SKILL.md

**3c.** `flow-skill-write-agent-benchmarks/`:
- Rename `reference/` → `references/`
- Move `examples/` → `assets/` (preserve file names for clarity since "examples" semantics is lost; SKILL.md references explain their purpose)
- Update all paths in SKILL.md

### Step 4: Fix FR-21.1.2 — Description length violations

**4a.** `flow-skill-setup-ai-ide-devcontainer/SKILL.md`: trim description from 1098 → ≤1024 chars (remove redundant explanation of container behavior)

**4b.** `flow-skill-ai-skel-ts/SKILL.md`: measure exact char count first; trim only if >1024

### Step 5: Refresh symlinks

Run `deno task link` to refresh symlinks after file moves. (Already runs as first step of `deno task check`, but run explicitly to verify symlinks resolve correctly before final check.)

### Step 6: REFACTOR — Run `deno task check`

Confirm all skills (framework + dev) pass all 4 criteria. Fix any issues found.

### Step 7: Verify — Run benchmarks

Check which benchmarks exist for the 3 affected skills:
- `flow-skill-ai-skel-ts`
- `flow-skill-draw-mermaid-diagrams`
- `flow-skill-write-agent-benchmarks`

If benchmarks exist: run `deno task bench` and confirm no regressions. If no benchmarks exist for a skill: do a smoke test (activate skill, verify references resolve). If benchmark references break due to file moves: update them.

### Step 8: Update requirements

Update FR-21.1.1 in `documents/requirements.md` to add `evals/` to the allowed directory list (aligning with agentskills.io spec).
