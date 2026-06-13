---
date: "2026-06-13"
status: done
implements:
  - FR-DOC-ANCHORS.HOOK
tags: [hooks, doc-anchors, subagent, delegation]
related_tasks:
  - 2026-06-05-doc-anchors-validate-hook.md
---
# Hook findings → subagent fix, main agent resumes primary task [ANC:task:2026-06-hook-findings-subagent-delegation]

## Goal

When a turn-end hook reports mechanical findings (e.g. SALP dead-ref/duplicate
anchor; "minor problems like formatting"), the **main agent must not derail
itself** fixing them inline. Instead the main agent dispatches the fix to a
**subagent**; after the subagent finishes, the main agent resumes its primary
task with a clean reasoning thread. Goal: preserve the human-visible upward
narration of the primary task and avoid cognitive-context pollution by
mechanical clean-up.

## Overview

### Context

- Concrete trigger: the `doc-anchors-validate` Stop hook
  ([REF:fr:doc-anchors.hook | FR-DOC-ANCHORS.HOOK], `framework/beta/hooks/doc-anchors-validate/`).
  On turn-end it scans the settled repo for SALP `[ANC:ns:id]`/`[REF:ns:id]`
  integrity and, on findings, returns `decision: block` + `reason`. Today the
  `reason` literally says *"Fix them, then stop"* — so the MAIN agent performs
  the mechanical fix inline.
- Observed derailment (this project's session a20b83ac): the agent created an
  index row with a `fr:model-select` REF, the Stop hook blocked on the dangling
  ref, and the agent's turn ended with *"Resolved. The dangling
  `fr:model-select` REF is removed from documents/index.md"* — the main thread
  was spent on a mechanical SALP fix instead of the primary task.
- Claude Code hook model constraint (verified by reading `run.ts`): a Stop hook
  is a read-only subprocess. It has only three channels — `exit 0` (silent),
  `decision: block` + `reason` (text fed back to the MAIN agent), or writing
  files itself. **A hook cannot spawn a subagent.** Therefore "fixed by a
  subagent" is achievable only by the hook's `reason` text *instructing* the
  main agent to delegate (the agent owns the Task/Agent/subagent call), or by
  the hook auto-fixing mechanically itself.
- Cross-IDE: this hook is **Claude-Code-only** (empirically settled in the
  related task — Codex/OpenCode/Cursor CLIs do not deliver a usable turn-end
  block channel). So naming Claude's subagent surface in the reason is safe,
  but phrase it IDE-generically (Task / Agent / subagent tool).
- `FR-DOC-ANCHORS.HOOK` is still `[ ]` and lives in the opt-in `beta` pack, so
  changing its feedback behavior is low blast-radius.

### Current State

- `decide()` in `framework/beta/hooks/doc-anchors-validate/run.ts` builds the
  block reason: `"SALP anchor/reference issues found … Fix them, then stop:"`
  followed by the finding list and an "add the missing ANC / remove the stale
  REF / correct the malformed token" instruction. No mention of a subagent.
- Unit tests: `framework/beta/hooks/doc-anchors-validate/run_test.ts`
  (`blocks-stop-with-findings-reason` asserts `d.block === true` and
  `assertStringIncludes(d.reason, "fr:missing")`; `respects-stop-hook-active-guard`
  asserts the anti-loop exit). No assertion on delegation wording.
- Anti-loop guard (`stop_hook_active === true → block:false`) already bounds the
  mechanism to a single forced follow-up turn — compatible with a subagent
  round-trip (subagent fix lands on disk; next Stop re-validates clean).
- Hooks are NOT acceptance-tested (not skills/agents). Behavior is covered by
  `run_test.ts` (Code TDD). Whether the agent *actually* delegates is not
  deterministically testable here → manual verification.

### Constraints

- Hook `run.ts` stays self-contained (`jsr:` only, single file) — see
  the related task `2026-06-05-doc-anchors-validate-hook.md`.
- Do NOT change the hook's read-only security posture (`--allow-read`,
  `--allow-run=git`) unless a variant that auto-fixes is explicitly chosen and
  the user accepts the write capability.
- Anti-loop guard MUST remain intact — a subagent round-trip must not produce a
  re-block livelock.
- Reason wording is behavior here (it steers the agent), so a unit assertion on
  a stable delegation keyword is legitimate, not a brittle template test.
- Reason text must be IDE-generic in phrasing even though the hook is
  Claude-only (framework-wide style rule).
- **Known limitation (accepted):** the `reason` is a nudge — whether the agent
  actually delegates vs. fixes inline is NOT deterministically unit-testable
  (no LLM-in-loop test for hooks). Unit tests lock the `reason` CONTENT; the
  delegation BEHAVIOR is verified manually (Phase 4c). This is inherent to the
  chosen Variant A (hook prescribes the method via its own `reason` text).
- **Worktree hygiene:** the develop/commit phase MUST edit the worktree copies
  under `.claude/worktrees/hook-subagent-fix/` (run.ts, run_test.ts, hook.yaml,
  requirements.md), NOT the main tree. Derive absolute paths from `pwd`, never
  from memory (a main-tree edit is a silent cross-tree leak).

## Definition of Done

- [x] FR-DOC-ANCHORS.HOOK: on findings the Stop hook's block `reason` instructs
      the main agent to DELEGATE the fix to a subagent (Task / Agent / subagent
      tool) and resume its primary task — NOT to fix inline, and WITHOUT forcing
      a stop (the main agent continues its primary task). The hook prescribes the
      fix method itself (recipe carried in the reason for the subagent).
  - Test: `framework/beta/hooks/doc-anchors-validate/run_test.ts::blocks-stop-with-findings-reason`
    (extended) — asserts `reason` contains a subagent-delegation directive and a
    resume-primary-task instruction, and asserts it does NOT carry a stop
    directive (no "then stop" / "stops cleanly" phrasing).
  - Evidence: `deno test -A framework/beta/hooks/doc-anchors-validate/run_test.ts`
- [x] FR-DOC-ANCHORS.HOOK: anti-loop guard intact — `stop_hook_active=true` →
      `block:false` (a subagent round-trip cannot cause a re-block livelock).
  - Test: `framework/beta/hooks/doc-anchors-validate/run_test.ts::respects-stop-hook-active-guard`
    (unchanged — regression lock).
  - Evidence: `deno test -A framework/beta/hooks/doc-anchors-validate/run_test.ts`
- [x] FR-DOC-ANCHORS.HOOK: SRS Desc/Scenario/Design and `hook.yaml` description
      describe delegation-to-subagent (no surviving "fixes them in-turn" /
      "the agent adds the anchor" inline-fix wording).
  - Test: `manual — korchasa` (doc-content review)
  - Evidence: `grep -n "subagent" documents/requirements.md framework/beta/hooks/doc-anchors-validate/hook.yaml`
    returns the updated FR-DOC-ANCHORS.HOOK + hook.yaml lines; `grep -n "fixes them in-turn" documents/requirements.md`
    returns nothing.
- [x] Baseline green.
  - Evidence: `deno task check` → exit 0 (`483 passed | 0 failed` +
    `122 passed | 0 failed`; the 3 `=== FAIL deno eval Deno.exit(...)` lines are
    intentional fixtures).

## Solution

### Files
- `framework/beta/hooks/doc-anchors-validate/run.ts` — `decide()` reason builder
  + top-of-file JSDoc.
- `framework/beta/hooks/doc-anchors-validate/run_test.ts` — delegation assertion.
- `framework/beta/hooks/doc-anchors-validate/hook.yaml` — `description` field.
- `documents/requirements.md` — `FR-DOC-ANCHORS.HOOK` Desc/Scenario/Design
  (develop/commit phase; out of plan-phase write scope).

### Phase 1 — RED (Code TDD)
1a. Extend `run_test.ts::blocks-stop-with-findings-reason`: after the existing
    `assertStringIncludes(d.reason, "fr:missing")`, add
    `assertStringIncludes(d.reason, "subagent")` and an assertion that the reason
    instructs resuming the primary task (e.g. includes "primary task" or
    "resume"). Run the file — MUST fail against the current "Fix them, then stop"
    wording. (Behavioral contract on a stable keyword, not a brittle full-string
    template assertion — mirrors the existing `fr:missing` check.)

### Phase 2 — GREEN
2a. Rewrite the `reason` array in `decide()` (`run.ts`) so the HOOK prescribes
    the fix method:
    - Frame: "SALP anchor/reference issues found (mechanical doc fix)."
    - Directive: "Do NOT fix these yourself — it would derail your primary task.
      Dispatch a subagent (Task / Agent / subagent tool) to fix exactly the
      findings below; once it reports done, resume your primary task." (NO
      "then stop" — the main agent continues its primary task, it is not forced
      to end the turn.)
    - Keep the per-finding `...lines` list.
    - Keep the add-`[ANC]` / remove-`[REF]` / fix-malformed-token recipe, but
      reframed as guidance FOR THE SUBAGENT.
    - Leave the `findings.length === 0` and `stop_hook_active === true` branches
      byte-identical — anti-loop semantics unchanged.
2b. Update the `run.ts` module JSDoc line ("Findings are fed back to the AGENT …
    so it fixes them in-turn") to state the agent delegates the fix to a subagent
    and then resumes. Update `hook.yaml` `description` likewise.

### Phase 3 — SRS sync (develop/commit phase)
3a. `FR-DOC-ANCHORS.HOOK` in `documents/requirements.md`: update **Desc**,
    **Scenario**, and the relevant **Design** bullet so the feedback channel is
    described as "delegates findings to a subagent; main agent resumes its
    primary task afterward" (replace "so it fixes them in-turn" and "the agent
    adds the anchor (or removes the ref) and stops cleanly").
3b. SDS: NO change. §3.1.1 / §3.0 hook rows (`design.md:394`, `:429`) describe
    the plugin-bundle emission and per-IDE turn-end availability, not fix-routing.
    Delegation is a reason-text behavior, not an architectural element.

### Phase 4 — CHECK
4a. `deno test -A framework/beta/hooks/doc-anchors-validate/run_test.ts` — green.
4b. `deno task check` → exit 0 (read the final `passed | failed` summary; ignore
    the 3 intentional `=== FAIL deno eval` fixture lines).
4c. Manual end-to-end (not unit-testable): in a scratch repo with one dead ref,
    end a turn and confirm the agent dispatches a subagent for the fix and then
    resumes its primary task rather than fixing inline. Record in commit notes.

### Error handling
Pure-string change; no async/callback conversion. The fail-open `try/catch` in
`import.meta.main` and the `decide()` early-return branches stay untouched, so
hook robustness (never disrupt the user session) is preserved.

## Follow-ups
<!-- Populated by Step 7 triage if any critique items are deferred. -->
