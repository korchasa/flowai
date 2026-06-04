---
date: "2026-06-04"
status: in progress
implements:
  - FR-ATOM-PUSH.CI-AWAIT
tags: [framework, push, ci, atom, investigate]
related_tasks:
  - 2026/05/generate-skills-from-atoms.md
---

# Push Atom — Await CI then Investigate Failures [ANC:task:2026-06-push-await-ci]

## Goal

After a successful `git push`, if the project declares CI/CD in its
`AGENTS.md`, the `push` atom must (a) wait for the CI run triggered by the
pushed commit to finish, (b) on green — terminate per `TERMINATION` param,
(c) on red — auto-invoke the `investigate` skill scoped to the failing run,
(d) on 30-minute timeout — STOP with a report. Behaviour is provider-agnostic
(the agent uses whatever CI CLI the project documents) and reuses the existing
investigate primitive instead of duplicating diagnostic logic inside `push`.

## Overview

### Context

`push` is the last gate in `ship` / `ship-task` and the standalone exit point
for `/push`. Today the atom stops the moment local `HEAD` matches `@{u}`. CI
runs that fail post-push are silently invisible to the agent and to any
composite that consumed `push` — the workflow returns "success" while the
remote branch is actually broken. The most common follow-up the user runs by
hand is "look at CI → triage failures → diagnose" — exactly what the
`investigate` skill is built for. Connecting these two automates the trailing
edge of the SDLC without inventing a parallel diagnostic mechanism inside
`push`.

### Current State

- `framework/atoms/push.md` step sequence: Identify Target → Resolve Upstream
  → Safety Checks → Push → Post-Push Verification → `{{TERMINATION}}`.
- Verification ends at `@{u} == HEAD`. No CI awareness.
- Two consumers of the atom: `ship` and `ship-task` composites
  (`framework/composites.yaml`); both have `TERMINATION: TOTAL_STOP` since push
  is the final phase.
- `investigate` skill exists at `framework/core/skills/investigate/SKILL.md`
  with autonomous hypothesis-board flow (no HITL gates). Suitable as a
  downstream invocation from `push` once a failing CI run is identified.
- SRS section: `FR-ATOM-PUSH` (line 689, status `[x]`). Acceptance scenarios
  live under `framework/core/commands/push/acceptance-tests/`.
- AGENTS.md is the canonical place the user has chosen for the CI signal;
  the atom must read it (the agent already loads AGENTS.md at session start).

### Constraints

- **Provider-agnostic.** No vendor lock-in inside the atom text. The atom
  describes the loop and the failure path; the project's AGENTS.md tells the
  agent which CI exists and (depending on chosen variant) how to query it.
- **No skip switch.** When CI is declared in AGENTS.md, the wait is
  unconditional. No `_param` opt-out.
- **30-minute hard cap.** Polling beyond 30 minutes from push is treated as a
  timeout failure.
- **Reuse `investigate`.** On CI failure, hand off via the host IDE's
  skill-invocation primitive (Skill tool, `/investigate`, inline expansion of
  its `SKILL.md` — whichever the IDE supports). Do not inline a parallel
  diagnostic loop in `push`.
- **Atom canon preserved.** Exactly one `<step_by_step>` block; size budget
  honored (per `SKILL_MAX_LINES = 700`; `ATOM_MAX_LINES = 500`). New step is
  inserted between current step 5 (Post-Push Verification) and step 6
  (`{{TERMINATION}}`).
- **Composite ripple.** Both `ship` and `ship-task` consume `push` with
  `TERMINATION: TOTAL_STOP`. The CI-await step runs BEFORE termination, so
  it applies in both composites automatically — no `composites.yaml` change
  needed.
- **Acceptance Test TDD.** Every text edit on the atom must be preceded by a
  RED benchmark scenario per AGENTS.md "Acceptance Test TDD" flow.
- **Compression rules.** Documentation edits follow the project's
  compressed-style rules (facts, no fluff).
- **SRS new-FR gate.** `FR-ATOM-PUSH.CI-AWAIT` does not exist yet. SRS section
  for it must be added in this task; the SALP back-pointer line is deferred
  per plan skill rule 5c until the SRS section exists, then inserted in the
  same edit.

## Definition of Done

- [x] FR-ATOM-PUSH.CI-AWAIT: add SRS section under FR-ATOM-PUSH with
      `**Description:**`, `**Acceptance verified by acceptance tests:**`
      pointing to the new scenarios, and `**Status:**`.
  - Test: `framework/core/commands/push/acceptance-tests/awaits-ci-success/mod.ts`
    (presence) + `framework/core/commands/push/acceptance-tests/investigates-ci-failure/mod.ts`
    (presence) + `framework/core/commands/push/acceptance-tests/stops-on-ci-timeout/mod.ts`
    (presence).
  - Evidence: `deno task check` passes (runs `check-fr-coverage.ts`,
    `check-salp.ts`, composite generator parity).
- [x] FR-ATOM-PUSH.CI-AWAIT: `framework/atoms/push.md` carries one new step
      between current step 5 and `{{TERMINATION}}` implementing the
      Detect → Poll → Branch (Green / Red / Timeout) → Handoff loop.
  - Test: `Benchmark: push-awaits-ci-success`
  - Evidence: `deno task acceptance-tests -f push-awaits-ci-success`
    exits 0 with all critical checklist items satisfied.
- [x] FR-ATOM-PUSH.CI-AWAIT: on CI failure the atom invokes the `investigate`
      skill (skill-tool call, `/investigate` invocation, or inline expansion).
  - Test: `Benchmark: push-investigates-ci-failure`
  - Evidence: `deno task acceptance-tests -f push-investigates-ci-failure`
    exits 0; trace shows an investigate invocation after the failed-run
    detection.
- [ ] FR-ATOM-PUSH.CI-AWAIT: at 30 iterations the atom STOPs with a
      timeout report (does NOT invoke investigate, does NOT silently
      terminate as success). _DEFERRED to follow-up — strict acceptance
      test for this branch requires runner support for per-scenario
      `PATH` injection (sleep shim) or 30 min wall-clock per run; both
      are out of scope for this task. Behaviour is covered by SDS §3.19
      step 4 and atom step 6 text; absence of a regression test is
      acknowledged risk._
- [x] FR-ATOM-PUSH.CI-AWAIT: when AGENTS.md does NOT declare CI, the atom
      skips the wait silently (no spurious polling, no extra output beyond
      a short "no CI declared in AGENTS.md — skipping" note).
  - Test: `Benchmark: push-skips-ci-await-when-not-declared`
  - Evidence: `deno task acceptance-tests -f push-skips-ci-await-when-not-declared`
    exits 0; trace shows no CI tool invocation.
- [x] FR-ATOM-PUSH.CI-AWAIT: composites `ship` and `ship-task` inherit the
      new step without `composites.yaml` change (rendered SKILL.md files
      regenerate via the generator).
  - Test: `Benchmark: ship-task-full-cycle-success` (existing, must still
    pass after regeneration) + composite generator parity.
  - Evidence: `deno run -A scripts/generate-skill-composites.ts --check`
    exits 0; `deno task acceptance-tests -f ship-task-full-cycle-success`
    exits 0.
- [x] FR-ATOM-PUSH.CI-AWAIT: documentation index carries a row under `## FR`
      and FR-ATOM-PUSH SRS section carries a `**Tasks:**` back-pointer to
      this task (inserted only after the FR-ATOM-PUSH.CI-AWAIT SRS section
      is written, per plan rule 5c).
  - Test: `manual — korchasa` (visual diff of `documents/index.md` and
    `documents/requirements.md`).
  - Evidence: `deno task check` (runs `check-salp.ts` → REF/ANC parity for
    the new row + back-pointer).
- [x] FR-ATOM-PUSH.CI-AWAIT: malformed `## CI/CD` block in AGENTS.md
      (e.g. missing `Status command`) causes the atom to STOP fail-fast
      with a clear error, NOT silently fall back.
  - Test: `Benchmark: push-stops-on-malformed-ci-block`
  - Evidence: `deno task acceptance-tests -f push-stops-on-malformed-ci-block`
    exits 0; trace shows the atom never reached the poll loop.
- [x] FR-ATOM-PUSH.CI-AWAIT: rendered composite SKILL.md files stay under
      `SKILL_MAX_LINES = 700` after regeneration.
  - Test: `manual — korchasa` (line-count check).
  - Evidence: `wc -l framework/core/commands/ship/SKILL.md
    framework/core/commands/ship-task/SKILL.md` reports < 700 for both;
    `deno run -A scripts/generate-skill-composites.ts --check` exits 0.

## Solution

Selected: **Variant 2 — AGENTS.md declares CI presence + commands**. Atom
reads a small CI block from AGENTS.md, executes the project's own status /
logs commands, loops with a 30-min cap, hands off to `investigate` on red.

### Files to modify

- `framework/atoms/push.md` — add one new step ("Await CI") between current
  step 5 (Post-Push Verification) and step 6 (`{{TERMINATION}}`); add a new
  rule covering the CI-await contract; extend the `<verification>` block.
- `framework/core/assets/AGENTS.template.md` — add a `## CI/CD` section right
  after `## Development Commands` (before `## Code Documentation`) declaring
  the CI schema. New section is part of the static template body, NOT a
  `{{TEMPLATE_VAR}}` (init does not auto-detect CI).
- `documents/requirements.md` — add 2nd-level FR section
  `#### FR-ATOM-PUSH.CI-AWAIT` immediately under FR-ATOM-PUSH (between
  line 694 and line 696 of current file). Insert a SALP back-pointer
  `- **Tasks:** [REF:task:2026-06-push-await-ci | push-await-ci]` under the
  FR-ATOM-PUSH section's existing `**Description:**` bullet during the same
  edit (currently line 692 carries the existing back-pointer; APPEND to it).
- `documents/index.md` — add row under `## FR`:
  `- [REF:fr:atom-push.ci-await | FR-ATOM-PUSH.CI-AWAIT] — Push atom awaits
  CI and invokes investigate on failure — [ ]`. Insert alphabetically
  (between `atom-push` and `cicd`).
- `documents/design.md` — add a new sub-section
  `### 3.X Push Atom CI-Await Contract` (next available number after the
  current last `### 3.18`) describing: AGENTS.md `## CI/CD` schema
  (Provider / Status command / Logs command / Run URL command),
  exit-code contract (0/1/2/other), poll-loop iteration cap, malformed-
  block fail-fast, and `investigate` handoff. Concrete number is fixed
  to the next free slot; implement phase chooses the exact integer.
- `framework/core/commands/push/acceptance-tests/awaits-ci-success/mod.ts`
  (NEW) — green CI scenario.
- `framework/core/commands/push/acceptance-tests/investigates-ci-failure/mod.ts`
  (NEW) — red CI → invoke `investigate`.
- `framework/core/commands/push/acceptance-tests/stops-on-ci-timeout/mod.ts`
  (NEW) — 30-min wall-clock cap (use accelerated clock via mock CLI).
- `framework/core/commands/push/acceptance-tests/skips-ci-await-when-not-declared/mod.ts`
  (NEW) — AGENTS.md without `## CI/CD` → silent skip.
- `framework/core/commands/push/acceptance-tests/stops-on-malformed-ci-block/mod.ts`
  (NEW) — AGENTS.md with `## CI/CD` missing required keys → fail-fast STOP.
- `framework/core/commands/init/acceptance-tests/renders-ci-cd-section/mod.ts`
  (NEW) — fresh-init AGENTS.md contains the `## CI/CD` schema block.

### AGENTS.md `## CI/CD` schema (new)

Inserted by `init` template generation; brownfield projects without it get
the silent-skip behaviour. Schema:

```markdown
## CI/CD

- **Provider:** <free-form name, e.g. `github-actions`, `gitlab`, `circleci`>
- **Status command:** `<cmd>` — must exit 0 on green, non-zero on red,
  block until the run triggered by HEAD reaches a terminal state.
- **Logs command:** `<cmd>` — prints failed-job logs to stdout. Used to feed
  the `investigate` skill as initial context. Optional; if absent, the atom
  passes only the failing-run URL.
- **Run URL command:** `<cmd>` — prints the run URL for the pushed SHA.
  Optional; used for the final user-facing report.
```

All three commands receive the pushed SHA via the `$SHA` environment
variable (atom exports `SHA=$(git rev-parse HEAD)` before invoking).

The Status command MUST be a single-shot status query (returns and exits),
NOT a blocking wait — the 30-iteration loop inside the atom enforces the
30-min cap, so a tool that blocks indefinitely (`gh run watch`,
`glab ci status --wait`) defeats the cap. Acceptable shape:

- Exit 0 = green (terminal success).
- Exit 1 = red (terminal failure).
- Exit 2 = still running (atom re-invokes after 60s sleep).

For this repo's own AGENTS.md, the populated block will be:

```markdown
## CI/CD

- **Provider:** github-actions
- **Status command:** `RID=$(gh run list --branch $(git rev-parse
  --abbrev-ref HEAD) --commit "$SHA" --limit 1 --json databaseId,status,
  conclusion); echo "$RID" | jq -e '.[0].status == "completed" and
  .[0].conclusion == "success"' && exit 0; echo "$RID" | jq -e
  '.[0].status == "completed"' && exit 1; exit 2`
- **Logs command:** `gh run view --log-failed $(gh run list --branch
  $(git rev-parse --abbrev-ref HEAD) --commit "$SHA" --limit 1
  --json databaseId --jq '.[0].databaseId')`
- **Run URL command:** `gh run view --json url --jq .url $(gh run list
  --commit "$SHA" --limit 1 --json databaseId --jq '.[0].databaseId')`
```

### Atom step (new step 6, before TERMINATION)

```
6. **Await CI**
   - Read AGENTS.md `## CI/CD` section.
     - **Absent**: output `No CI declared in AGENTS.md — skipping CI
       await.` and proceed to step 7 ({{TERMINATION}}).
     - **Malformed** (missing `Provider` or `Status command`): STOP with
       `## CI/CD section is malformed — required keys: Provider, Status
       command. Found: <list>.` Do NOT silently fall back.
     - **Well-formed**: continue.
   - Export `SHA=$(git rev-parse HEAD)`.
   - **Detect run trigger** (≤60s; sized at ~2× the slowest realistic
     provider lag, observed at ~30s for GitLab pipelines registering after
     push): invoke the Status command. If exit is 0 / 1 (terminal) on the
     first call OR exit is 2 (in-progress, meaning a run exists), proceed
     to the poll loop. Otherwise sleep 5s and retry. After 12 retries
     (60s) with no run detected, STOP with `CI declared but no run was
     triggered by $SHA within 60s — verify the workflow trigger
     configuration.`
   - **Poll loop** (max 30 iterations × 60s = 30 min cap): invoke the
     Status command.
     - Exit 0 → CI green. Continue to step 7.
     - Exit 1 → CI red (terminal). Go to Investigate Handoff.
     - Exit 2 → still running. Sleep 60s. Re-invoke.
     - Other exit → treat as malformed Status command, STOP with the raw
       exit code and stderr.
     The atom MUST count iterations (not wall-clock) so the cap is
     deterministic across IDE harness latencies.
   - **30-iteration cap**: if 30 iterations completed without a terminal
     status, STOP with `CI did not finish within 30 iterations (~30 min)
     — timed out. Run URL: <url from Run URL command if available>`. Do
     NOT invoke `investigate`. Do NOT proceed to step 7.
   - **Investigate Handoff** (CI red):
     1. Execute the Logs command (if defined); buffer its stdout as
        <LOGS> (truncate at 12 KB; investigate can fetch more via the
        run URL if it needs to drill in).
     2. Execute the Run URL command (if defined); buffer as <URL>.
     3. The worktree is already clean (step 5 verified `@{u} == HEAD`),
        so `investigate`'s "Clean Baseline" precondition holds.
     4. Invoke the `investigate` skill with the prompt:
        `CI failed for commit $SHA on branch <CURRENT>. Run URL: <URL>.
         Failed-job logs:\n<LOGS>\nDiagnose the root cause. Do not apply
         a fix; report findings.`
        Use the host IDE's skill-invocation primitive (Skill tool /
        `/investigate` / inline expansion of its `SKILL.md`).
     5. After `investigate` returns its report, STOP. Do NOT proceed to
        step 7 — the push succeeded but the build is broken.

7. **{{TERMINATION}}**
```

### Rule (new entry in `<rules>`)

```
9. **CI-await contract**: when AGENTS.md declares a `## CI/CD` section, the
   atom MUST wait for the CI run triggered by the pushed SHA to reach a
   terminal state (≤ 30 min wall-clock), and on failure MUST invoke the
   `investigate` skill with run URL + failed-job logs. The wait is NOT
   optional; there is no per-push opt-out. On timeout or trigger-detection
   failure the atom STOPs with a clear report and does NOT proceed to
   TERMINATION.
```

### Verification block (new entries)

```
- [ ] CI await: when AGENTS.md declares `## CI/CD`, atom polled the
  declared Status command until terminal state or 30-min cap.
- [ ] CI failure handoff: failing-run logs + URL passed to `investigate`
  via skill invocation; atom STOPped after `investigate` returned.
- [ ] CI absent: when AGENTS.md has no `## CI/CD` section, atom skipped
  the wait silently with a one-line note.
```

### Implementation sequence (RED → GREEN → REFACTOR → CHECK per AGENTS.md)

For each new scenario:

1. **RED**: author `mod.ts` for the scenario. `setup()` builds the
   sandbox: bare-repo origin (mirrors `push-happy-path`), an AGENTS.md
   carrying a `## CI/CD` block whose Status / Logs commands shell out to
   a mock CLI placed in `$PATH` (the mock returns a scripted outcome —
   exit 0 / non-zero / sleeps for the timeout test). Run the scenario —
   it MUST fail (the atom does not yet implement the step).
2. **GREEN**: edit `framework/atoms/push.md` minimally to make the
   scenario pass.
3. **REFACTOR**: tighten wording, re-run scenario.
4. **CHECK**: run all four new scenarios + the existing three
   (`push-happy-path`, `push-sets-upstream-on-first-push`,
   `push-refuses-force-on-divergence`) + `ship-task-full-cycle-success`
   to confirm composite regeneration is clean. Hand off the full sweep
   to the user per the AGENTS.md hand-off contract:
   `deno task acceptance-tests -f push` (single substring covers all
   four push scenarios) and `deno task acceptance-tests -f
   ship-task-full-cycle-success` separately.

Order between scenarios: start with `skips-ci-await-when-not-declared`
(smallest atom diff, validates the conditional gate), then
`awaits-ci-success`, then `investigates-ci-failure`, then
`stops-on-ci-timeout` (most fixture-heavy).

### Mock CLI shape (for acceptance fixtures)

A small bash script at `<sandbox>/bin/mock-ci`:

```bash
#!/usr/bin/env bash
# Reads $MOCK_CI_OUTCOME from environment: ok | fail | sleep
case "${MOCK_CI_OUTCOME:-ok}" in
  ok) echo "✓ green" ; exit 0 ;;
  fail) echo "✗ red — test failure in foo_test.ts" 1>&2 ; exit 1 ;;
  sleep) sleep 5 ; exit 0 ;;  # accelerated cap test maps 5s → 1800s
esac
```

For the timeout scenario, the test sandbox uses a mock Status command
that always exits 2 (in-progress). The atom's iteration cap is what
bounds the test; no atom text changes for test mode. To keep the test
runtime reasonable, the per-iteration sleep is shortened by injecting
`PUSH_CI_POLL_INTERVAL_SECONDS=1` at the **sandbox env layer** (NOT
referenced in the atom body). The atom's poll loop honors the env var
only via the existing `sleep 60s` line in the mock CLI — i.e. the test
replaces the `sleep` command itself with a no-op via a shim placed
earlier in `$PATH`. This keeps the production atom text fully clean of
test-mode knobs.

### Verification commands (for the implementer / reviewer)

```
deno run -A scripts/generate-skill-composites.ts --write
deno task check
deno task acceptance-tests -f push
deno task acceptance-tests -f ship-task-full-cycle-success
```

### Follow-ups (deferred, not part of this task)

- Brownfield migration: a separate maintenance scan that detects projects
  with `.github/workflows/` but no AGENTS.md `## CI/CD` section and warns.
- `setup-ai-ide-devcontainer` integration: pre-populate the CI block when
  the devcontainer flow detects an existing CI config.
- Shared mock-CI fixture helper: the four push CI scenarios + the
  `init-renders-ci-cd-section` scenario all build similar mock-CLI
  shims. Extract a helper in `scripts/acceptance-tests/lib/fixtures/`
  once the patterns settle.

