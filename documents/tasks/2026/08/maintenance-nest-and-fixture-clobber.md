---
date: 2026-08-22
status: done
implements:
  - FR-ACCEPT.RULES
related_tasks:
  - 2026/08/agents-rules-nest-three-red.md
---

# The sandbox deleted the premise seven scenarios were built on

## Goal

Three `maintenance-*` acceptance scenarios were red in the 2026-08-20 sweep.
Find the cause of each, fix the layer it lives in, and prove it with a check
that runs in milliseconds rather than a sweep.

## Overview

### Context

Worked with the `root-cause-and-fix` dev skill. Verdicts, one per scenario:

- `maintenance-instruction-coherence` — INSTRUMENT, reproducible. Red on the
  same three checklist items in two independent sweeps (2026-08-16 and
  2026-08-20).
- `maintenance-basic` — variance. Green 08-16, red 08-20, green on re-measure.
- `maintenance-detects-doc-health-issues` — variance. Same shape.

The instrument fault: `prepareSandboxFiles` copies the fixture at step 1.5 and
writes the rendered `AGENTS.template.md` over the sandbox root at step 1.8. A
fixture that ships its own root `AGENTS.md` / `CLAUDE.md` therefore lost it. In
the failed sandbox both files were 23300 bytes and byte-identical, and
`grep -c "tabs for indentation\|snake_case\|Mock freely"` returned 0 — the four
contradictions the scenario asserts had been deleted before the agent started.

Seven fixtures ship such a file: `maintenance/instruction-coherence`, five memex
scenarios whose `AGENTS.md` IS the schema being audited, and
`commit/doc-sync-gate` whose `AGENTS.md` carries the documentation rules the
gate enforces. All seven were losing it.

SDS §3.4 recorded the overwrite as intentional ("Legacy `agentsMarkdown` and
fixture `AGENTS.md` are not supported", commit `4668f656`), while the seven
fixtures predate that decision — 21 and 24 May 2026. The decision silently
orphaned them. Resolved with the user: keep the fixture file, append it after
the rendered template, and rewrite the SDS bullet. The same bullet also claimed
a root `CLAUDE.md` symlink, which the code retired on 2026-08-13.

### Current State

`maintenance-basic`'s variance has a named mechanism worth recording even though
the scenario is green: the ACP loop in `acp_agent.ts` runs only while the user
emulator answers, and ends on `<NO_RESPONSE>`. The `maintenance` skill dispatches
five background scan agents and closes its turn; if the emulator sees no question
the session ends mid-fan-out. The 08-20 run died at 228 s on "W2 complete. Just
waiting on W4 now" while its neighbours ran 950 s. Not fixed: the scenario is
green, and changing the loop would touch every interactive scenario for a benefit
nothing currently measures.

### Constraints

- Fix the layer the cause is in. Editing the scenarios would quiet the tests
  without changing what the bench measures.
- The instrument fix carries a unit test in a file `deno task check` runs —
  `runner_test.ts` is excluded by `task-check.ts`.

## Definition of Done

- [x] FR-ACCEPT.RULES: a fixture's root instruction file survives into the
      sandbox instead of being overwritten by the rendered template.
  - Test: `scripts/acceptance-tests/lib/runner_agents_md_test.ts` (4 tests)
  - Evidence: `deno test -A scripts/acceptance-tests/lib/runner_agents_md_test.ts`;
    the file did not compile before the fix, since `composeSandboxAgentsMd` did
    not exist
- [x] FR-ACCEPT.RULES: the three `maintenance-*` scenarios pass.
  - Test: `deno task acceptance-tests -f maintenance-instruction-coherence -n 3`,
    then `-f maintenance-basic` and `-f maintenance-detects`
  - Evidence: 3/3 each, recorded below
- [x] FR-ACCEPT.RULES: the memex scenarios whose premise the clobber destroyed
      pass, and no scenario regressed.
  - Test: `deno task acceptance-tests -f audit-clean -n 3`, `-f audit-defects`,
    `-f ask-citations`, `-f save-new`
  - Evidence: recorded below

## Solution

1. `composeSandboxAgentsMd` in `runner.ts` — appends the fixture's root
   instruction file after the rendered template, idempotently, and leaves the
   template untouched when no fixture file exists. Wired into
   `prepareSandboxFiles`, which now reads the file back before writing.
2. SDS §3.4 "Project Instructions" rewritten: the fixture file is merged rather
   than unsupported, and the stale symlink claim removed.
3. `audit/defects` fixture migrated to SALP. Its `mod.ts` had claimed
   "post-SALP" since the migration while the files still carried
   `[[wikilinks]]`, which `scripts/audit.ts` ignores by design.
4. `save/SKILL.md` step 2 — copy the schema asset file, both branches.

## Results

Per scenario, three runs each, cache bypassed:

- `maintenance-instruction-coherence` — 0/2 sweeps → **3/3**. Verified against
  the sandbox git commit: all four planted contradictions present before the
  agent ran, and removed by it during interactive resolution.
- `maintenance-basic` — **3/3**. Variance.
- `maintenance-detects-doc-health-issues` — **3/3**. Variance.
- `audit-clean` — **3/3**. The memex schema now reaches the agent.
- `ask-citations` — **3/3**. Regression check on a scenario that was already
  green and whose fixture the merge newly exposes.
- `audit-defects` — 0/3 → **2/3**. The fixture, not the product: the checklist
  asks for SALP index rows while the fixture taught the agent wikilinks.
  `audit.ts <fixture>/pages` reported no DEAD_LINK and no INDEX_DEAD on the old
  files, called `markdown.md` INDEX_MISSING and `orphan-island.md` an ORPHAN;
  after migration it reports exactly the nine issues `mod.ts` documents. The
  remaining red run is real behaviour — the agent added one of the two missing
  index rows.
- `save-new` — 1/3 → **2/3**. Product defect in `save/SKILL.md`: the scaffold
  step said "copy the schema asset" for the no-collision branch and "create a
  separate `MEMEX.md` with the schema" for the collision branch, which the agent
  read as licence to write one. Two failing runs produced a 57-line schema with
  zero anchors and pages with bare H1s; the passing run reproduced 123 lines of
  the 214-line asset. After the fix all three copy 214 lines with 7 anchors and
  every page carries `[ANC:mx-<type>:<slug>]`.

`deno task check` after the changes: 723 passed | 0 failed, 173 passed | 0
failed.

## Follow-ups

Two contradictions inside the product, surfaced and deliberately NOT resolved
here — only the author can say which side was meant:

- `framework/memex/assets/AGENTS.md` says the anchor is declared "immediately
  below the H1 title line" (line 29) while all four page templates in the same
  file put it ON the H1 line, and the `save-new` checklist agrees with the
  templates.
- The same asset writes source-summary pages as `type: source` (line 93, and
  line 186 says so outright), while the `save-new` checklist demands
  `type: source-summary`. One run was marked down for following the schema.

Three memex fixtures remain in the retired wikilink dialect: `ask/citations`,
`ask/honest-gap`, `audit/clean`. `audit-clean` is green while its own checklist
item `zero_or_near_zero_issues` is unmeasurable — `audit.ts` on that fixture
reports 8 issues (every page an orphan, none listed in the index), so the
scenario passes without testing what it claims. Migrating it would test the
claim and may turn it red; left for a decision.
