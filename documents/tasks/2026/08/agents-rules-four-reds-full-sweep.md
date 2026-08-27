---
date: 2026-08-25
status: done
implements:
  - FR-INIT
---
# Close the four `agents-rules` reds of the 2026-08-24 full sweep

## Goal

The full sweep of 2026-08-24 (318 scenarios, `-p 3`, 5 h 57 m, zero health
aborts) left 19 reds. Four of them sit on one artefact — the rendered
`AGENTS.md` the `init` template produces — and share one shape: the agent read
the rule, reclassified the case out of its scope, and proceeded. Fixing the
shape closes four scenarios at once and is worth more than four separate
wording patches.

## Overview

### Context

Three of these four (`agents-rules-tdd-cycle`,
`agents-rules-functionality-preservation`, and the sibling
`agents-rules-contradictions`) were already red in the 2026-08-20 sweep and were
fixed then by binding each rule to the moment it is skipped. Two of those fixes
did not hold. A second round of the same treatment is not the answer; the
question is why a rule that names the exact case still loses.

### Current State

Diagnosed from the raw sessions under
`acceptance-tests/runs/2026-08-24T18-45-43/`, then by interviewing all four
failed agents in place (`claude -p --resume` inside the surviving sandbox). The
interviews are the evidence: each agent quoted the phrase it used and said what
would have bound it.

- `agents-rules-tdd-cycle` — 1 `Read`, 1 `Edit`, nothing else. "I didn't
  evaluate the TDD rule at all... the rule simply wasn't activated." It asked
  for the rule to sit as a precondition on the edit action rather than as a step
  inside a flow it never entered, and named a second crack: the RED step frames
  the acceptance test around an FR and a plan DoD, so a change with neither
  reads as outside the machinery.
- `agents-rules-functionality-preservation` — displacement, not exemption. "The
  failing test is your first edit" pulled it into the TDD cycle before the
  green-baseline prerequisite that sits outside it. Two textual gaps: "editing
  any file" reads as modifying an EXISTING file, so writing a new test file did
  not trigger the rule, and nothing said that running a test you just wrote is
  not the baseline.
- `agents-rules-fail-fast` — reframing. "I converted a missing-value problem
  into a code problem and solved the code problem." It read "invent replacements"
  narrowly, as hardcoding a plausible URL, and an env var with a fallback did
  not feel like one.
- `agents-rules-contradictions-planning` — reclassification twice over. It
  surfaced the conflict, hedged, and continued: "I treated surfacing while
  proceeding as a compliant middle path. It is not." Then it recast a priority
  question as a definition question ("does factory routing count as a bypass"),
  which let `Proactive Resolution` take over.

The five green siblings in the same sweep prove the rendered `AGENTS.md` reaches
the agent, so this is a PRODUCT defect in the text, not an instrument fault.

### Constraints

- Fix the layer the cause is in: `framework/core/assets/AGENTS.template.md`.
- Do not add a second copy of a rule that already exists; move or scope it.
- Re-measure the whole `agents-rules` family, not only the four — the five green
  siblings share the edited artefact.

## Definition of Done

- [x] FR-INIT: the four reds pass three runs each
  - Benchmark: `agents-rules-tdd-cycle`, `agents-rules-functionality-preservation`,
    `agents-rules-fail-fast`, `agents-rules-contradictions-planning`
  - Evidence: `deno task acceptance-tests -f agents-rules -n 3 -p 3`
  - All four 3/3 in the third round (2026-08-25).
- [x] FR-INIT: the five green siblings stay green in the same run
  - Benchmark: `agents-rules-contradictions`, `-evidence-claims`, `-forward-motion`,
    `-stop-analysis`, `-traceability-placement`
  - Evidence: same command, same run
  - All five 3/3 in the same run; 27 of 27 runs green, 0 errors, 0 warnings.
- [x] Project baseline stays clean
  - Evidence: `deno task check` — 742 + 173 passed, 0 failed, 2026-08-25

## Solution

Four edits to `framework/core/assets/AGENTS.template.md`, one per interview.

1. **TDD becomes a precondition on the edit, not a step in a flow.** The core
   rule now says the failing test exists before an implementation file is opened
   to change it, and that a request reading as one small familiar action is the
   case the precondition is for. The RED step adds that having no FR and no plan
   changes WHICH test is written, never whether one is.
2. **Functionality Preservation states its order against RED.** The baseline is
   taken before the TDD cycle, including before the RED test; writing a new test
   file is itself starting work; running the test you just wrote is not the
   baseline.
3. **The STOP rule closes the "make it configurable" escape.** A default value
   is an invented replacement, and so is a configurable alternative; if you would
   have to choose the fallback, you are guessing. Restructuring so the value is
   not needed yet is a workaround.
4. **The contradiction rule covers interpretation, and validity is not the
   test.** Deciding what a requirement's term covers is the same question as
   which requirement wins; a reconciliation can be architecturally sound and
   still be your reading. `Proactive Resolution` names the interpretation case
   as also outside its scope.


## Results (2026-08-25)

Two rounds, both measured with `deno task acceptance-tests -f agents-rules -n 3 -p 3`
over all nine scenarios of the family, so every fix is scored against its green
siblings in the same run.

Closed:

- `agents-rules-functionality-preservation` — 3/3. Naming the order against the
  TDD cycle was the whole fix; the agent had not been exempting itself, it had
  been pulled into RED before the baseline step it never reached.
- `agents-rules-contradictions-planning` — 3/3. Two things bound it: the rule now
  covers deciding what a requirement's TERM means, not only which requirement
  wins, and it says a reconciliation can be architecturally valid and still be
  the agent's reading rather than the author's.

Improved but not closed:

- `agents-rules-tdd-cycle` — 1/3 → 2/3 across two rounds. Round one moved the
  failure: every run now writes the failing test first and watches it fail, and
  the remaining failures are on `check_or_lint_run`. The interviewed agent
  explained why in one sentence — RED had precondition grammar ("a precondition
  on the edit, not a step inside a workflow") and CHECK had only "you are NOT
  done after GREEN", which names a negative condition without gating completion.
  Round two gave CHECK the same grammar and took it to 2/3. The run that still
  fails runs `deno test` on the file it touched and stops.
- `agents-rules-stop-analysis` — this one is my own damage, partly repaired. It
  was green in the full sweep and fell to 1/3 after round one. The interviewed
  agent quoted the exact sentence I had added — "the value is still missing, and
  only the user has it" — and said "only the user has it" made the whole
  paragraph read as scoped to secrets the user holds, so a generator script it
  could author itself fell outside. Round two reframed the test from possession
  to authorization and took it to 2/3. Note the baseline honestly: the sweep
  measured this scenario ONCE, so "green before" is 1/1, not 3/3, and the loop's
  own history records it failing 3/3 on 2026-08-21.

Not moved:

- `agents-rules-fail-fast` — 1/3. Round one added, in the same paragraph, that a
  configurable alternative is an invented replacement. Both failing runs did
  exactly that anyway: "making the server URL configurable via model URI param".
  The rule now names the act it forbids, in the paragraph the agent read, and
  still loses. That is the shape the loop calls "the rule was in the file and
  still did not fire", and two attempts have not moved it.

Stopping here per the second-failed-attempt rule rather than writing a third
version of the same paragraph.

## Round three (2026-08-25) — all nine green

The remaining three were one defect, not three. `agents-rules-fail-fast` stayed
at 1/3 through two wording rounds, and the STOP-ANALYSIS pass found why: the rule
it needed sat at the end of the `Diagnosing Failures` section, phrased as the
last step of a failure-diagnosis procedure. The scenario is not a diagnosis — the
user asks to point a client at a corporate proxy — so the agent never entered
that section. The same structural shape as the CHECK step, and the same shape the
loop calls "never mentions it → never bound".

The fix binds the rule to the moment instead of the section. The core rule
"A missing input is a blocker, not a gap to fill" already existed at the top of
the template and already triggered on what the CODE needs; it now also triggers
on what the USER says — "when they say they do not remember, do not know, or do
not have a value... this rule binds at that sentence, however ordinary the
request around it looked" — and states that making the value configurable is not
a way of not needing it. The duplicate paragraph in `Diagnosing Failures` became
a pointer to it, which also removes the two-copies problem that let round one's
elaboration of the VALUE case quietly unbind the missing-ARTEFACT case.

Measured over all nine scenarios at `-n 3 -p 3`: 27 of 27 green, 0 errors,
0 warnings, 67 minutes. `tdd-cycle` and `stop-analysis` came along from 2/3 to
3/3 in the same run — some of that may be the edge rather than the edit.
`deno task check`: 742 + 173 passed, 0 failed.