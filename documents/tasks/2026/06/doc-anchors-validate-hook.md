---
date: "2026-06-05"
status: in progress
implements:
  - FR-DOC-ANCHORS.HOOK
  - FR-HOOK-RESOURCES.FORMAT
tags: []
related_tasks: []
---
# Stop-triggered SALP doc-anchors validation hook (core, all users)

## Goal

Ship a framework hook that, at the end of each agent turn, validates SALP
anchors/refs across the user's repo and surfaces dangling/duplicate findings as
an advisory message — guarding against silent cross-reference rot (cognitive
debt). Variant B: repo-wide, advisory, fires on turn-end (`Stop`), never blocks.

## Overview

### Context

- SALP = Semantic Anchor / Link Protocol: `[ANC:ns:id]` / `[REF:ns:id]`.
  Parser is pure (no I/O) in `scripts/lib/salp.ts`; the dev validator
  `scripts/check-salp.ts` walks repo surfaces and reports `dead-ref`,
  `duplicate-anchor`, `legacy-grammar`. The validator is a DEV tool wired into
  `deno task check` — NOT shipped to users.
- Today there is no AI-IDE hook checking anchors/links, neither in dev nor in
  the installed plugin. Two framework hooks exist: `devtools/skill-structure-validate`
  (`PostToolUse`, advisory) and `memex/status` (`SessionStart`). Both are
  advisory (`exit 0` + context), never `decision: block`.
- Variant decision (B) made after analysing add/remove/rename anchor situations:
  per-write validation produces livelock on forward-refs and rename chicken-and-egg.
  Validating at turn-end (settled state) eliminates that. Advisory-only removes
  any true deadlock.

### Current State

- `emitHooks` (`scripts/build-plugins.ts:713`) is event-agnostic: buckets by
  arbitrary `meta.event` string. `HooksFileSchema` (`scripts/validate-plugins.ts:215`)
  uses `z.record(z.string(), …)` — NO event enum. => `Stop` already passes the
  plugin-bundle generator unchanged.
- Per-IDE Stop availability (`documents/ides-difference.md`): Claude Code `Stop`
  (`:108`), Cursor `stop` (`:79`), OpenAI Codex `Stop` (`:166`, feature-gated +
  no Windows), OpenCode — NO literal `Stop`; functional equivalent
  `session.idle` (`:144`, programmatic plugin handler).
- The user-install path (`flowai sync`) lives in EXTERNAL repo
  [korchasa/flowai-cli](https://github.com/korchasa/flowai-cli). It maps canonical
  hook events to each IDE config (`FR-HOOK-RESOURCES.INSTALL`). It currently
  handles only `PostToolUse/PreToolUse/SessionStart`; `Stop` mapping (esp.
  OpenCode `session.idle`, Cursor `stop`) is NOT implemented there.
- SRS contract `FR-HOOK-RESOURCES.FORMAT` (`requirements.md:992`) allowlists only
  `PostToolUse, PreToolUse, SessionStart`.

### Constraints

- Hook `run.ts` runs in the USER's repo from `.{ide}/scripts/<name>/run.ts`.
  MUST be self-contained: `jsr:` specifiers, no import maps, no dependency on
  dev `scripts/`. => vendor a copy of the pure SALP parser into the hook dir.
- MUST NOT hardcode this repo's `DEFAULT_ROOTS` (documents/framework/scripts).
  Generic repo walk with skip-list (`.git`, `node_modules`, `dist`, `.{ide}`).
- Advisory only: never `decision: block` / never force-continue the agent —
  that would re-introduce livelock the user explicitly wants avoided.
- Cheap early-exit: if no SALP tokens anywhere in scanned tree → emit nothing
  (zero cost/noise for non-SALP-adopting users).
- Reuse `stripNonReferenceContext` semantics so grammar EXAMPLES in fenced/inline
  code are not parsed as real anchors.

### Resolved design choices (raise if you object)

1. On finding: feed the findings to the AGENT so it fixes them in-turn —
   `decision: block` + `reason` on `Stop`. Anti-loop guard: if stdin
   `stop_hook_active === true`, exit 0 silently (no re-block) → bounds to one
   forced follow-up turn when the agent does not/cannot fix. Livelock-safe
   because variant B validates the SETTLED end-of-turn state (in-turn
   forward-refs/renames produce no finding); only genuinely-dangling refs block.
   Cross-IDE caveat: "feed back to agent" is Claude-Code-first (and Codex
   `decision:block`+reason); OpenCode `session.idle` / Cursor `stop` may be
   observational-only — hook degrades to no-op there. Phase 3 spec records this.
2. SINGLE-FILE `run.ts` with the pure SALP parser INLINED. (Revised from
   "separate vendored salp.ts": distribution `emitHooks` copies ONLY `run.ts`,
   so a sibling `./salp.ts` import would be missing in the installed plugin.
   Single-file = zero dependency on multi-file copy behavior in build-plugins
   AND flowai-cli sync — the robust choice for "ship to all users".)
3. flowai-cli per-IDE `Stop` mapping is a SEPARATE deliverable (external repo).
   This repo's acceptance verifies plugin-bundle emission + hook unit behavior;
   real cross-IDE USER install can only be end-to-end verified after the
   flowai-cli PR merges. Tracked as Phase 3 (external).

## Definition of Done

- [ ] FR-HOOK-RESOURCES.FORMAT: `Stop` is a supported hook event with documented
      per-IDE mapping (Claude `Stop` / Cursor `stop` / Codex `Stop` /
      OpenCode `session.idle`).
  - Test: `scripts/build-plugins_test.ts::emits-stop-event-hooks-json`
  - Evidence: `deno test -A scripts/build-plugins_test.ts`
- [ ] FR-DOC-ANCHORS.HOOK: core hook `doc-anchors-validate` exists
      (`framework/core/hooks/doc-anchors-validate/{hook.yaml,run.ts,salp.ts,run_test.ts}`),
      `hook.yaml` event=`Stop`, self-contained.
  - Test: file existence + `scripts/validate-plugins.ts` clean
  - Evidence: `deno run -A scripts/build-plugins.ts && deno run -A scripts/validate-plugins.ts <out>`
- [ ] FR-DOC-ANCHORS.HOOK: dead-ref across files reported as advisory.
  - Test: `framework/core/hooks/doc-anchors-validate/run_test.ts::reports-cross-file-dead-ref`
  - Evidence: `deno test -A framework/core/hooks/doc-anchors-validate/run_test.ts`
- [ ] FR-DOC-ANCHORS.HOOK: duplicate-anchor across files reported.
  - Test: `…/run_test.ts::reports-duplicate-anchor`
  - Evidence: same file
- [ ] FR-DOC-ANCHORS.HOOK: settled forward-ref (ref + anchor both present) → NO
      finding (livelock-avoidance proof).
  - Test: `…/run_test.ts::settled-forward-ref-clean`
  - Evidence: same file
- [ ] FR-DOC-ANCHORS.HOOK: grammar example in fenced/inline code ignored.
  - Test: `…/run_test.ts::ignores-code-span-examples`
  - Evidence: same file
- [ ] FR-DOC-ANCHORS.HOOK: repo with no SALP tokens → empty output (early-exit).
  - Test: `…/run_test.ts::no-salp-tokens-silent`
  - Evidence: same file
- [ ] FR-DOC-ANCHORS.HOOK: findings → `decision: block` + reason (agent fix nudge).
  - Test: `…/run_test.ts::blocks-stop-with-findings-reason`
  - Evidence: `deno test -A framework/core/hooks/doc-anchors-validate/run_test.ts`
- [ ] FR-DOC-ANCHORS.HOOK: `stop_hook_active=true` → exit 0 silent (anti-loop).
  - Test: `…/run_test.ts::respects-stop-hook-active-guard`
  - Evidence: same file
- [x] FR-DOC-ANCHORS.HOOK: scan set respects `.gitignore` — in a git work tree
      files come from `git ls-files --cached --others --exclude-standard`;
      manual walk only as non-git fallback. (shebang gains `--allow-run=git`;
      distribution already runs `deno run -A`.)
  - Test: `…/run_test.ts::collectFiles-respects-gitignore`,
    `…/run_test.ts::collectFiles-non-git-repo-still-scans`
  - Evidence: `deno test -A framework/core/hooks/doc-anchors-validate/run_test.ts` (12 passed)
- [x] Baseline green.
  - Evidence: `deno task check` → exit 0 (478 + 119 passed | 0 failed; 3 fixture FAILs only)

## Solution

### Phase 0 — Contract (this repo)
0a. SRS: extend `FR-HOOK-RESOURCES.FORMAT` acceptance — add `Stop` to supported
    events + per-IDE mapping note. Add new sub-FR `FR-DOC-ANCHORS.HOOK` under
    the existing `FR-DOC-ANCHORS` (`[ANC:fr:doc-anchors]`) with `**Acceptance
    verified by tests:**` pointing at `run_test.ts` + `build-plugins_test.ts`.
0b. SDS: add `Stop`→IDE event-mapping row in the hook subsection (§3.1.1 /
    §3.0). Note OpenCode programmatic `session.idle` form.

### Phase 1 — Infra RED→GREEN (this repo, Code TDD)
1a. RED: `build-plugins_test.ts::emits-stop-event-hooks-json` — build a temp pack
    with a `Stop` hook, assert `hooks.json` has top-level `Stop` key referencing
    `…/run.ts`. (Likely passes immediately since emitHooks is generic — if so,
    it is a contract-lock regression test, acceptable; note in commit.)

### Phase 2 — Hook RED→GREEN (this repo, Code TDD)
2a. RED: author `framework/core/hooks/doc-anchors-validate/run_test.ts` covering
    all DoD scenarios (dead-ref, duplicate, settled-forward-ref-clean,
    code-span-ignored, no-tokens-silent, never-blocks). Run — MUST fail (no run.ts).
2b. Vendor `salp.ts` (copy pure parser: parseAnchors/parseRefs/detectLegacyGrammars
    + types). `jsr:` only.
2c. GREEN: `run.ts` — read Stop stdin JSON; resolve scan root (cwd); generic walk
    with skip-list; strip non-reference context; collect dead-ref +
    duplicate-anchor on settled tree; early-exit silent if zero tokens; emit
    advisory user message; exit 0 always.
2d. `hook.yaml`: event=`Stop`, no matcher, description, timeout 30.
2e. REFACTOR + CHECK: `deno fmt && deno lint && deno test` on touched files.

### Phase 3 — DROPPED (empirical: Claude Code only)
Live headless probes (2026-06) of all 4 IDE CLIs settled the cross-IDE question:
- Claude Code 2.1.165 — ✅ `Stop` block→reason continues the agent; `stop_hook_active`
  flips false→true on re-stop (anti-loop verified end-to-end).
- Codex 0.135 — ✖ `codex exec` fires `SessionStart` but NEVER `Stop`; feature flag
  renamed `codex_hooks`→`hooks`.
- OpenCode 1.15 — ✖ `session.idle` fires but is observation-only (no block/continue).
- Cursor (cursor-agent 2026.05.16) — ✖ CLI runs NO `.cursor/hooks.json` hooks
  (project or user level); hooks are a Cursor IDE-app feature, not the CLI.
Decision: scope the hook as **Claude Code only**. No `flowai sync` per-IDE Stop
mapping (would be inert elsewhere). Docs (README + SRS FR-DOC-ANCHORS.HOOK +
FR-HOOK-RESOURCES.FORMAT + SDS) updated to state this explicitly.

### Phase 3 (original, superseded) — flowai-cli spec (EXTERNAL deliverable)
Write a precise spec (separate doc / PR description) for flowai-cli `sync.ts`:
map canonical `Stop` → Claude `Stop` (nested settings.json), Cursor `stop`
(flat .cursor/hooks.json), Codex `Stop` (hooks.json), OpenCode `session.idle`
(programmatic `.opencode/plugins/flowai-hooks.ts` handler). Verify the
non-blocking user-message channel for `Stop` per IDE (Codex `systemMessage`;
confirm Claude/Cursor/OpenCode equivalents). End-to-end cross-IDE acceptance
gated on that PR.

### Phase 4 — Docs
- README hook catalog (if present) += `doc-anchors-validate`.
- `documents/ides-difference.md` is READ-ONLY ref — no change (Stop already documented).
- Update `FR-HOOK-RESOURCES.FORMAT` hook-count bullet.

### Open verification items
- Non-blocking advisory channel on `Stop` per IDE — confirm during Phase 2/3.
- Codex Stop is feature-gated + no-Windows — document as best-effort.
