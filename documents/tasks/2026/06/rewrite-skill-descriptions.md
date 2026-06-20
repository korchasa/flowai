---
date: "2026-06-20"
status: in progress
implements: [FR-ACCEPT.TRIGGER, FR-DESC-QUALITY]
tags: [descriptions, skills, discovery, quality, lint-gate]
related_tasks: ["2026/05/remove-flowai-prefix-from-primitives.md"]
---
# Rewrite weak skill descriptions to WHAT+WHEN + add quality gate

## Goal

Skill/command `description` frontmatter is the only signal the model classifier
uses to decide *when* to invoke a `skills/` primitive (and the only at-a-glance
value statement for `commands/`). Eleven flagged descriptions fail the project's
own standard (engineer-skill §"Writing Effective Descriptions": include WHAT +
WHEN, third person, no internal implementation detail). The worst offenders are
agent-invocable `skills/` with no WHEN trigger at all — the classifier cannot
discover them. Variant 3 (selected): rewrite the flagged set AND add a
deterministic gate that fails `deno task check` when any `skills/` description
lacks a WHEN-trigger phrase, so the class of defect cannot recur silently.

Final scope (after the gate-scope decision below): **17 primitives edited** —
13 `skills/` (6 critical + 7 the gate additionally exposes), 2 atoms
(`commit`, `push`), 2 composites (`ship`, `ship-task`). `review-and-commit` is
already clean (no edit). Plus the new gate + FR-DESC-QUALITY.

Second enforcement surface (decided 2026-06-20, user — hybrid A+C): the
`engineer-skill` authoring guide must itself FORCE description presence AND
quality, so weak descriptions cannot be authored in the first place (not only
caught by the repo gate). Two layers: (A) deterministic floor — its bundled
`validate_skill.ts` requires a WHEN-trigger phrase (presence already covered);
(C) quality — a BLOCKING LLM self-review against a short rubric in Phase 4.
Both fold under FR-DESC-QUALITY (multi-surface acceptance).

## Overview

### Context

Audit (this session) of all 44 framework descriptions against the criterion
"says when to launch + what it gives, not internal mechanics" flagged 11
primitives in 3 classes (the AskUserQuestion option mislabeled this as "9" — the
enumerated set below is authoritative):

- **Critical — `skills/` (agent-invocable) with no WHEN trigger** (classifier
  can't find them), 6: `fix-tests`, `write-in-informational-style`,
  `write-gods-tasks`, `write-prd`, `write-dep`, `analyze-context`.
- **Implementation-detail instead of value/WHEN — generated from atoms**, 2:
  `commit` ("…fewer tool calls…"), `push` (whole text is git mechanics).
  Source of truth: `framework/atoms/{commit,push}.md` `description:` —
  SKILL.md is a gitignored build artefact.
- **Structural counters — generated from composites**, 3: `ship` /
  `ship-task` carry "Five/Four … gates (…)". Source:
  `framework/composites/{ship,ship-task}.md`. NOTE: `review-and-commit` was
  re-examined and is already clean ("two-phase workflow … Verdict gate") — it
  needs NO change; kept in scope only for completeness.

Standard reference: `framework/devtools/skills/engineer-skill/SKILL.md`
lines 138-154 (WHAT+WHEN, third person, trigger terms).

### Current State

- 6 critical skills are hand-editable `framework/engineering/skills/<name>/SKILL.md`.
  Each already has the FR-ACCEPT.TRIGGER triad (`trigger-pos-1`,
  `trigger-adj-1`, `trigger-false-1`) — verified present (3 dirs each).
- `commit`/`push` descriptions live in `framework/atoms/{commit,push}.md`;
  `ship`/`ship-task`/`review-and-commit` in `framework/composites/*.md`.
  Both feed `scripts/generate-skill-composites.ts`; the 5 rendered SKILL.md
  are gitignored. Regenerate with
  `deno run -A scripts/generate-skill-composites.ts --write` (idempotent; also
  run automatically by `deno task check`).
- Deterministic gates already policing descriptions:
  - `scripts/check-skills.ts` — name+description <100 tokens, description
    <1024 chars, no `<>` (test: `scripts/check-skills_test.ts`).
  - `scripts/check-trigger-coverage.ts` — exactly 3 trigger scenarios per skill
    (test: `scripts/check-trigger-coverage_test.ts`).
  - generator canon validator — composite description MUST contain the literal
    phrase "Self-contained — execute the inlined steps directly" and MUST NOT
    name any atom from `framework/composites.yaml`.
- There is NO automated check for description *quality* (WHAT+WHEN presence);
  quality is reviewer-judged today.

### Constraints

- **Do NOT hand-edit the 5 generated SKILL.md** (`commit`, `push`, `ship`,
  `ship-task`, `review-and-commit`) — edit atom/composite source + regenerate.
- **Preserve the mandatory composite marker** "Self-contained — execute the
  inlined steps directly" verbatim and keep the "do NOT invoke other skills via
  the Skill tool" clause; canon validator rejects composites without it.
- **Composite description MUST NOT name an atom** from the manifest.
- Stay within catalog budget: name+description <100 tokens (~400 chars),
  description <1024 chars, no angle brackets.
- Rewrite descriptions ONLY — no body, no logic, no behavior change. This is a
  discovery/quality refactor, not a feature.
- Keep changes in the user's language rule: descriptions are English.

## Definition of Done

- [x] FR-DESC-QUALITY: `check-skills.ts` gains a WHEN-trigger gate — any
      `framework/*/skills/*/SKILL.md` (NOT `commands/`) whose `description`
      lacks a recognized WHEN-trigger phrase fails the check. Wired into
      `deno task check`. (Also fixed the latent `/framework/` path guard —
      `isFrameworkSkillsDir` now matches relative paths, so this gate plus the
      pre-existing kind-invariant + IDE-neutrality checks actually run in
      production; `ai-ide-runner` is exempted from IDE-neutrality — Variant A,
      user-approved 2026-06-20.)
  - Test: `scripts/check-skills_test.ts::<new: skills description missing WHEN phrase errors>`
  - Evidence: `deno test -A scripts/check-skills_test.ts` passes (incl. the new
    RED→GREEN case); `deno task check` runs the gate.
- [x] FR-DESC-QUALITY: SRS gains `### FR-DESC-QUALITY` with a runnable
      `**Acceptance:**` (multi-surface: repo gate + engineer-skill validator +
      engineer-skill behavioral scenario); SDS §5 records the validation rule.
  - Test: doc gate — `deno test -A scripts/check-traceability.ts` / `deno task check`
  - Evidence: `grep -q 'FR-DESC-QUALITY' documents/requirements.md && grep -qiE 'desc-quality|WHEN-trigger' documents/design.md`
- [x] FR-DESC-QUALITY (layer A — deterministic floor): engineer-skill's bundled
      `validate_skill.ts` rejects a `description` lacking a WHEN-trigger phrase
      and accepts one that has it (presence/type/`<>`/length already covered).
  - Test: `framework/devtools/skills/engineer-skill/scripts/skill_scripts_test.ts::<new: validate rejects description without WHEN phrase>`
  - Evidence: `deno test -A framework/devtools/skills/engineer-skill/scripts/skill_scripts_test.ts` passes (incl. new RED→GREEN case)
- [ ] FR-DESC-QUALITY (layer C — quality + consistency): engineer-skill SKILL.md
      Phase 4 becomes a BLOCKING gate — runs `validate_skill.ts` AND a short
      WHAT+WHEN/specificity self-review rubric (rejecting lazy forms like
      "How to X"/"Helps with X") before finishing; the two-validator roles
      (`validate_skill.ts` portable floor vs `check-skills.ts` repo gate) are
      reconciled/cross-referenced so 1024-char vs 100-token divergence no longer
      misleads.
  - Benchmark: `engineer-skill` execution scenario (extend `basic/` or new
    `forces-what-when-description/`) — agent authoring a skill must produce a
    WHAT+WHEN description and reject a lazy one. Authored RED-first.
  - Evidence: `deno task acceptance-tests -f engineer-skill` green (CHECK phase
    — hand-off to user); SKILL.md still < limits (`deno task check`). manual — korchasa
- [x] FR-ACCEPT.TRIGGER: 13 `skills/` descriptions rewritten (WHEN phrase +
      concrete WHAT, no implementation detail) and now PASS the new gate — the 6
      critical plus `setup-ai-ide-devcontainer`, `engineer-ai-ide-plugin`,
      `engineer-plugin-{hooks,mcp,marketplace}`,
      `engineer-prompts-for-{instant,reasoning}`.
  - Test: `scripts/check-trigger-coverage_test.ts::*` (triad still present);
    Benchmark: `<skill>-trigger-{pos,adj,false}-1` × 13 (discovery unchanged)
  - Evidence: `deno test -A scripts/check-trigger-coverage_test.ts` passes AND
    the new gate (FR-DESC-QUALITY) reports zero MISSING-WHEN across
    `framework/*/skills/*` (i.e. `deno task check` green).
- [x] FR-ACCEPT.TRIGGER: `commit`/`push` descriptions rewritten in
      `framework/atoms/{commit,push}.md` (value/WHEN, no mechanics dump);
      rendered SKILL.md regenerated. (Commands — exempt from the WHEN gate.)
  - Test: generator + canon validator (build artefact regenerates clean)
  - Evidence: `deno run -A scripts/generate-skill-composites.ts --write` exits 0
    AND `grep -c 'fewer tool calls' framework/core/commands/commit/SKILL.md` == 0
    AND `git status --porcelain framework/core/commands/{commit,push}/SKILL.md` empty
- [x] FR-ACCEPT.TRIGGER: `ship`/`ship-task` descriptions stripped of structural
      counters; mandatory Self-contained marker preserved; regenerated.
      (`review-and-commit` unchanged — already clean.)
  - Test: generator canon validator (Self-contained phrase present, no atom names)
  - Evidence: `deno run -A scripts/generate-skill-composites.ts --write` exits 0
    AND `for c in ship ship-task; do grep -q 'Self-contained — execute the inlined steps directly' framework/core/commands/$c/SKILL.md && echo "$c ok"; done` prints `ok` for both
    AND the structural counter is gone from the DESCRIPTION line:
    `awk '/^description:/' framework/core/commands/ship/SKILL.md | grep -cE 'explicit gates|Five phases'` == 0.
    (The body legitimately retains a "Four explicit gates between phases:"
    explanation — only the description counter was removed; the original
    whole-file grep was too broad.)
- [x] FR-ACCEPT.TRIGGER + FR-DESC-QUALITY: full project check green after all edits.
  - Evidence: `deno task check` — final `N passed | 0 failed` summary (ignore
    the intentional `=== FAIL deno eval Deno.exit(...)` fixtures)
- [ ] FR-ACCEPT.TRIGGER: behavioral trigger sweep for the 13 changed skills (39
      scenarios) confirms no discovery regression — **CHECK phase, hand-off to
      user** (AGENTS.md: full sweep is LLM-costly and deferred).
  - Benchmark: `<skill>-trigger-{pos,adj,false}-1` × 13 skills
  - Evidence: `deno task acceptance-tests -f trigger` (or per-skill
    `-f <skill>-trigger`) reported green by user — manual — korchasa

## Solution

Order matters: gate FIRST (RED→GREEN), so the 6 skill rewrites are verified by
the gate as they land; then rewrites; then regenerate + check.

### Phase A — WHEN-trigger gate (FR-DESC-QUALITY, TDD)

1. **RED**: add a test to `scripts/check-skills_test.ts` that feeds a `skills/`
   SKILL.md whose `description` has no WHEN phrase and asserts the checker
   returns an error (and a sibling `commands/` SKILL.md with no WHEN phrase does
   NOT error — commands are exempt). Run → must fail (gate absent).
2. **GREEN**: in `scripts/check-skills.ts`, add `WHEN_TRIGGER_PHRASES`
   (case-insensitive: `use when`, `use this`, `use for`, `use to`,
   `use after`, `use proactively`, `triggers on`, `when the user`,
   `when you need`). For each SKILL.md whose path contains a `/skills/` segment
   AND NOT a `/commands/` segment, if `description` matches none → push error
   `"<name>: description missing a WHEN-trigger phrase (see engineer-skill WHAT+WHEN rule)"`.
   Reuse the existing frontmatter parse + error-accumulator; do not add a new
   pass. Run test → GREEN.
3. **REFACTOR/CHECK**: `deno fmt && deno lint && deno test -A scripts/check-skills_test.ts`.

### Phase B — SRS / SDS (requirement first)

4. Add to `documents/requirements.md` §3 (alpha-adjacent to FR-ACCEPT.TRIGGER):
   `### FR-DESC-QUALITY: Skill Description WHEN-Trigger Gate [ANC:fr:desc-quality]`
   with `**Desc:**` (skills/ descriptions must carry WHAT + a WHEN-trigger
   phrase; commands exempt), `**Scope:** framework/*/skills/*`,
   `**Acceptance:** deno test scripts/check-skills_test.ts`,
   `**Tasks:** [rewrite-skill-descriptions](tasks/2026/06/rewrite-skill-descriptions.md)`,
   `**Status:** [ ]` → flip to `[x]` once code lands. (Deferred from this plan's
   step 5c per the new-FR rule.)
5. Add an SDS §5 (Logic/Rules) bullet documenting the `check-skills.ts`
   WHEN-trigger rule and the commands exemption.
5c. Register the index row in `documents/index.md` `## FR` (alpha between
   `FR-COMPONENT` and `FR-DEV-SYNC`):
   `- [REF:fr:desc-quality | FR-DESC-QUALITY] — skills/ description must carry a WHEN-trigger phrase; enforced by check-skills.ts — [ ]`.
   **Must land in the SAME change as step 4's `[ANC:fr:desc-quality]`** —
   `scripts/check-salp.ts` is strict and rejects a REF without its ANC, so the
   plan phase intentionally did NOT add this row (it would dangle).

### Phase C — Rewrites (FR-ACCEPT.TRIGGER)

6. 6 `skills/` SKILL.md frontmatter `description` (proposed text, ≤~250 chars
   each so name+desc < 100 tokens):
   - `fix-tests`: "Fix failing or broken tests by finding the root cause and
     correcting the source code (not the test). Use when tests fail, a suite is
     red, or the user asks to fix/repair tests or a CI test failure."
   - `write-in-informational-style`: "Rewrite text in a dense, factual
     informational style — no fluff, no marketing. Use when the user asks to
     write or rewrite docs/notes concisely or to apply a neutral informational
     tone."
   - `write-gods-tasks`: "Author task files in the GODS framework
     (Goal/Overview/DoD/Solution). Use when the user asks to write, structure,
     or break down a task or plan in GODS format."
   - `write-prd`: "Produce a comprehensive Product Requirements Document. Use
     when the user asks to write a PRD or formalize a feature's scope, goals,
     and success metrics."
   - `write-dep`: "Write a Development Enhancement Proposal (DEP) for a
     technical improvement. Use when the user wants to propose, document, or
     formalize a technical change for review."
   - `analyze-context`: "Estimate total token usage and cost across
     conversation history, system prompts, and active rules. Use when the user
     asks how much context/tokens are in use, to audit context size, or to
     estimate session cost."
6b. 7 more `skills/` (scope-expansion per resolved decision; add a WHEN clause,
   keep WHAT, trim per token budget):
   - `setup-ai-ide-devcontainer`: "Generate a .devcontainer (devcontainer.json +
     optional Dockerfile) for AI-IDE development with AI CLI integration, skill
     mounting, and security hardening. Use when the user wants to set up or
     containerize a dev environment for Claude Code / OpenCode / flowai."
   - `engineer-ai-ide-plugin`: "Design and build plugins for AI IDEs (skills,
     MCP tools, hooks, packaging, manifests, marketplaces, per-IDE validation).
     Use when the user wants to create, design, or package an AI-IDE plugin."
   - `engineer-plugin-hooks`: "Build AI-IDE plugin hook elements — shared
     policies plus Claude Code/Codex/OpenCode/Cursor adapters for lifecycle
     events, blocking, audit, context injection. Use when adding or configuring
     plugin hooks."
   - `engineer-plugin-mcp`: "Build AI-IDE plugin MCP elements — stdio JSON-RPC
     servers, tool schemas, host wiring for Claude Code/Codex, event-name
     mapping, validation. Use when adding an MCP server to a plugin."
   - `engineer-plugin-marketplace`: "Design AI-IDE plugin marketplaces —
     requirements, host-specific payloads, local dogfood, release sync,
     validation. Use when the user wants to create or publish a plugin
     marketplace."
   - `engineer-prompts-for-instant`: "Guide to writing stable prompts for
     instant/fast models (Gemini Flash, GPT-4o Mini, Haiku). Use when the user
     is writing or tuning prompts for a fast/cheap model."
   - `engineer-prompts-for-reasoning`: "Guide to writing prompts for reasoning
     models (Gemini Pro, GPT-4o, Claude Sonnet), focused on structure and
     context. Use when the user is writing or tuning prompts for a
     reasoning/smart model."
   NOTE: `ai-ide-runner` ("Use on …") and `engineer-command` ("should be used
   when …") already satisfy the widened allowlist — no rewrite.
7. `framework/atoms/commit.md` description → e.g. "Commit current changes as
   atomic, conventional commits with targeted documentation sync — groups the
   diff into logical commits and updates the docs each change affects." (drop
   "fewer tool calls").
8. `framework/atoms/push.md` description → keep the safety value, drop the
   mechanics list, KEEP the trailing "Self-contained — execute the inlined
   steps directly.": e.g. "User-invoked safe git push. Confirms before setting
   first-time upstream and before pushing a diverged main/master, and refuses
   force pushes without explicit authorization. Self-contained — execute the
   inlined steps directly."
9. `framework/composites/ship.md` & `ship-task.md` descriptions → remove only
   the "Five/Four phases, … gates (…)" sentence; KEEP the phase-arrow
   (`plan → … → push`) which is already canon-clean, and KEEP the mandatory
   "Self-contained — execute the inlined steps directly, do NOT invoke other
   skills via the Skill tool." `review-and-commit` — no edit.

### Phase D — Regenerate + verify

10. `deno run -A scripts/generate-skill-composites.ts --write` (regenerates the
    5 gitignored SKILL.md; canon validator runs).
11. `deno task check` → green (now also runs the new WHEN gate, which the 6
    rewritten skills must satisfy).
12. Hand off the behavioral trigger sweep (39 scenarios: 13 skills × 3) to user.

### Phase E — engineer-skill forces presence + quality (FR-DESC-QUALITY, A+C)

13. **Layer A (RED→GREEN)**: add a test to
    `framework/devtools/skills/engineer-skill/scripts/skill_scripts_test.ts`
    asserting `validateSkill` fails a description with no WHEN phrase and passes
    one with it. Run → RED. Then extend
    `framework/devtools/skills/engineer-skill/scripts/validate_skill.ts`: after
    the existing presence/`<>`/1024-char checks, require the `description` to
    contain a WHEN-trigger phrase (reuse the same allowlist as the repo gate to
    stay consistent). Run → GREEN. `deno fmt && deno lint && deno test` the
    script test.
14. **Layer C (acceptance-test TDD, RED-first)**: author/extend an
    `engineer-skill` execution scenario proving the guide forces a WHAT+WHEN
    description and rejects a lazy one. Run the single scenario → it must fail
    before the SKILL.md edit. Then edit
    `framework/devtools/skills/engineer-skill/SKILL.md`:
    - Phase 4 Verification → BLOCKING feedback loop: run `validate_skill.ts`;
      if it fails, fix and re-run; do not finish until it passes. Add a short
      description self-review rubric (WHAT present? WHEN-trigger present?
      specific, not "How to X"/"Helps with X"? third person?) as a hard gate.
    - Reconcile the two validators: state that `validate_skill.ts` is the
      portable per-skill floor and `check-skills.ts` is the flowai repo gate
      (<100-token catalog, <5000-token body); cross-reference both so the
      1024-char vs ~400-char divergence no longer gives a false "valid".
    - Fold B's anti-lazy patterns into the checklist (guidance), not the script.
    Re-run the scenario → GREEN. Keep SKILL.md under its line/token caps.
15. Hand off the full `engineer-skill` acceptance sweep
    (`deno task acceptance-tests -f engineer-skill`) to the user (CHECK phase).

### Files touched

- `scripts/check-skills.ts`, `scripts/check-skills_test.ts` (repo gate)
- `documents/requirements.md` (new FR section + index row + ANC — Phase B),
  `documents/design.md`, `documents/index.md`
- 13× `framework/*/skills/<name>/SKILL.md` (6 critical + 7 expansion)
- `framework/atoms/{commit,push}.md`, `framework/composites/{ship,ship-task}.md`
- `framework/devtools/skills/engineer-skill/scripts/validate_skill.ts` +
  `…/scripts/skill_scripts_test.ts` (layer A)
- `framework/devtools/skills/engineer-skill/SKILL.md` +
  `…/acceptance-tests/<scenario>/` (layer C)
- regenerated (gitignored, not committed): 5× rendered `SKILL.md`

## Resolved decision

- **Gate scope (resolved 2026-06-20, user)**: EXPAND scope. The WHEN-gate is a
  hard-fail for ALL `framework/*/skills/*`. Preflight showed 15 skills lacked a
  WHEN phrase under the narrow allowlist; after widening the allowlist to include
  `use on` and `should be used when`, `ai-ide-runner` and `engineer-command`
  already comply (no rewrite). The remaining **13** are rewritten in this task:
  the 6 critical + `setup-ai-ide-devcontainer`, `engineer-ai-ide-plugin`,
  `engineer-plugin-hooks`, `engineer-plugin-mcp`, `engineer-plugin-marketplace`,
  `engineer-prompts-for-instant`, `engineer-prompts-for-reasoning`. No
  grandfather list — base is clean after the rewrites.

### Risk / preflight

- **Quality-proxy caveat**: the WHEN-gate checks phrase *presence*, not
  description *quality*. SRS `**Desc:**` and SDS §5 MUST state this so the gate
  is not mistaken for a quality guarantee; quality stays reviewer-judged.
- **Generated skills**: `plan`/`review`/`implement` live under `skills/` but are
  build artefacts (already carry "Use when"). The gate runs on rendered output;
  any fix for a generated skill goes to its atom/composite source, never the
  rendered SKILL.md.
- **Dangling SALP ref**: the index now carries `[REF:fr:desc-quality]`; its
  `[ANC:fr:desc-quality]` is added in Phase B. `check-salp` is clean now, but
  Phase B MUST land the FR section before any commit or the ref dangles.
- **Allowlist coverage**: include at least `use when`, `use this`, `use for`,
  `use to`, `use after`, `use proactively`, `use on`, `triggers on`,
  `used when`, `should be used when`, `when the user`, `when you need` — the
  narrow first draft missed `ai-ide-runner` and `engineer-command`.
- **Canon "no atom names" rule**: current `ship` description already contains
  `plan/implement/review/commit/push` and passes today, so keeping the arrow is
  safe — but Phase D step 10 is the gate; if regeneration fails on a name match,
  fall back to a non-atom paraphrase of the lifecycle. Confirm the exact canon
  match logic in `scripts/generate-skill-composites.ts` before editing.
- **Token budget**: re-check name+description < 100 tokens after each rewrite
  (`check-skills.ts` enforces; longest is `analyze-context`).
