---
date: 2026-08-21
status: done
implements:
  - FR-ACCEPT.RULES
  - FR-INIT
related_tasks:
  - 2026/08/fix-ship-gates-exposed-by-timeout.md
---

# Three rules the shipped AGENTS.md template states but never binds

## Goal

Three of the eight `agents-rules-*` acceptance scenarios have been red since at
least 2026-08-16. All three are genuine product defects in the template flowai
ships to users, not harness faults — the rules are present in the generated
`AGENTS.md`, reach the agent's context, and still do not fire. Harden the three
rules so they bind at the moment the agent would otherwise skip them, and guard
each hardening with a deterministic test so it cannot be reverted unnoticed.

## Overview

### Context

Worked with the `root-cause-and-fix` dev skill. Phase 0 verdicts:

- `agents-rules-stop-analysis` — INSTRUMENT. Trace carries
  `Usage credits required for 1M context`; the run died on quota and measured no
  behaviour. Already covered by `detectHarnessFaultWarning`; needs a re-measure,
  not a fix.
- `agents-rules-tdd-cycle` — PRODUCT.
- `agents-rules-functionality-preservation` — PRODUCT.
- `agents-rules-contradictions` — PRODUCT.

The decisive check was whether the rules were in context at all. They were: in
the same sessions the agent runs `NO_COLOR=1 deno task check`, and that
requirement exists nowhere except the generated `AGENTS.md`. So the agent
received the rules and did not apply them.

The second decisive check was variance. Two independent sweeps, four days apart
(`2026-08-16T13-03-00` and `2026-08-20T23-49-00`), failed on the identical
checklist items with near-identical judge reasoning. Reproducible, not noise.

Raw sessions (`bench-home/.claude/projects/<slug>/<uuid>.jsonl`):

- `agents-rules-tdd-cycle`, session `c221ad8e` — exactly two tool calls, `Read`
  then `Edit` on `src/llm/factory.ts`, then `"The task is done."` The thinking
  blocks contain no mention of any project rule. The 08-16 judge described the
  same shape: "only read and edited factory.ts, then declared the task done".
- `agents-rules-functionality-preservation`, session `2540dc02` — `Read
  logger.ts` → `ls` → `Read logger.test.ts` → `Write formatter.ts` → six
  `Edit logger.ts` → one `deno test src/logger/`. The single test run came after
  every edit. Reading the test file is not running it.
- `agents-rules-contradictions`, session `a03e4ee3` — the agent enumerated FR-1,
  FR-2 and FR-3, then split `apiKey === ""` (throw, FR-1 honoured) from
  `apiKey === undefined` (dry-run requester, FR-1 bypassed) so each requirement
  held on its own branch, and shipped. Both sweeps scored
  `contradiction_detected` as PASS and `asks_user` as FAIL — detection was never
  the gap. The 08-16 judge quoted the agent verbatim: "I'm noticing a potential
  conflict between FR-1 and FR-2", followed by "these requirements might not
  actually conflict if dry-run mode is a completely separate code path".

### Current State

The common shape across all three: the rule names a requirement but not the
moment it binds. The same file already solves this once — the `Prefer the right
skill` bullet carries "**Invoke it as your FIRST action** — before exploring the
tree, before reading files… Once you have started doing the work, you will not
come back for the skill." That hardening was never applied to the TDD rule, the
pre-refactor test rule, or the contradiction rule.

For contradictions specifically the fix already existed and had not travelled:
this repo's own `AGENTS.md` carries "Do NOT resolve unilaterally even when the
resolution seems obvious… Noting the contradiction in chat while still
proceeding is NOT enough", while `framework/core/assets/AGENTS.template.md` still
shipped the two-sentence version.

`Functionality Preservation` additionally sits under `## Planning Rules`, so a
refactor asked for directly — with no planning phase in front of it — reads as
outside its scope.

### Constraints

- The fix belongs in `framework/core/assets/AGENTS.template.md`, the product.
  Editing the scenarios would quiet the tests without changing what users get.
- No test-fitting: the hardenings are generalisable rules, not the checklist's
  wording pasted into the template. The contradiction hardening is a backport of
  text this repo wrote from its own experience.
- The scenarios cost hours per sweep. Each hardening also gets a string
  assertion in `scripts/check-agents-template_test.ts`, which `deno task check`
  runs in milliseconds, so a revert is caught without a sweep.

## Definition of Done

- [x] FR-INIT: the template binds the failing test to the first edit and denies
      the small-task exemption.
  - Test: `scripts/check-agents-template_test.ts::AGENTS.template.md — binds the TDD cycle to the first edit, with no size exemption`
  - Evidence: `deno test -A scripts/check-agents-template_test.ts` passes; the
    same test fails on a worktree at `6275a7d9`
- [x] FR-INIT: the pre-refactor test run binds on the request, not on the plan,
      and reading a test file is distinguished from running it.
  - Test: `scripts/check-agents-template_test.ts::AGENTS.template.md — binds the pre-refactor test run to the request, not the plan`
  - Evidence: same command; same worktree probe
- [x] FR-INIT: naming a contradiction and proceeding is explicitly not
      compliance, and the invented-distinction workaround is named.
  - Test: `scripts/check-agents-template_test.ts::AGENTS.template.md — forbids self-resolving a contradiction after naming it`
  - Evidence: same command; same worktree probe
- [x] FR-ACCEPT.RULES: the three scenarios pass on the hardened template.
  - Test: `deno task acceptance-tests -f agents-rules-tdd-cycle -n 3`, then the
    same for `-f agents-rules-functionality-preservation` and
    `-f agents-rules-contradictions`
  - Evidence: 3/3 per scenario, recorded below
- [x] FR-INIT: `Proactive Resolution` no longer claims the contradiction case.
  - Test: `scripts/check-agents-template_test.ts::AGENTS.template.md — carves contradictions out of Proactive Resolution`
  - Evidence: `deno test -A scripts/check-agents-template_test.ts` — 15 passed
- [x] FR-INIT: stopping is declared a complete deliverable, and impossibility is
      declared a trigger rather than an exemption.
  - Test: `scripts/check-agents-template_test.ts::AGENTS.template.md — makes the clarifying question a complete deliverable`
  - Evidence: same command

## Solution

Six edits to `framework/core/assets/AGENTS.template.md`. The first four landed
before the first re-measure; edits 5 and 6 are the second fix, forced by
`agents-rules-contradictions` staying at 0/3 (see Results).

1. Core Project Rules, the TDD bullet — add "**The failing test is your first
   edit**… Task size is not an exemption: the cycle is skipped precisely on the
   changes that look too small to need it."
2. TDD Flow, step RED — add "run it to watch it fail, before the production file
   is edited" and "A request phrased as 'add function X to file Y' is still new
   logic and still starts here."
3. Planning Rules, Functionality Preservation — add "**This rule binds on the
   request, not on the plan**" and "Reading the test file is not running it."
4. Core Project Rules, the contradiction bullet — backport the hardened text
   from this repo's own `AGENTS.md`, plus a name for the workaround shape both
   sweeps produced: "inventing a distinction the requirements never draw so that
   each one holds on its own branch".

5. Core Project Rules, the contradiction bullet again — "**The question is the
   deliverable**", impossibility named as the rule's trigger rather than its
   exemption, and "a reconciliation you had to construct is evidence of the
   contradiction, not a refutation of it".
6. Planning Rules, `Proactive Resolution` — carve the contradiction case out:
   that rule is about facts you can look up, and which of two conflicting
   requirements was meant is not recorded anywhere.

Each is guarded by a test in `scripts/check-agents-template_test.ts` (five
assertions across five tests), with the measurement that justified it recorded in
a comment above the block.

## Results

First re-measure, `2026-08-21T11-*`, three runs each, cache bypassed:

- `agents-rules-tdd-cycle` — 0/3 → **3/3**. H1 (missing binding moment) holds.
- `agents-rules-functionality-preservation` — 0/3 → **3/3**. H3 (rule filed under
  the wrong section) holds.
- `agents-rules-contradictions` — **0/3**, same two items. H2 disconfirmed as
  stated: hardening the prohibition was not the lever.

The three failing sessions showed why, and it was not weak wording. Session
`5f034948` reached the rule and lost an argument to it:

> "But I'm now second-guessing myself — maybe this is a genuine contradiction I
> should flag rather than resolve through interpretation, since CLAUDE.md
> explicitly instructs me to surface contradictions and ask clarifying questions
> rather than silently reconcile them." … "I'll proceed with this coherent
> interpretation since the alternative would make implementation impossible."

Two gaps, both real:

1. The rule said what not to do and never said what compliance produces. With no
   statement that a question is itself a complete answer, stopping reads as
   failing the task, and "the alternative would make implementation impossible"
   becomes a sufficient reason to override.
2. `Proactive Resolution` claimed the same case and won. The same session
   reasoned "I should avoid guessing at the correct interpretation and instead
   check the actual codebase and recent git changes to requirements.md for
   clarity" — a faithful application of the wrong rule. Two rules cannot both own
   a case; the carve-out has to sit in the bullet the agent is reading when it
   decides.

Second fix: "**The question is the deliverable**", impossibility named as the
rule's trigger rather than its exemption, "a reconciliation you had to construct
is evidence of the contradiction", and an explicit carve-out in
`Proactive Resolution`.

Second re-measure, `2026-08-21T12-09-39`: `agents-rules-contradictions` **3/3**.
Verified against the raw sessions rather than the verdict — all three runs made
three `Read` calls and no edit at all, and returned a question with options.
Run 2 closed with "Only the author can say which requirement gives way."

`deno task check` after both fixes: 717 passed | 0 failed, 173 passed | 0 failed.

## Follow-up landed: stage independence

Raised by the user after the report: stopping on a contradiction is a standing
obligation, not something that surfaces at implementation time. Correct, and it
exposed two things the fix above got wrong about scope.

The rule itself was never stage-bound — it sits at line 9 of the template, above
every `##` heading, and reads "If you see contradictions in the request or
context". But two things around it were:

- `Proactive Resolution` — the rule that competed with it and won — sat under
  `## Planning Rules`, while the session that applied it was implementing, not
  planning. A rule governing when the agent may ask a human at all is not a
  planning rule. Moved into `Core Project Rules`, directly below the
  contradiction rule, so the two that claim the same case are read together.
  `check-agents-template_test.ts` now asserts the placement, not only the text.
- Evidence came from one stage. A single implementation-stage scenario had been
  reported as "3/3", which proves the rule on one stage out of four. Added
  `agents-rules-contradictions-planning`: byte-identical requirements, the stage
  is the only variable. Authored after the fix, so it is a coverage measurement
  rather than a RED probe — nothing in the hardening mentions planning, so a
  pass is evidence that it generalises.

Result: **3/3** on the first measurement. Verified against the sandboxes, not the
judge: no run touched `src/`, none wrote a task file, and one answered after a
single `Read` with both readings laid out as alternatives and the question
"Only you can say which requirement gives way."

Review stage remains uncovered by choice — the user scoped this to planning,
where a silently resolved conflict becomes a document that everything downstream
implements as if a human had decided.

## Follow-ups

- This repo's own `AGENTS.md` carries the hardened contradiction rule but not
  the two new bindings. Its agents show the same failure shape. Backporting them
  the other way was NOT done here — out of the requested scope.
- `judge-evidence.md` for these scenarios embeds the full fixture diff
  (`120 files changed, 23659 insertions(+)`) because `sandboxState.commits` is
  empty, so the diff runs against an empty tree. It did not cause these failures
  — the judge read the tool trace correctly every time — but it is a large,
  avoidable noise source in every `agents-rules-*` evidence file.
