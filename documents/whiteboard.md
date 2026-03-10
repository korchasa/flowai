# FR-21.3–21.6: Universal Skill & Script Requirements — Close Remaining Criteria

## Goal

Close all open FR-21.3–21.6 acceptance criteria to unblock FR-10 (Global Framework Distribution). FR-10 is the project's core value proposition — distributing AssistFlow to end users — and cannot proceed until scripts are standardized.

## Overview

### Context

FR-21 defines 6 sub-requirements (FR-21.1–FR-21.6) for universal skill/script compliance. FR-21.1 and FR-21.2 are already closed (all `[x]`). 7 criteria remain open across FR-21.3–FR-21.6 (FR-21.3.4 excluded — `--help` requirement dropped).

Dependency chain from SRS: `FR-21.3–21.6 → FR-10 → end-user distribution`.

Scripts affected (framework scope only — root `scripts/` excluded per SRS scoping):
- Framework TS: `framework/skills/*/scripts/*.ts` — 10 CLI scripts + 3 test files
- Framework PY: `framework/skills/*/scripts/*.py` — 8 legacy files (6 with TS equivalents, 2 without)

### Current State

**FR-21.3.2 Structured output** — 1/10 framework TS scripts outputs JSON (`generate_agents.ts`). 9 output unstructured text (emoji + human-readable).

**FR-21.3.3 Self-contained dependencies** — 1 framework file uses bare `@std/` imports: `generate_agents.test.ts` (2 imports). All other framework scripts use `jsr:@std/`.

**FR-21.3.7 Idempotent** — 3 init scripts (`init_command.ts`, `init_skill.ts`, `init_rule.ts`) fail on re-run when target directory exists.

**FR-21.4.1 Framework scripts in Deno/TS** — 8 Python scripts remain. 6 have verified-complete TS equivalents. 2 need new TS scripts: `count_tokens.py` (token estimation), `validate.py` (Mermaid syntax validation via mmdc).

**FR-21.4.2 Deno/TS-only policy** — Project uses Deno/TS exclusively. Python not needed. Policy not documented in SDS.

**FR-21.5.3 allowed-tools hint** — 1/36 skills uses `allowed-tools` frontmatter. Requirement says "MAY" — optional adoption.

**FR-21.6.3 Name collision** — `task-link.ts` implements `.dev/` overrides `framework/` but behavior is undocumented in SDS.

### Constraints

- All changes must pass `deno task check` (fmt + lint + test + skill/agent validation)
- TDD: write/update tests before code changes
- Scripts in `framework/skills/*/scripts/` must use `jsr:` specifiers (standalone, no `deno.json`)
- Root scripts (`scripts/`) may use bare imports (they run with project `deno.json`)
- Must not break existing benchmarks (11 PASSED)
- Python removal: only delete `.py` when `.ts` equivalent is verified feature-complete

## Definition of Done

- [x] FR-21.3.2: All framework scripts output structured JSON (`{ "ok": bool, ... }`) to stdout; diagnostics to stderr. Including `generate_agents.ts` adapted to common schema.
- [x] FR-21.3.3: All framework scripts use `jsr:` specifiers (no bare `@std/`)
- [x] FR-21.3.4: Marked N/A in SRS (agents read SKILL.md for script interface, `--help` is redundant)
- [x] FR-21.3.7: Init scripts support `--skip-existing` flag; default: fail fast on conflict (exit 1 + clear error)
- [x] FR-21.4.1: No `.py` files in `framework/skills/`; all replaced by verified `.ts`
- [x] FR-21.4.2: Deno/TS-only policy documented in SDS (section 3.1.2)
- [x] FR-21.5.3: `allowed-tools` pattern documented in SDS (section 3.1.3)
- [x] FR-21.6.3: Name collision resolution documented in SDS (section 3.1.4); `task-link.ts` warns on collisions
- [x] All existing tests pass (`deno task check`) — 91 tests passed
- [x] SRS criteria updated with `[x]` / `[N/A]` and evidence paths

## Solution

**Strategy: Bottom-Up by Dependency (Variant A), refined by critique**

Each phase follows TDD: write/update test → implement → verify → `deno task check`.

---

### Phase 1: Python → TypeScript Migration (FR-21.4.1)

**Goal:** Remove all `.py` files from `framework/skills/`. Unblocks all subsequent phases.

**1.1 Delete 6 Python scripts with verified TS equivalents**
- Files: `init_command.py`, `validate_command.py`, `package_command.py`, `init_skill.py`, `validate_skill.py`, `package_skill.py`
- Pre-condition: Run each `.py` and `.ts` side-by-side on same input; diff outputs
- Action: Delete `.py` files; update any SKILL.md references from `.py` to `.ts`
- Verify: `deno task check`; existing tests in `command_scripts_test.ts`, `skill_scripts_test.ts`

**1.2 Write `count_tokens.ts`** (replaces `count_tokens.py`)
- Location: `framework/skills/flow-skill-analyze-context/scripts/count_tokens.ts`
- Logic: Simple char-based estimation (1 token ≈ 3.3 chars). Accept args or stdin.
- Output: JSON `{ "ok": true, "result": { "characters": N, "estimated_tokens": N } }` (already FR-21.3.2 compliant)
- Dependencies: None (pure Deno, no external imports needed)
- Test: New test file `count_tokens_test.ts`
- Delete `count_tokens.py` after verification

**1.3 Write `validate.ts`** (replaces `validate.py` for Mermaid)
- Location: `framework/skills/flow-skill-draw-mermaid-diagrams/scripts/validate.ts`
- Logic: Run `mmdc` via `Deno.Command` using `npm:@mermaid-js/mermaid-cli` (jsr-compatible, no npx dependency)
- Output: JSON `{ "ok": true, "result": { "valid": bool, "errors": [...] } }`
- Dependencies: `npm:@mermaid-js/mermaid-cli` via jsr import specifier
- Test: New test file `validate_test.ts`. Test strategy: mock `Deno.Command` to avoid runtime mmdc dependency in CI
- Delete `validate.py` after verification

**1.4 Update SKILL.md references**
- Grep all SKILL.md files for `.py` references; update to `.ts`
- Verify: `deno task check` (check-skills.ts validates references)

---

### Phase 2: Self-Contained Dependencies (FR-21.3.3)

**Goal:** All framework scripts use `jsr:` specifiers.

**2.1 Fix `generate_agents.test.ts`**
- Change `@std/assert` → `jsr:@std/assert`, `@std/path` → `jsr:@std/path`
- This is the only remaining file with bare imports in `framework/`
- Verify: `deno test framework/skills/flow-init/scripts/generate_agents.test.ts`

---

### Phase 3: Idempotency (FR-21.3.7)

**Goal:** Init scripts are safe to re-run with explicit opt-in.

**3.1 Update 3 init scripts**
- Files: `init_command.ts`, `init_skill.ts`, `init_rule.ts`
- Default behavior (fail fast): If target directory exists → exit 1 + clear error message to stderr: `"Error: directory '<path>' already exists. Use --skip-existing to skip."`
- `--skip-existing` flag: If target exists → print warning to stderr, exit 0 (idempotent mode)
- Test: Add 2 test cases per script:
  - "fails with exit 1 when target exists (default)"
  - "exits 0 with warning when target exists and --skip-existing passed"
- Verify: `deno task check`

---

### Phase 4: Structured JSON Output (FR-21.3.2)

**Goal:** All framework scripts output JSON to stdout, diagnostics to stderr.

**4.1 Define output schema convention**
- Success: `{ "ok": true, "result": { ... } }` to stdout
- Failure: `{ "ok": false, "error": "message", "details": [...] }` to stdout; human message to stderr
- Exit code: 0 on `ok: true`, non-zero on `ok: false`

**4.2 Adapt `generate_agents.ts`**
- Current: outputs raw analysis object directly
- Change: wrap in `{ "ok": true, "result": <current_output> }`
- Update SKILL.md for `flow-init` to parse new schema (access `.result` field)
- Update `generate_agents.test.ts` to expect new wrapper
- Verify: `deno task check`

**4.3 Migrate remaining scripts** (9 scripts)
- `init_*.ts`: Output `{ "ok": true, "result": { "path": "...", "files_created": [...] } }`
- `validate_*.ts`: Output `{ "ok": true, "result": { "valid": true } }` or `{ "ok": false, "error": "...", "details": [...] }`
- `package_*.ts`: Output `{ "ok": true, "result": { "archive": "path", "files": [...] } }`
- Move all `console.log` diagnostic messages to `console.error`
- Test: Update all existing tests to parse JSON output; verify stderr for diagnostics
- Verify: `deno task check`

---

### Phase 5: Documentation (FR-21.3.4, FR-21.4.2, FR-21.5.3, FR-21.6.3)

**Goal:** Close documentation-only criteria + mark FR-21.3.4 as N/A.

**5.1 FR-21.3.4 — Mark as N/A in SRS**
- Rationale: Agents read SKILL.md for script interface descriptions. `--help` duplicates SKILL.md content and adds maintenance burden. Not needed for agent-driven execution model.

**5.2 FR-21.4.2 — Document Deno/TS-only policy in SDS**
- Add section to `documents/design.md`: "Script Language Policy"
- Content: All project scripts (framework and root) use Deno/TypeScript exclusively. No Python dependencies.

**5.3 FR-21.5.3 — Document allowed-tools pattern in SDS**
- Add section to `documents/design.md`: "Skill Tool Hints"
- Content: Skills MAY use `allowed-tools` frontmatter to pre-approve tools. Example pattern. Adoption is optional per agentskills.io spec.

**5.4 FR-21.6.3 — Document name collision + add warning**
- Add section to `documents/design.md`: "Skill Name Collision Resolution"
- Content: `.dev/` skills override `framework/` skills. Project-level overrides user-level per agentskills.io.
- Code: Add collision detection to `task-link.ts` — warn to stderr when same skill name exists in both `.dev/` and `framework/`

**5.5 Update SRS**
- Mark completed criteria as `[x]` with evidence paths
- Mark FR-21.3.4 as `[N/A]` with rationale

---

### Phase 6: Final Verification

- Run `deno task check` — all tests, lint, format pass
- Run existing benchmarks (spot-check 2-3 passing scenarios)
- Review: no `.py` files in `framework/skills/`, all JSON output, `--skip-existing` works
- Commit with evidence summary

---

### Execution Order & Dependencies

```
Phase 1 (Python→TS) ──→ Phase 2 (deps) ──→ Phase 3 (idempotency)
                                                    │
                                                    ▼
                                            Phase 4 (JSON output)
                                                    │
                                                    ▼
                                            Phase 5 (docs)
                                                    │
                                                    ▼
                                            Phase 6 (verify)
```

### Estimated Scope

- **New files:** 4 (count_tokens.ts, count_tokens_test.ts, validate.ts, validate_test.ts)
- **Deleted files:** 8 (.py files)
- **Modified files:** ~15 (10 scripts + 3 test files + SRS + SDS)
- **Net file delta:** -4
