---
date: 2026-09-15
status: done
implements:
  - FR-DIAGNOSE-BENCH
---
# Split `diagnose-benchmark-failure`: ship the method, keep our plumbing home

## Goal

A skill we ship should teach a method that works in the user's project. Today
`diagnose-benchmark-failure` teaches this repository's directory layout, so a
user who installs it is told to open files that exist only here. Splitting the
two halves makes the shipped skill usable outside this repo and keeps our own
paths where they stay accurate.

## Overview

### Context

The skill is the only shipped file that names this repo's acceptance-run
artefacts: `grep -rln "acceptance-tests/runs\|judge-evidence.md\|bench-home"
framework --include='*.md'` returns it and `framework/AGENTS.md` alone. Its
sibling `write-agent-benchmarks` shows the register we want — it opens by
calling itself a universal, language-agnostic standard.

Of 324 lines, 48 name an artefact of ours and 17 name a public CLI (codex,
claude). The CLI lines are legitimate: rollout formats and resume commands are
public, and a user of those CLIs needs them. The 48 are not.

### Current State

- Shipped skill: `framework/engineering/skills/diagnose-benchmark-failure/SKILL.md`.
- Coverage: 5 acceptance scenarios (2 behavioural, 3 trigger). Both behavioural
  fixtures stage a run in OUR layout, so they cannot detect the coupling.
- The SRS clause FR-DIAGNOSE-BENCH repeats the same concrete paths in its
  Description and Constraints.
- Dev-only skills live in `.claude/skills/` (5 of them today) and are
  discovered by `check-skills.ts`, which skips framework-only checks for them.

### Constraints

- Acceptance Test TDD: the shipped skill changes, so a scenario proving the new
  behaviour comes first and MUST fail before the edit.
- The general method must not be weakened to reach generality. The four
  artefact kinds, the histogram-before-hypothesis rule and the interview step
  stay mandatory.
- The taxonomy keeps its codes. Modes that describe a model's behaviour stay in
  the shipped skill; modes that describe our runner move or are restated
  without our file names.

## Definition of Done

- [x] FR-DIAGNOSE-BENCH: the shipped skill diagnoses a failed run whose
      artefacts sit in a layout it was never told about, instead of failing
      closed on a missing `judge-evidence.md`.
  - Test: `framework/engineering/skills/diagnose-benchmark-failure/acceptance-tests/foreign-layout/mod.ts`
  - Evidence: `deno task acceptance-tests -f diagnose-benchmark-failure-foreign-layout --no-cache`
  - Result: RED 2026-09-15T14-52-46 — 2/6, `no_fail_closed_on_names` ERROR ("the agent explicitly stopped because expected names were absent"). GREEN 2026-09-15T14-54-44 — 6/6 PASSED, 77.6 s.
- [x] FR-DIAGNOSE-BENCH: the shipped SKILL.md names no path, file name, flag or
      script belonging to this repo's harness.
  - Evidence: `grep -nE "acceptance-tests/runs|judge-evidence|bench-home|scripts/acceptance-tests|--no-cache|Copying packs|scenario\.skill|framework/<pack>" framework/engineering/skills/diagnose-benchmark-failure/SKILL.md` — no output
  - Result: no output (exit 1 on both halves of the pattern; ugrep needs `-e` for the `--no-cache` literal).
- [x] FR-DIAGNOSE-BENCH: the two existing behavioural scenarios still pass on
      our own layout.
  - Test: `diagnose-benchmark-failure-raw-session`, `diagnose-benchmark-failure-md-prior-bullets`
  - Evidence: `deno task acceptance-tests -f diagnose-benchmark-failure --no-cache`
  - Result: run separately per scenario, both `--no-cache`, both PASSED 2026-09-15 (exit 0 each). The
    full five-scenario sweep under `-f diagnose-benchmark-failure` is the CHECK step and stays with the user.
- [x] FR-DIAGNOSE-BENCH: a project-level skill carries every concrete detail the
      shipped skill drops — run-dir path, artefact names, judge-rendering
      sections, scenario fields, cache flag, runner messages.
  - Evidence: `deno run -A scripts/check-skills.ts` — passes with the new dev skill discovered
  - Evidence: each literal removed from the shipped skill appears in `.claude/skills/diagnose-acceptance-run/SKILL.md`
  - Result: all 14 literals present — `acceptance-tests/runs` 2, `judge-evidence.md` 2, `bench-home` 8, `cache.ts` 1, `--no-cache` 2, `Copying packs` 1, `scenario.skill` 1, `USER INPUT` 1, `mod.ts` 2, `userQuery` 1, `userPersona` 1, `agentsTemplateVars` 1, `framework/AGENTS.md` 1, `readlink` 3.
- [x] FR-DIAGNOSE-BENCH: SRS, README and AGENTS.md describe the split.
  - Evidence: `deno task check` — exit 0, `0 failed` in both summaries
  - Result: 2026-09-15 — `819 passed | 0 failed` and `187 passed | 0 failed`; the only real
    `=== FAIL` was `check-task-format` reporting this file's own status/DoD mismatch (the other
    three are the intentional `deno eval Deno.exit(N)` fixtures). Re-run after the flip is clean.

## Solution

1. RED: add scenario `foreign-layout` with a fixture staging the four artefact
   kinds under names that are not ours (`evals/<ts>/<scenario>/attempt-1/`,
   `judge-report.md`, `workspace/`, `agent-home/`, `scenario.ts`). Run it and
   confirm it fails on discovery, not on something incidental.
2. GREEN: rewrite the shipped SKILL.md around the four artefact kinds. Step 1
   becomes "identify the run dir and the four artefacts, whatever this project
   calls them", with a named hand-off: when the project supplies its own
   addendum skill, read it first.
3. Move the concrete half into `.claude/skills/diagnose-acceptance-run/`.
4. Restate the runner-specific taxonomy modes without our file names; keep the
   codes.
5. Re-run the new scenario, then both behavioural scenarios.
6. Update SRS FR-DIAGNOSE-BENCH, README's one-line catalogue entry and the
   AGENTS.md architecture list. Run `deno task check`.
