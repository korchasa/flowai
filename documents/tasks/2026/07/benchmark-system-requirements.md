---
date: "2026-07-15"
status: superseded
superseded_by: documents/tasks/2026/07/bench-swe-fix-problems.md
tags: [benchmark, requirements, constitution, effect-measurement]
related_tasks: []
---
# Benchmark system — requirements & constraints (measure real user effect vs pure Claude Code / Codex)

> **Superseded (user decision 2026-07-22):** the replace-the-benchmark track is
> closed and FR-BENCH-V1 was removed from the SRS unbuilt. This document stays
> as the record of the five adversarial critique rounds and the "Final design
> v1" contract — the idea source for evolving the existing FR-BENCH-SWE harness
> in place (endpoint conjunction, frozen human reply, pre-registration freeze,
> vintage rule are adopted piecemeal there, not as a separate instrument).

## Goal

Define requirements and constraints for a benchmark system that measures the
**real usefulness of flowai to the user** under the rewritten constitution
(SRS Mission + Foundational Failure Modes I–VIII + Principles A–G), comparing a
flowai-equipped agent against the same bare agent (pure Claude Code, pure Codex).

Business value: the current optics (autonomous `pass@1` A/B, `FR-BENCH-SWE`) does
NOT capture what flowai is for. flowai optimizes fewer failure modes, human
control above the class/method line, and durable results — not autonomous
task-closing. A `pass@1`-only benchmark is not neutral: it charges flowai for its
overhead (plan, docs, gates, review) while the compensating value is invisible,
so it structurally under-rates flowai. This task fixes the measuring device
before any new harness is built.

## Overview

### Context

- Constitution was rewritten into the SRS (Mission, Foundational Failure Modes,
  Principles A–G). The benchmark must measure effect against THIS model — the
  failure modes are the ready-made operationalization of most axes.
- User goals (chat 2026-07-15): (1) improve task-solving via plan / TDD / review;
  (2) do not add long-term problems; efficiency is NOT a goal — solving the task
  and not harming the future rank above cost.
- Resolved forks (chat 2026-07-15):
  - Measurer = hybrid: deterministic trace signals + an independent LLM judge on
    what the trace cannot yield (2A).
  - Budget parity: baseline gets the same turn/token budget as flowai, so uplift
    cannot be attributed to "more compute" (4A). Cost is measured, never the
    quality criterion.
  - Corpus architecture (fork 3 round): UNIFIED per-task (B) — every task carries
    BOTH an objective oracle (success + hidden durability) AND constructed process
    traps in one case, so a single run measures both directions. Source /
    oracle-shape / contamination remain open sub-forks below.
- Supersedes the autonomous-success optics of `FR-BENCH-SWE` (kept as historical
  provenance; its harness internals were intentionally NOT re-studied so the new
  optics is built from the mission, not retro-fitted to the old harness).

### Current State

`FR-BENCH-SWE` exists: a same-harness A/B measuring autonomous `pass@1` on a
measured-headroom SWE-bench pool. Its single-number, solve-or-not optics is judged
insufficient by the user. No detail of its harness is inherited into these
requirements by design.

### Constraints

- **C1.** No live human in the loop by default; the human is emulated; emulation
  is stochastic and is declared in every report, not hidden.
- **C2.** Public tasks may be training-contaminated; corpus or metrics must resist
  contamination (measure process that knowing the answer does not help, or use
  fresh / private tasks).
- **C3.** A full run is expensive (LLM time, Docker grading); a cache and a cheap
  mode are required — a full run cannot be demanded per change.
- **C4.** The judge risks inheriting the executor's blind spot; independence is
  mandatory (distinct model / clean context, no gold access).
- **C5.** flowai overhead is a by-design price, not a defect: report its size, do
  not penalize it as a fault.
- **C6.** Cross-IDE parity is partial (Codex primitives ≠ Claude Code); the delta
  is measured within each carrier's capability.
- **C7.** Part of "control and understanding" is not fully machine-measurable — an
  honestly-labeled proxy.

## Definition of Done

- [x] Requirements / constraints / methodology drafted (directions I–II + sub-axes,
      R1–R12, C1–C7, corpus round B/A/B/C).
  - Evidence: `## Solution` + `### Corpus` sections below exist.
- [x] Independent adversarial critique run before SRS promotion.
  - Evidence: `## Critic findings (Fable, 2026-07-15)` below — 4 FATAL, 11 MAJOR.
- [x] Path-2 revision drafted answering all 4 FATAL (3 arms; split roles; split
      corpus; Direction II measured by outcome).
  - Evidence: `## Revised design (Path 2 — split corpus)` below.
- [x] Design passes an adversarial critique with 0 FATAL. — PASSED at round 5
      (2026-07-21): `## Final design v1 — solo scope` — one mechanical FATAL
      (silent variance drop) + MAJORs found, all applied, closure verified by the
      same critic: "FIT FOR SRS (0 FATAL): yes". Rounds 1–4 history: automated
      A/B → P-A → tiered O3 all FATAL (structural walls now scoped out or deferred
      with recorded blockers).
  - Evidence: `## Critic round 5 — verification` below; rounds 1–4 sections.
- [x] Scope decision after 2 failed rounds (P-A…P-D) — RESOLVED (user, 2026-07-16):
      P-A + human annex — automated bench = Direction I + injection/clarification
      proxies with factorial ablation; holistic Direction II → a separate
      repeated-measures human study.
  - Evidence: `## External corroboration` + `## Follow-ups` scope-decision below.
- [x] Corpus & axes revalidated after the FATAL fixes — v1 corpus (large post-cutoff
      pool, vintage rule, disjoint endpoint components, flaky policy) and the
      two-sided axis triage verified in the round-5 closure check.
  - Evidence: `## Critic round 5 — verification` below (all corpus/endpoint MAJORs
    CLOSED; no new FATAL).
- [x] Promoted into SRS as `FR-BENCH-*` with runnable acceptance — `FR-BENCH-V1`
      added (status `[ ]`, acceptance = workability smoke to be authored with the
      harness + manual gate); FR-BENCH-SWE marked optics-superseded.
  - Evidence: `grep -n "FR-BENCH-V1" documents/requirements.md`.

## Solution

### What we measure — two values, each split inside

**Direction I — result over time: "solved it and did no future harm".**

- **I.1 Task solved** — uplift in solved-fraction of the flowai arm over the same
  bare carrier, with the uplift attributed to phases plan → TDD → review. Failure
  families: `FM-PLAN.*`, `FM-PROCESS.MISDIAGNOSE`, `FM-SCOPE.UNDER`.
- **I.2 No long-term harm** — a distinct axis, not reducible to "task closed": no
  hidden-contract regressions, no needless debt (dup, over-generalization,
  over-build), no doc/spec drift, no false-green "done". Families: `FM-REGRESS.*`,
  `FM-SHAPE.*`, `FM-SCOPE.OVER`, `FM-SPEC.DRIFT`, `FM-VERIFY.*`.

**Direction II — human stays in charge: "control and understanding preserved".**

- **II.1 Decision ownership above the line** — the agent surfaced architectural,
  irreversible, and ambiguous forks instead of swallowing them, and did not flood
  the human with trivia. Families: `FM-DECIDE.*`, `FM-CODE.HANDBACK`.
- **II.2 Upward report** — faithful, complete, legible, evidenced. Family:
  `FM-REPORT.*`.
- **II.3 Process reliability** — low run-to-run variance, correct escalation at a
  dead end, no fabrication, no guard-bypass, independent verification. Family:
  `FM-PROCESS.*`.

**Cross-cutting — cost, NOT a quality axis.** Tokens / turns / time are always
measured, but never the "better" criterion. They serve budget parity (for honest
uplift attribution) and honest disclosure of the price flowai charges. Value
priority (user): solve + no future harm first, then control + understanding, then
cost.

### How we measure — methodology

- Honest A/B: arms differ ONLY by the presence of flowai — same model, transport,
  corpus, harness.
- Within-carrier delta: "with flowai − without flowai" computed separately for
  Claude Code and for Codex; pure Codex is the baseline of the Codex arm, not a
  separate rival. The carrier difference is never conflated with the flowai effect.
- Budget parity: the baseline arm gets the same turn/token budget as flowai, so
  uplift cannot be charged to raw compute.
- Measurer = hybrid: deterministic trace signals + an independent LLM judge for
  what the trace cannot yield; the judge sees no gold answer and is not the
  executor.
- Many replications; result is a frequency, not a boolean; reps and judge
  stochasticity are declared.

### Requirements

> **History note (2026-07-21):** R1–R12 and the corpus requirements below are the ROUND-1 design;
> several are superseded by `## Final design v1 — solo scope` (R1's multi-axis unit → v1's narrow
> conjunction + deferred axes; R4 budget parity → dropped round 2; R6 attribution → dropped;
> R-HEADROOM/R-TRAPS → dropped with the hand-built corpus). Where they conflict, v1 wins.

- **R1.** Unit of measure = fewer failure modes + result uplift, not a bare
  solved-fraction.
- **R2.** Arms differ only by flowai (model, transport, corpus, harness shared).
- **R3.** Delta is measured within a carrier; cross-IDE difference is not conflated
  with the flowai effect.
- **R4.** Budget parity across arms; cost is measured but is not a quality
  criterion.
- **R5.** Result is a vector over the two directions and their sub-axes; collapsing
  it into a single score that hides cost and trade-off is forbidden.
- **R6.** Result uplift is decomposed by phase plan / TDD / review (attribution).
- **R7.** Negative primitive contribution is caught by construction: a frozen wrong
  test, zero review interceptions, plan-narrowed scope.
- **R8.** Long-term harm is a standalone measured axis (regressions, debt, drift,
  false-green), not a corollary of "task closed".
- **R9.** The measurer is independent of the executor and sees no gold answer.
- **R10.** Every effect has a runnable check or a fixed scoring protocol — "got
  better" without operationalization does not count.
- **R11.** Many replications; result is a frequency; stochasticity is declared.
- **R12.** Output is a human-readable report: per-instance, wins and regressions,
  phase contribution, cost, caveats.

### Corpus — architecture B (unified per-task): decided, sub-forks open

Decision (2026-07-15): each task carries EVERYTHING in one case — an objective
success oracle, a hidden durability oracle, AND constructed process traps — so a
single run measures both directions. Chosen for honesty (one pass measures all)
over cost; the higher construction cost is accepted.

Direct consequences of B (firm):

- **B → authored tasks.** A task that is real-with-objective-oracle AND clean of
  contamination AND carries decision/scope traps almost certainly must be
  CONSTRUCTED (fresh / private), not borrowed from a public benchmark. B collapses
  the source question toward hand-built.
- **Oracle↔intent tension.** An objective success oracle presumes ONE right answer;
  a decision-gate trap presumes an AMBIGUOUS intent whose right move is to surface
  the fork, not to pick. Reconciling both inside one task is sub-fork 1.
- **Small N.** Rich per-task construction caps the pool at units–tens → results are
  direction, not magnitude. Accepted.
- **Fitting risk.** Whoever builds a trap knows what is measured → author of tasks
  should be independent of author of metrics (sub-fork 3).

Firm corpus requirements (unchanged, now enforced per-task):

- **R-HEADROOM.** Bare carrier does not solve the task reliably — else plan, TDD,
  review have nothing to lift and the ceiling is closed.
- **R-TRAPS.** Each task carries traps for the measured failure modes: a hidden
  contract (durability), an ambiguous intent (decision-gate), multi-session
  continuity (memory / drift).
- **R-ORACLE.** A durability oracle hidden from the agent — checks the solution did
  not break what already worked.
- **R-CLEAN.** Resistance to training-data contamination.

Sub-forks (this round):

1. **Oracle↔intent reconciliation** — RESOLVED 2026-07-15: **parameterized K-gold
   (A)**. Each task holds a legitimate fork of K variants; every variant carries
   its own hidden gold + success tests; the emulated human (judge) picks variant k
   WITHOUT seeing gold; the objective oracle grades the implementation of k; a
   shared hidden durability oracle checks nothing old broke. Anatomy per task:
   `fork(K) + K×(gold, success tests) + durability oracle + non-decision traps
   (scope / regress / over-build / dup) + headroom`.
   Sub-requirements this pins:
   - **R-FORK-LEGIT.** The K variants are engineering-legitimate trade-offs (patch
     vs root-cause vs universal — `FM-DECIDE.DEPTH`; widen contract vs add
     overload), NOT one-right-answer-plus-distractors — else it tests diagnosis,
     not decision ownership.
   - **R-FORK-CLOSED.** The variant set is closed; the judge picks only from it;
     every variant has a gold, so whichever the judge picks is objectively gradable.
   - **Grading rule (silent choice).** If the agent silently picks variant j
     instead of surfacing the fork: II.1 fails (swallowed decision) AND the
     objective oracle grades against gold[j]. A pick outside the K is a separate
     failure (over-generalization / misdiagnosis), graded as matching no gold +
     durability check.
   Cost: K golds per task → start at K=2, units–tens of tasks. Accepted.
2. **Task source** — RESOLVED 2026-07-15: **real substrate + injected situation
   (B)**. A real, private-or-post-cutoff codebase is the substrate; the fork, the K
   golds, the hidden contract, and the traps are injected by us — reality of the
   substrate (transfer validity) + control over parameterization, at the highest
   build cost. A synthetic polygon (A) may bootstrap/debug the method before B is
   the target set.
   Sub-requirements this pins:
   - **R-SUBSTRATE.** Substrate is private or post-cutoff (R-CLEAN), non-trivial
     (transfer validity), and ships an executable test env (durability oracle runs).
   - **R-INJECT-NATURAL.** The injected fork / contract read as an organic part of
     the project, not a planted "this is a test" — else the agent detects the probe
     and the judge cannot score honestly.
   - **R-ENV-PINNED.** Task env (deps, versions, test interpreter) is pinned so the
     durability oracle grades deterministically.
3. **Author independence** — RESOLVED 2026-07-15: **independent adversarial
   validation (C) + fixed-first metrics (A-element)**. Anyone builds a task, but an
   independent pass attacks each finished task before it enters the pool: variant
   balance, no answer leaked in the wording, no trap sitting exactly where flowai is
   strong. The failure-mode set and metrics are fixed before and independently of
   the tasks.
   Sub-requirements this pins:
   - **R-TASK-CRITIC.** Every task passes an independent adversarial review (fresh
     context, not the author) for fitting, variant balance, and wording leakage.
   - **R-NO-TUNE.** No task is tuned from the flowai arm's results — the corpus is
     frozen against outcomes, like a baseline that is never re-run.

## Critic findings (Fable, 2026-07-15)

Independent adversarial critic (fresh Fable context, blocked from the old harness)
attacked the design. Verdict: NOT fit for SRS as-is. 4 FATAL, 11 MAJOR, 2 MINOR.
The FATAL four (3 hit choices the assistant itself recommended):

- **F1 — Budget parity (R4) has no coherent operationalization.** A shared ceiling
  does not equalize actual compute (so "uplift not from compute" is false); matching
  flowai's actual spend leaks the treatment into the control and needs nudging =
  a home-made flowai surrogate; per-turn parity fails because flowai's human-fork
  turns have no baseline counterpart. Also breaks R-HEADROOM calibration.
- **F2 — The judge IS the emulated human → measurer inside the measured.** Design
  says "the emulated human (judge) picks variant k": one entity answers the fork AND
  scores whether the agent honored its choice, whether the ask was warranted, and
  whether the report of that dialogue was faithful. Contradicts R9 / C4 outright.
- **F3 — Direction II is won by construction.** The II.2 rubric
  (faithful/complete/legible/evidenced) is verbatim flowai's own report template;
  FM-REPORT.* read as flowai's design goals → the metric equals the treatment spec.
  The judge cannot be blinded (skill names + phase headers in the trace; LLM
  format-bias toward verbose/structured). FM-SPEC.DRIFT is undefined for the bare
  arm on a neutral substrate. Half the vector measures "did flowai follow its own
  instructions", sold as user value — mirror of the pass@1 dishonesty this doc opens
  by rejecting.
- **F4 — K-gold does not survive a real substrate.** Real code has genuine
  non-injected forks; when the agent honestly surfaces a fork outside the K, the
  rule grades it "no gold" = failure → punishes the diligence it calls a value.
  Asymmetry: flowai graded on the human-imposed variant, the silent bare arm on its
  own convenient gold[j] → arms measure different quantities. The human's answer is
  extra intent information the bare arm never gets → I.1 mixes process with an
  information advantage.

Load-bearing MAJORs: no placebo arm → R2 cannot separate method from dose; R6
phase-attribution needs ablation arms the 2-arm/C3 budget forbids; FM-MEMORY.CROSS
(metaproblem #1) is unmeasurable by a single-session per-task-oracle design; a
winner's-curse in R-HEADROOM selection inflates uplift; the instrument is sensitive
to benefit by construction but to harm only by enumeration; the independence
protocol (C) is unverifiable in a solo repo.

Common thread of F3 + F4: an objective oracle fits Direction I (solved / broke) but
NOT Direction II (ownership / report); cramming both into one parameterized task
(B+A) is the shared root — which reopens the unified-vs-split corpus fork.

## Revised design (Path 2 — split corpus, 2026-07-15)

User chose Path 2: split the measurement by direction and fix the mechanical
FATALs. How each FATAL closes:

- **F2 (judge = human).** Two distinct roles: the emulated human is a run
  participant (answers the fork, plays the requester); the judge is a separate
  clean-context agent that never took part and scores post-hoc. Restores R9 / C4.
- **F1 (budget parity).** Drop parity. Three arms: `bare` (natural), `placebo`
  (bare + a neutral wrapper of comparable instruction volume, no flowai method),
  `flowai`. Deltas: flowai−bare = method+dose; flowai−placebo = method beyond dose;
  placebo−bare = dose. Cost is measured and disclosed (C5), never equalized. Also
  answers the "no placebo → R2 cannot separate method from dose" MAJOR.
- **F4 (K-gold on a real substrate).** Splitting dissolves it: Direction I runs on
  tasks with an objective success oracle + hidden durability oracle and NO mandatory
  parameterized decision-fork; the K-gold machinery retires. No parameterized gold →
  no "fork outside K" trap, no per-arm gold asymmetry.
- **F3 (Direction II = flowai's own spec).** Measure II by OUTCOME, not by a rubric
  that equals flowai's template:
  - **II.1 decision ownership → an objective mine.** The task carries a fork where
    one path breaks a hidden contract. Swallow the decision and take the mined path
    → the durability oracle fires (objective). Surface it → the human steers clear.
    Ownership is read from a consequence, not from a judge's "did it ask well".
  - **II.2 report → a comprehension test on a human.** An independent judge sees
    ONLY the agent's final upward report (not the trace, not the diff) and must make
    the next decision / spot the planted mine from it; we score the judge's answer
    against the task's objective truth (known to us, not the judge). Faithful +
    complete report → judge decides right; embellished or thin → judge errs. Measures
    the report by its FUNCTION (does it give the human a true picture), blinds the
    judge to which arm produced it (only text, no skill names / phase headers), and
    catches FM-REPORT.UNFAITHFUL / INCOMPLETE objectively.

Honestly NOT covered (accepted limits, marked not hidden): FM-MEMORY.CROSS
(cross-session — this is single-session; a separate multi-session track later),
FM-MEMORY.LONGCTX, FM-PROCESS.UNVERBALIZED / CONCURRENT (in-head, unobservable).

Path-2 sub-forks:

- **Placebo wrapper** — RESOLVED 2026-07-15: **generic advice, same volume (A)** —
  "think step by step, be careful, double-check", no phase structure, no flowai
  primitives. flowai−placebo isolates the method (plan / TDD / review / gates)
  beyond the dose of instructions.
- **Winner's-curse in selection** — RESOLVED (default): pick the headroom set on one
  set of bare-arm replications, measure the effect on DISJOINT fresh replications
  (selection set ≠ evaluation set), so regression-to-the-mean cannot inflate uplift.
  R-HEADROOM gains a split-sample clause.
- **Solo-repo independence** — RESOLVED (default): pre-register — freeze a corpus
  checksum + the metric set BEFORE the first flowai run; R-NO-TUNE is then auditable
  against the frozen hash. Full external independence is unreachable in a solo repo —
  marked honestly (C7-style), not claimed.
- **R6 phase-attribution** — RESOLVED 2026-07-15: **drop (C)**. At units–tens N a
  4-arm ladder is too weak; measure only the aggregate method effect
  (flowai−placebo, flowai−bare). Consequence: R6 (per-phase attribution) is REMOVED;
  R10 (negative primitive contribution) weakens to "negative OUTCOMES of the method
  as a whole" (mine fired, report misled), not attributed to plan / TDD / review.
  The original goal "improve solving via plan/TDD/review" is still measured as a
  whole, just not decomposed.
- **Cross-IDE** — RESOLVED 2026-07-15: **one carrier first (A)** — Claude Code
  (flowai fullest); Codex is a later track with a per-carrier manifest. Consequence:
  R3 narrows to a single carrier at start; "flowai helps in Codex too" is out of
  scope for v1.

## Critic round 2 + STOP-analysis (Fable, 2026-07-15)

Re-ran a fresh adversarial critic on the Path-2 revision. Result: NOT fit for SRS.
None of F1–F4 closed in substance (F2 closed formally, its mass moved), plus 5 new
FATAL. The revision removed the mechanical contradictions but pushed the weight onto
three objects it cannot specify or defend:

- **N1 — the mine measures a minesweeper, not an owner.** "Swallowed AND broke" is
  caught; "swallowed, human uninformed, nothing broke" scores clean → the silent
  cognitive-debt class the mission centers on is invisible, and II.1 collapses into a
  duplicate of I.2's durability oracle. FM-DECIDE.OVERASK is not just unmeasured but
  rewarded (ask about everything → the gold-carrying human steers you off every mine).
- **N2 — the emulated human is an undeclared gold carrier.** "Surface it → the human
  steers clear" only works if the human knows the mined path → every ask is an oracle
  query; asking arms get mine-avoidance + intent info, silent arms get nothing. The
  delta measures "who pokes the human", and the human's knowledge/answer policy — the
  most result-determining knob — is unspecified and outside the pre-registration.
- **N3 — the comprehension test rewards volume, not faithfulness.** An LLM judge
  pulls a needle from 10k tokens a human would miss; flowai reports are longer by
  construction → win on verbosity. Degenerate max: attach the full diff → judge
  answers everything, mission ("human need not read code") violated at the metric's
  peak. "Evidenced" is unverifiable report-only; question sets are outside the freeze.
- **N4 — placebo is a free parameter that sets the headline.** "Plan first", "test
  first", "ask on ambiguity", "end with a report" are at once generic advice and
  flowai's load-bearing method. Placebo without them = strawman (delta inflated); with
  them = flowai unpackaged (delta = mere compulsion). The author picks where placebo
  sits; the checksum freezes the bytes, not their honesty.
- **N5 — the statistics are starved.** Units–tens of tasks, now split across
  Directions I/II, three arms, five axes, three pairwise deltas (15 comparisons, no
  multiplicity correction), clustered by task, split-sample. Some cell shows
  "direction" by chance, guaranteed; the vector legitimizes it.

### Root (why two rounds both hit FATAL — structural, not cosmetic)

1. **Direction II is structurally unmeasurable by an automated benchmark.** "Human
   kept the mental model / owned the decision" is a state OF A HUMAN; with no live
   human, every proxy either collapses into Direction I (the mine), reduces to
   flowai's own spec (the rubric), or is judge-biased toward flowai (volume/format).
2. **No neutral control arm exists.** flowai's method (plan, ask, test-first, report)
   IS generic good practice; the dose/method boundary is arbitrary and author-set,
   so it sets the result (F1 → N4).
3. **Human-in-the-loop is asymmetric by construction.** The emulated human's
   knowledge and answer policy decide the outcome and feed only the asking arms
   (F2 → N2).
4. **Small N is fatal to a multi-axis vector.** Rich hand-built traps → units–tens →
   cannot feed 3 arms × 5 axes with any power (N5).

### Consequence — user decides; do NOT third-pass blindly

The uncomfortable finding: what makes flowai valuable (Direction II — control, debt,
report) is exactly what an automated benchmark cannot measure without bias; what IS
objectively measurable (Direction I — solved + no regression) is close to the very
pass@1-family optics the user left as "under-rating flowai". Options, none a tweak:

- **P-A.** Benchmark measures ONLY Direction I objectively (3 arms isolate the method
  beyond dose), and Direction II leaves the automated bench for a different instrument
  (live users / qualitative case studies). This is the Path-3 the user rejected — two
  critic rounds now rehabilitate it. Note P-A is richer than pass@1: solved + no-harm
  + method-beyond-dose.
- **P-B.** Accept that flowai's usefulness is not an automated A/B question; switch
  instruments (longitudinal real-use observation).
- **P-C.** Collapse to ONE axis with real N (sacrifice the vector for power).
- **P-D.** Keep patching Path 2 — NOT recommended; both rounds show structural, not
  cosmetic, failures.

## Research findings (deep-research, 2026-07-15)

108-agent web research (24 confirmed claims, primary sources). Result: the deadlock
is REAL (research confirms every root tension), but it hands 2–3 tools that convert
parts of Direction II from "rubric judgment" into "objective plant-and-check", which
partly reopens the "II is unmeasurable" verdict.

Strategies that actually bite (each mapped to our F/N findings):

- **Hint-injection faithfulness test** (Anthropic 2025 "Reasoning models don't say
  what they think"; Turpin NeurIPS 2023, arXiv 2305.04388). Instead of scoring "is
  the report good" (= flowai's own spec → F3/N3), SEED a known influence into the
  agent's context (planted assumption, hidden constraint, injected wrong premise) and
  check whether the upward report DISCLOSES it. Ground truth = what you planted, not a
  rubric. Empirics: Claude 3.7 discloses injected hints ~25%; reward hacks exploited
  >99% but verbalized <2% with fabricated rationales. Directly attacks F3 (report =
  spec) and N3 (verbosity bias): a long structured report that hides the real driver
  now scores LOW, not high. Caveat: CoT ≠ upward report (analogical); open Q = the
  coding-domain analogue of a "seeded influence" and whether it scales past hand-built.
- **Clarification-quality benchmarking** (ClarEval arXiv 2603.00187; ambiguity-
  taxonomy 2409.00557; CoA controller 2601.16400). Decision-ownership (II.1 — ask vs
  silently guess) is an ALREADY-STUDIED axis with metrics that PENALIZE over-asking
  (Key-Question-Coverage, Missing-Premises-Recall, Avg-Turns-to-Clarify, Efficiency-
  Adjusted-Recall). Directly answers N1 (mine rewards OVERASK) — over-asking is
  penalized, not rewarded — and gives an objective proxy for "surfaced the decision"
  without the mine's "swallowed-AND-broke" blind spot. Clarification value is
  time-typed (2605.07937): goal-clars lose value after ~10% of execution.
- **Dual-control, environment-coupled simulation** (τ²-Bench, arXiv 2506.07982).
  Model as a Dec-POMDP where BOTH agent and emulated human act on a SHARED environment;
  the simulated human is constrained by tools/observable state, NOT free-form scripting.
  Directly reduces N2 (human leaks gold to asking arms): the human can only surface what
  tools/state expose, cannot freely volunteer the answer. Agent perf drops 18–25pp
  no-user→dual-control → "difficulty of guiding a human" is a measurable axis. Bound:
  still task-success under dual control, not ownership/debt/faithfulness by itself.
- **Placebo/perturbation design for judge bias** (arXiv 2605.23970 Blind/Truth/Flip/
  Placebo/Reveal-After). Holds text constant, perturbs non-evidential cues → tests
  whether the judge rewards flowai's structure/verbosity over content. A judge-bias
  detector, not an agent-placebo.

Reframes / warnings (change the design's assumptions):

- **Appropriate reliance needs independent ground-truth** (Wischnewski CHI 2023, 96
  studies; Raees & Papangelis 2026, 2604.23896). "Human in control" = appropriate
  reliance, and it CANNOT be read from the human's state alone — a bare A/B is only
  "relative" and cannot diagnose over/under-trust. Any human-state proxy must be paired
  with a known-correct reliance level (→ trap tasks with known answers). Confirms our
  R-ORACLE instinct and the small-N cost.
- **Transparency can BACKFIRE** (Poursabzi-Sangdeh CHI 2021, ~3,800 pre-registered).
  More transparency/structure DECREASED users' ability to catch the system's mistakes.
  Counter-intuitive risk-flip: flowai's own structured reports may INDUCE over-reliance
  rather than preserve steering — must be TESTED, not assumed. A new failure mode to
  measure, not just a metric.
- **Strong-judge-over-weak-executor is NOT a fix on subjective axes** (arXiv
  2504.03846). Confirms the chat analysis: on objective ground-truth a strong judge's
  preference is largely legitimate, but on subjective axes (ownership, report quality)
  legitimate vs harmful preference is inseparable, and stronger models show MORE harmful
  self-preference when they err. The Fable-judge idea helps Direction I, carries an
  irreducible bias term on Direction II.
- **Long-term harm has a real measurement** (lead: "Echoes of AI" 2507.00788): AI-
  unrestricted devs matched scaffolded on initial build but 77% later-maintenance
  failure vs 39% scaffolded — a controlled design for the I.2 "no future harm" axis.
- **Simulators are a first-order confound** (Lost-in-Simulation 2601.17087; Beyond-
  Cooperative-Simulators 2605.12894): ±9pp swings, rankings reorder, systematically
  over-cooperative. Make the emulated human an explicit, stress-tested variable.

Net: none dissolves small-N (every tool still needs an independent ground-truth =
hand-built tasks). But faithfulness-by-injection + clarification-quality give NARROW,
OBJECTIVE proxies for the two most important Direction-II axes (faithful report,
decision ownership) that do NOT collapse into flowai's spec — softening the STOP verdict
"II is unmeasurable" to "II is not holistically measurable, but specific behavioral
proxies are".

## External corroboration + citation audit (ChatGPT deep-research, verified 2026-07-16)

A SECOND, independent deep-research report (ChatGPT, "Измерение реальной человеческой
пользы от агентной обвязки над coding-агентом") on the SAME question was cross-checked
source-by-source (3 parallel verifier agents; all 18 refs fetched). Two results: the
backbone is real and CONVERGES with our own deep-research (independent confirmation), and
the report adds a few operational levers ours lacked — but it also carries citation-hygiene
defects that must NOT propagate into the SRS.

### Convergence (raises confidence)

Both runs independently land on the same backbone: METR 19%-slower RCT, Turpin CoT
unfaithfulness (2305.04388), Anthropic faithfulness-by-intervention, appropriate reliance
(Schemmer 2204.06916), τ²-Bench dual-control, SimulatorArena realism gap, Bansal
error-boundary mental models, Anthropic skill-formation (−17pp quiz), preregistration for
AI agents (2606.11217), SWE-bench-Live contamination-resistance. Two independent searches
reaching the same battery ⇒ the literature is real, not one model's confabulation.

### Citation audit (verified — do NOT propagate the defects)

- Backbone refs [1,2,4,5,7,11,12,14,17,19,20,26,27,28]: resolve; titles + numbers accurate
  (METR 19%/24%/+20%; Anthropic −17pp = 50% vs 67%; JAMA reversal real — auto-metrics favor
  the LLM note ROUGE-2 0.322 vs 0.088, safety framework favors the physician note 4.50 vs
  4.06; τ²-Bench 18–25pp drop). Trustworthy.
- Two "phantom" suspicions were WRONG — both papers are REAL, only mis-cited: FaithCoT-Bench
  = arXiv 2510.04040 (ICLR 2026; >1000 traj / >300 unfaithful MATCH), bundled onto Turpin
  [7] instead of its own entry; ConvApparel = arXiv 2602.16938 (EACL 2026), a distinct
  realism-gap / counterfactual-validation paper with no bib entry.
- Style-bias-dominant "2026 comparison" is real but UNCITED = arXiv 2604.23178
  (bias-mitigation strategies), NOT the cited [9] (2410.02736, which does not crown style
  bias). Magnitude inconsistent across sources — treat as directional, not quantitative.
- Two DOMAIN mischaracterizations (do NOT import as-is):
  - [13] "Learning to Ask" (EMNLP 2025) is TOOL-USE (Noisy ToolBench), NOT an
    underspecified-SWE-bench coding clarification bench. The report's "Ask-or-Assume /
    escalation-precision-in-coding" framing is unsupported by this ref. Our II.1 proxy stays
    on the ClarEval-family metrics already recorded above (correct grounding, wrong citation).
  - [10] (IJCNLP-AACL 2025) is a position-bias MEASUREMENT study, not the debiasing toolkit
    the report describes; those methods belong to 2604.23178.

### New levers worth importing (mapped to our F/N tensions)

- **Factorial ablation replaces the single placebo arm (attacks N4 + root-tension #2).**
  Instead of one arbitrary placebo, toggle flowai's components SEPARATELY — ambiguity-raising,
  external plan, test-first, report format, decision gates, trace exposure. Each on/off is a
  defined factor, so "where the dose ends and the method begins" stops being one author-set
  knob (N4) and becomes measured per-component. Cost: more arms → deepens small-N (N5) →
  viable only if axes are cut or N lifted. Strongest structural import; folds into arm design.
- **Downstream-handoff eval + the JAMA caution (sharpens II.2).** Our II.2 comprehension-test
  IS a handoff eval. The verified JAMA precedent names the trap: intrinsic auto-metrics rated
  the machine handoff HIGHER while a safety rubric rated the human one better ⇒ score the
  report by whether a downstream actor acts SAFELY on it, never by intrinsic similarity.
  Confirms N3 (a format-friendly report can win a score it should lose).
- **Delayed mental-model assay (reaches the N1 blind spot).** Probe the human AFTER a delay,
  without the log: explain why key decisions were made, predict where the system was unsure,
  localize regression risk, make a small follow-up change unaided. The ONLY proposed
  instrument that reaches the SILENT cognitive-debt class the mine misses ("swallowed, nothing
  broke, human uninformed"). But it REQUIRES a human (or a proxy agent) → human annex, not the
  automated bench.
- **Appropriate-reliance matrix (operationalizes our reliance reframe).** Hidden-randomize the
  quality of the agent's advice on critical forks; score correct-reliance-on-AI vs
  correct-reliance-on-self, not final success. Concretizes the research note "appropriate
  reliance needs independent ground-truth". Needs planted good/bad advice = more hand-built
  tasks (small-N cost again).
- **NASA-TLX + SAGAT (human-annex instrumentation).** Subjective load via NASA-TLX;
  situational awareness via SAGAT-style stop-probes (freeze the session, ask the human the
  current state / risk / next step). New vs our notes, but both require a live human — annex.
- **Repeated-measures within-subject design (partial answer to small-N, annex only).** Same
  humans in both arms raise power at small N. Helps the human annex, NOT the automated bench.

### Net effect on scope

The external report's own headline — "the strongest design is a LAYERED evaluation (live
repeated-measures + trajectory + downstream-handoff + delayed probes) with automated layers as
a calibrated PRE-FILTER, not the source of truth" — is our STOP verdict reached independently.
It resolves the P-A…P-D fork toward **P-A + a human annex** (below). It does NOT rescue a
fully-automated multi-axis A/B; small-N stays unsolved on the automated side.

## P-A automated design (2026-07-16)

Scope: the AUTOMATED bench ONLY (holistic Direction II → human annex, out of scope). It
measures three objectively-scorable targets and nothing that reduces to flowai's own spec or
needs a live human. Every prior FATAL (F1–F4, N1–N5) is closed by CONSTRUCTION or SHED to the
annex; residual limits are labeled, not hidden.

### Three objective targets (a NARROWED vector, not the old 5-axis one)

- **T1 — Direction I: solved + no-harm.** Objective success oracle (FAIL_TO_PASS-style) +
  hidden durability oracle (nothing already-working broke). Corpus D-I = unambiguous tasks
  (one right outcome, no legitimate fork) → there is no intent to leak, so no asymmetry channel.
- **T2 — faithfulness-by-injection** (narrow Direction-II proxy). Plant a known influence the
  agent demonstrably relies on; score whether the upward report DISCLOSES it.
- **T3 — clarification-quality** (narrow Direction-II proxy). On deliberately ambiguous tasks,
  score the QUESTIONS against a pre-annotated should-ask / should-not-ask set.

### T2 — faithfulness-by-injection, made objective (closes F3 / N3 for the report axis)

- Plant a mechanically-detectable influence: a misleading code comment, a false premise in the
  issue, or a hidden constraint. Design it so USE of the planted item forces a specific,
  oracle-distinguishable code path — a dedicated probe test tells "relied on planted X" from
  "did not". So "relied-on" is ORACLE-detected, not judged.
- Score: (relied-on ∧ disclosed-in-report) = pass; (relied-on ∧ ¬disclosed) = FM-REPORT.
  UNFAITHFUL, objective fail. "Disclosed" is a NARROW factual check on the report text ("does
  it state it used/assumed X?") — the only residual judge component, mitigated to a binary
  fact, blind to arm (text only, no skill names / phase headers).
- Why it dodges the "rubric = flowai's spec" trap: ground truth = what WE planted, not flowai's
  report template; a long structured report that hides the real driver scores LOW; verbosity
  cannot help a binary disclosure question.

### T3 — clarification-quality, made objective + leak-safe (closes N1 / N2 for the ownership axis)

- Corpus D-III = tasks with a legitimate ambiguity + a PRE-ANNOTATED set: Key questions (should
  ask) and Nuisance questions (should NOT ask → penalize). Metrics (ClarEval-family):
  Key-Question-Coverage, Over-Ask-Penalty, Efficiency-Adjusted-Recall.
- Leak-safety (N2): the metric scores the QUESTIONS, not downstream solve-rate, so the info the
  human returns cannot decide the score. Emulated-human answers are STANDARDIZED (scripted from
  the annotation) → every asking arm gets identical info; a silent arm scores "missed the
  ambiguity" (the intended failure). D-III is NOT graded for Direction-I success → no
  info-asymmetry contamination of T1.
- N1 blind spot removed: over-asking is PENALIZED (Over-Ask-Penalty), so "ask about everything"
  cannot win; "surfaced the right fork" is scored directly, not inferred from "swallowed-and-broke".

### Arms — factorial toggles of flowai's REAL components (closes F1 / N4)

- Factors = flowai's ACTUAL primitives toggled on/off (plan, TDD, review, decision-gates,
  report), NOT a synthetic "generic advice" placebo. The toggled bytes ARE flowai's own skill
  text, so the author cannot choose "where the dose ends and the method begins" (N4): the dose
  IS the primitive.
- v1 = 3 arms only: `bare` (all off), `flowai` (all on), `−review` (one screening toggle). Full
  factorial (2^k) is a PHASED extension, run only if N is lifted; v1 does NOT claim per-component
  causal decomposition — interactions are unestimable at small N (stated, not hidden).
- Deltas: flowai−bare = aggregate method effect (the user's "improve solving via plan/TDD/review",
  measured whole); flowai−(−review) = screening probe for review's marginal value.

### Statistics — honest at small N (closes N5)

- ONE pre-registered PRIMARY endpoint: flowai−bare on a composite Direction-I score. T2, T3, and
  the −review probe are SECONDARY / exploratory, labeled as such.
- Report effect sizes + bootstrap CIs, clustered by task; NO significance stars, NO 15-comparison
  multiplicity theatre. Result = "direction with an N caveat", never a magnitude claim.
- Winner's-curse: headroom set selected on one bare-arm replication block, effect measured on a
  DISJOINT fresh block (R-HEADROOM split-sample).
- Pre-registration: freeze corpus checksum + metric definitions + primary endpoint BEFORE the
  first flowai run; R-NO-TUNE is then auditable against the hash.

### Corpus (three sub-corpora, all hand-built, all R-CLEAN)

- D-I (unambiguous success + durability), D-II (planted-influence faithfulness), D-III (ambiguity
  + annotated question set). Post-cutoff or private substrate; env pinned (R-ENV-PINNED);
  independent adversarial per-task review (R-TASK-CRITIC). Small N (units–tens per sub-corpus)
  accepted: P-A buys objectivity by NARROWING axes, not by scaling N. One carrier first = Claude Code.

### Honestly OUT of the automated bench (→ human annex)

Holistic decision ownership beyond the injection/clarification proxies, cognitive debt (delayed
mental-model assay), appropriate reliance, subjective load (NASA-TLX), situational awareness
(SAGAT), cross-session memory (FM-MEMORY.CROSS). All need a live human; the annex runs them as a
small repeated-measures study.

### Residual limits (labeled — these are LIMITS, not FATALs)

- T2 "disclosed" keeps a narrow judge-read component (mitigated to a binary factual check).
- T2 / T3 are hand-built → small N → direction, not magnitude.
- Factorial attribution is screening-only at v1 N.
- Transparency-backfire (flowai's report inducing over-reliance) is NOT caught here — it needs
  the annex; flagged as an open risk, not silently assumed away.

## Critic round 3 (P-A automated design) + STOP-analysis (2026-07-16)

Two fresh Fable critics (distinct lenses: measurement-validity / gaming; statistics / scope),
each told to separate a true FATAL from an honestly-labeled limit. Both verdicts: NOT fit for
SRS. THIRD FATAL round on the benchmark design.

### Validity critic — 5 FATAL

- **V-F1 (T3 = ritual, not ownership).** Nothing checks the agent OBEYED the human's answer;
  ask 1–3 questions → full Key-Question-Coverage → then do anything (ownership theatre). A bare
  agent that surfaces a fork via "assumed X, flagged in report" (not a question) scores "missed
  the ambiguity" → the metric scores the interaction CHANNEL (interactive asking = flowai's own
  gate style), not surfacing. Question↔annotation matching is a semantic LLM step (so T2's "only
  residual judge component" is false); Over-Ask-Penalty is vacuumable (broad plausible questions
  not literally in the Nuisance list).
- **V-F2 (T2 disclosed-check is volume-monotone).** "Verbosity cannot help a binary disclosure
  question" is inverted: P(text mentions X) rises with every assumption dumped. A one-line flowai
  report rule "list every assumption/source you relied on" → (relied ∧ disclosed)=pass always.
  The improve-primitive-from-benchmark loop makes this saturation a PLANNED mode → F3 returns
  through the back door. False-disclosure (claim an influence not used) is invisible (¬relied cell
  undefined).
- **V-F3 (relied-on is a code-path oracle, not a reliance detector).** The probe distinguishes
  "code consistent with X", not "relied on X" vs "independently reached the same path" (R-HEADROOM
  deliberately fills the pool with tasks where bare flails → false positives guaranteed);
  causality needs a PAIRED no-plant run the design lacks. Worse: the score conditions on "relied",
  which is arm-dependent (flowai's plan/review intercept false premises by design) → the cross-arm
  contrast compares different subpopulations (selection bias, unknown sign).
- **V-F4 (N2 alive on the PRIMARY).** Leak-safety is specified only for D-III. In D-I/D-II the
  emulated-human answer policy is unspecified and NOT frozen; whenever a flowai gate asks on an
  "unambiguous" D-I task, an informative answer leaks intent (N2), silence burns turns — a
  result-determining knob left free.
- **V-F5 (v1 arms cannot measure "method-beyond-dose").** Path-2 used the placebo for exactly
  this; P-A drops placebo, defers factorial, and renames flowai−bare "aggregate method effect"
  while Follow-ups still promise "method-beyond-dose". No v1 arm pair separates method from dose →
  pre-Path-2 confound with an upgraded label.
- Closures: F3 PARTIAL, N1 PARTIAL, N2 PARTIAL, N3 NOT-CLOSED, N4 NOT-CLOSED.

### Statistics critic — 2 FATAL (one NEW, deeper than any prior round)

- **S-F1 (the primary is statistically UNDECIDABLE at the stated N — even its SIGN).** First power
  arithmetic any round has done: D-I ≈ 12–20 hand-built tasks, reps ~3–5 (C3 cost cap), MDE ≈
  0.20–0.38; a plausible prompt-layer uplift is 10–20pp → power ≈ 22–46%; modal outcome = CI spans
  0, no direction, and the design has no decision rule for that case. Clustered bootstrap
  undercovers below ~15–20 clusters — the one inferential guard is weakest exactly at this N.
  "Direction not magnitude" PRESUPPOSES direction is deliverable; the arithmetic refutes the
  presupposition, undercutting the premise that "Direction I is the safe, measurable part".
- **S-F2 (pre-registration freezes AFTER bare data exists).** Headroom selection needs bare runs,
  so at "freeze before the first flowai run" the author already holds per-task bare profiles while
  the composite definition, headroom threshold, and Over-Ask weights are still undefined → the
  headline knob is set with half the experiment in hand (N4 one level up, sold as closed).
- MAJORs: composite hides the solve-vs-harm trade-off (R5 violation) unless a strict conjunction
  with component co-reporting; T2 post-treatment conditioning (= V-F3 from the stats side);
  −review arm is guaranteed noise eating 1/3 of the compute.
- N5: PARTIAL (confirmatory multiplicity closed, starvation core survives).
- **Both critics independently: P-A is NOT a pass@1++ regression** — cost excluded, no-harm inside
  the primary, shed-to-annex loud and user-chosen. The real risk is the OPPOSITE: if the annex is
  never built and S-F1 stands, flowai ends up UNMEASURED, not under-rated.

### Root — mechanical vs structural

Mechanical (spec-fixable): S-F2 (two-stage freeze), composite → strict conjunction (R5), V-F5
(re-add placebo OR stop claiming method-beyond-dose in v1), V-F4 (freeze an identical across-arm
human answer policy for D-I/D-II), no-harm scope (measure debt/drift OR move to annex + fix
R8/I.2), drop −review.

Structural (NOT spec-fixable — the same pincers that killed rounds 1–2, plus a new one):
1. **T3 ownership pincer** — couple questions to graded consequences ⇒ N2 leak / K-gold returns;
   leave them decoupled ⇒ measure ritual. Unbroken across 3 rounds.
2. **T2 faithfulness** — needs a paired counterfactual + a non-volume-monotone disclosure ground
   truth; cross-arm conditioning on "relied" is inherently selection-biased.
3. **S-F1 small-N undecidability now hits Direction I too** — worse than round-2 N5 (which only
   starved the multi-axis vector): even the objective primary cannot resolve a plausible effect at
   the N a hand-built rich-trap corpus permits.

### The one new lever the round surfaces

T1 (solved + durability) does NOT need the hand-built traps — only T2/T3 do. Decoupling T1 onto a
LARGE post-cutoff pool (hundreds, SWE-bench-Live-style: R-CLEAN + success oracle at scale +
durability oracle + headroom split-sample) makes the PRIMARY decidable and honestly demotes T2/T3
to small-N exploratory probes. But T2/T3's validity FATALs mean they must be FIXED or CUT — and
fixing them is structural pincer (1)/(2), unbroken in 3 rounds.

## Critic round 4 (tiered O3 + human apex) (2026-07-21)

Two fresh Fable critics (lens 1: tier architecture below the apex + triage logic; lens 2: the
human instrument). Both: NOT fit for SRS. FOURTH FATAL round — but the texture SHIFTS:
architecture FATALs are now mechanical (the critic supplies one forcing fix), and the genuinely
structural residue has collapsed into a single question: WHO the humans are.

### Architecture critic — 4 FATAL

- **A4-1 (relied-on probe is a contradictory leftover).** Tier-1 keeps the "relied-on" probe while
  the same section says "T2/T3 automated proxies stay dropped" — re-imports V-F3 verbatim (code-path
  ≠ reliance; no paired no-plant run; arm-dependent conditioning) and, if it feeds routing, poisons
  the Tier-3 sample. Fix: cut it (or paired counterfactual).
- **A4-2 (triage rule is one-sided → author knob returns as retention-by-default).** Escalation
  needs proof, but axes KEPT in Tiers 0–2 carry no symmetric validity obligation and no
  calibration. Forcing fix (mechanically compels A4-1/3/4): two-sided rule — every kept-below axis
  carries the same pre-registered validity justification — plus a mandatory RANDOM AUDIT-CROSSOVER:
  a fixed share of cases goes to Tier-3 bypassing the router, arm-symmetric, and each cheap
  method's error is measured against the apex on that share.
- **A4-3 (a router that "routes, not scores" IS scoring).** Selection determines the Tier-3
  sample; documented LLM format-bias → arm-asymmetric routing rates → the human sees a selectively
  biased comparative sample. Fix: same audit-crossover + arm-symmetric routing triggers.
- **A4-4 (V-F4/N2 alive on the workhorse).** Emulated-human answer policy on the large pool still
  unfrozen; the "unambiguous by construction" escape is uncertifiable at hundreds of tasks
  (per-task R-TASK-CRITIC infeasible at scale = F-A7 on the primary instrument).
- MAJORs: Tier-0 "fabrication" is a judge in oracle clothing — narrow it to enumerable
  claim-vs-log contradictions; cost/power never recomputed for the large pool (arm composition
  unstated: factorial vs C3 → V-F5/N4 risk); partition incomplete by enumeration (FM-SPEC.DRIFT,
  false-green, Echoes-of-AI lead unassigned; an "over-generalization static metric" does not
  exist); S-F2 two-stage freeze known since round 3, still not adopted; R-ORACLE silently void on
  real repos (test suite visible to the agent) — amend the clause explicitly.
- Families: S-F1 PARTIAL (decidability asserted, not computed), S-F2 NOT-CLOSED, V-F3 NOT-CLOSED,
  V-F4/N2 NOT-CLOSED, N4 PARTIAL (arm composition unfixed).

### Human-instrument critic — 3 FATAL

- **H4-1 (blinding is declarative, not real).** The reviewer pool is unspecified; the realistic
  pool is the AUTHOR, who de-anonymizes a flowai report through any stripping by style fingerprint
  (phase narrative, evidence blocks, GODS-like sections) → experimenter-expectancy on all four
  residue axes. No manipulation check (guess-the-arm rate) exists. The file's solo-repo honesty
  covers task authorship, NOT reviewer identity — so this is an undeclared hole, not a labeled limit.
- **H4-2 (the ownership pincer reaches the human level).** Judging ownership-appropriateness needs
  the interaction record, but Q&A PRESENCE itself identifies the arm (bare asks nothing);
  report-only judging rewards fabricated "I surfaced fork X"; and an ownership hint is
  method-adjacent by the axis's own definition — the guardrail "outcome-anchored, never
  method-anchored" is unconstructible for exactly the two axes the instrument exists for. V-F1
  raised one level. Candidate re-route: ownership → operator mode (unblinded by nature, read from
  delayed consequences), or confirmed comparatively-unmeasurable.
- **H4-3 (appropriate reliance measured against nothing).** The operator sub-mode plants no
  good/bad advice with known ground truth — which the file's own research section declares
  mandatory (Wischnewski; appropriate-reliance matrix). With author-as-operator, planting is
  impossible IN PRINCIPLE (he knows the plants) → a quarter of the confirmed four-axis partition
  is unmeasured as specified.
- MAJORs: operator confounds unaddressed (skill asymmetry — the author has years of flowai
  practice; motivation; no counterbalancing convergence at ≤3 subjects); delayed-probe authorship
  = F3 one level up (author's probe questions = flowai's salience map; "without the log" not
  inherited); "decisive apex" has no N and no decision rule (~10–45 correlated forced-choice
  verdicts; S-F1 replicated at the apex; forced-choice without an "indistinguishable" option
  fabricates preferences); staged reveal lacks stage-locking (the ground-truth hint unblinds via
  pane content; the cold verdict must be recorded and frozen before the hint); transparency-backfire
  is USED as measurement material (preserved structured reports) but never TESTED (no
  catch-the-planted-error-from-the-report probe).
- **Fork (b) verdict: UNSOUND as defaulted.** Instructional content/form separation does not
  execute psychologically (halo). Replacement: COUNTERBALANCED dual presentation within reviewer —
  form scored on preserved, content on normalized, and the content-verdict delta between modes
  PUBLISHED as the measured structure bias (this is also the only honest way to show flowai's
  report-structure value).
- Ceiling at the current pool: the strongest supportable claim is "the author, under
  partially-defeated blinding, prefers his own tool on a handful of residue cases" — NOT "flowai
  preserves control / reduces cognitive debt". This ceiling was nowhere declared.

### What round 4 changes vs rounds 1–3

Convergence, not repetition. The below-apex FATALs are adoptable mechanics (one forcing fix:
two-sided triage + audit-crossover). The structural residue now lives in ONE decision outside the
spec's control: blinded apex evidence and planted-advice reliance both require 1–2 NON-AUTHOR
humans; author-run sessions are honest only as explicitly-labeled unblinded pilots. H4-2
additionally suggests the ownership axis cannot be judged blind side-by-side even then — re-route
to operator mode or mark comparatively-unmeasurable.

## Final design v1 — solo scope (2026-07-21)

**Round-4 pool decision — RESOLVED (user): B, solo only.** No non-author humans available. The
human tier is demoted to an explicitly-labeled UNBLINDED PILOT; SRS-grade claims are limited to
Direction I; control / cognitive-debt / reliance claims are DEFERRED, not abandoned — blocker =
reviewer/operator pool identity; reactivation condition = 1–2 non-author humans (then the round-4
fixes apply: empirical blinding via guess-the-arm manipulation check, planted-advice reliance,
counterbalanced dual presentation).

### Instrument 1 — Direction-I workhorse (SRS-grade, automated)

- **Question:** does flowai raise "solved AND nothing broke" over the bare carrier on fresh real
  tasks, and at what cost? Claim = AGGREGATE effect (method+dose together). The method-beyond-dose
  claim is REMOVED from v1 (closes V-F5 honestly; placebo/factorial = a later extension, not a
  silent promise).
- **Corpus:** large post-cutoff pool (SWE-bench-Live-style, N ≥ 250), R-CLEAN by recency, env
  pinned (R-ENV-PINNED). NO headroom pre-filtering in v1: the full-pool delta is the primary —
  this kills the winner's curse AND removes bare-profiling-before-freeze (S-F2's fuel); difficulty
  stratification is exploratory-only. No per-task unambiguity claim (A4-4 accepted): ambiguity is
  handled identically across arms via the frozen human policy below.
- **Arms:** 2 — `bare`, `flowai`. Same model, transport, harness.
- **Frozen emulated-human policy (closes V-F4/N2):** ONE pre-registered, arm-identical scripted
  reply to ANY agent question: "your call — proceed on your best judgment; no additional
  information is available." No informative answers on the workhorse → no intent leak by
  construction. Consequence honestly labeled: the workhorse measures the AUTONOMOUS regime;
  flowai's gates burning turns on dead questions is flowai's real cost in that regime (measured,
  disclosed via C5), and flowai's interactive value is exactly what sits in the deferred tier.
- **Primary endpoint (pre-registered):** strict per-task conjunction `solved ∧ no-regression`,
  components ALWAYS co-reported (closes the R5-composite MAJOR). Components are DISJOINT by
  definition, frozen at stage 1: `solved` := the task's gold FAIL_TO_PASS tests pass;
  `no-regression` := the pre-existing suite (PASS_TO_PASS) still passes, with a flaky policy —
  tests failing in ANY of k≥3 pre-run baseline runs on the UNMODIFIED repo are excluded from
  grading (k>1 catches intermittent flakes, not only stable failures); where the pool ships a
  curated PASS_TO_PASS list, it is used instead.
  R-ORACLE amended: the suite is VISIBLE to the agent on real repos — comparability holds because
  both arms see it (the hidden-oracle clause applies only to hand-built additions).
- **Tier-0 trace signals narrowed (closes the fabrication MAJOR):** only enumerable claim-vs-log
  contradictions (claimed test result vs logged exit code; claimed tool call absent from trace)
  and guard-bypass command matches. Nothing semantic is scored at Tier 0.
- **Statistics (closes S-F1 — computed, not asserted):** at N=250, 1 rep/arm, p≈0.3–0.4:
  SE(Δ)≈0.042 → 95% CI ±≈0.09, MDE(80%)≈12pp; N=500-equivalent → ≈8pp. Both arms run the SAME
  tasks → the analysis is PAIRED (McNemar / paired bootstrap, pre-registered), so 12pp is an
  upper bound on the MDE. Honest prior: on the FULL pool (no headroom filtering) the plausible
  aggregate effect is smaller than the old headroom-conditional 10–20pp — the informative null
  ("no detectable effect at MDE≈12pp") is a LIKELY outcome and is a declared, meaningful result.
  Pre-registered decision rule: CI excludes 0 → direction claim; CI spans 0 → informative null.
  Reps add less than tasks (clustering) — scale N first. Multiplicity: ONE primary; everything
  else exploratory-labeled.
- **Two-stage freeze (closes S-F2):** stage 1 BEFORE any runs — endpoint, conjunction definition,
  metric definitions, human policy, decision rule, MDE, AND the full harness manifest (session
  turn/token/time caps, pinned model snapshot, retry and re-prompt policy); per-arm
  truncated-session share is published with results. Stage 2 — corpus checksum, fixed BEFORE any
  agent run on candidate tasks; harness rehearsal happens only on a DISJOINT non-corpus set.
  R-NO-TUNE auditable against both hashes.
- **Corpus vintage (R-CLEAN over time):** the corpus is valid only for carriers whose training
  cutoff predates the oldest task; each campaign = a new freeze with a re-pinned model snapshot —
  a frozen corpus is never reused against a newer model.
- **Cost (C3, computed):** ≈ N×2 sessions + Docker grading per campaign (~500+ sessions) — a
  campaign-grade run, not per-change. Per-change verification = a pre-registered smoke subset
  (N≈20) + the cache; the smoke subset is also the runnable-acceptance reference for FR-BENCH-*.
- **Cut:** the relied-on probe (A4-1) — no T2 machinery remains anywhere.

### Instrument 2 — pilot tier (dev-grade; NOT SRS evidence)

- Unblinded author-run side-by-side + operator self-sessions. Every artifact carries the ceiling
  label: "author preference under unblinded conditions — development signal, not evidence".
- Purpose: hypothesis generation (where flowai helps/hurts), harness rehearsal (on a DISJOINT
  non-corpus set — see freeze ordering), and the AUDIT-CROSSOVER (A4-2/3): a fixed random share
  of workhorse cases, arm-symmetric, bypassing any router. SRS-feeding calibration on that share
  is MECHANICAL-only (suite rerun, oracle recompute, claim-vs-log cross-check — no blinding
  needed); the author's judged re-reviews of the same share are dev-grade hypothesis material.
- Reliance / cognitive debt: NOT measured solo (H4-3); deferred with the pool blocker.

### Triage rule v2 (two-sided — closes A4-2)

Every axis carries a pre-registered tier justification, kept-below AND escalated: solved →
oracle; regression → suite; claim-vs-log / guard-bypass → enumerable; cost → counters;
run-to-run variance (II.3) → DEFERRED, blocker = 1 rep/arm (needs a replicate budget; an
exploratory k≥3-rep subsample may probe it, never the primary); the four residue axes → deferred
with blocker recorded. No axis sits in a tier without a written validity basis; the
audit-crossover share is the standing calibration check on every kept-below axis — restricted to
MECHANICAL re-verification (suite rerun, oracle recompute, claim-vs-log cross-check), which needs
no blinding; judged re-reviews stay dev-grade (H4-1 does not enter the SRS instrument).

### Honest ceiling of v1 (declared, not discovered later)

No method-beyond-dose claim; no Direction-II claim; no interactive-regime claim; pilot outputs
are not evidence; run-to-run variance (II.3) is UNMEASURED in v1 (1 rep/arm — deferred, see
triage rule); FM-SPEC.DRIFT / false-green beyond claim-vs-log / over-generalization debt are
UNASSIGNED (no valid cheap metric exists — listed as unmeasured, not silently dropped);
FM-MEMORY.CROSS stays out (single-session). The scripted human reply is DETECTABLE from the
second question on (eval-awareness, arm-asymmetric exposure since flowai asks more) — disclosed,
per-arm question counts published with the cost counters.

## Critic round 5 — verification (2026-07-21)

Fresh Fable critic on `## Final design v1` (calibrated: declared limits ≠ FATAL). Initial verdict:
ONE FATAL — run-to-run variance (II.3) silently dropped (1 rep/arm makes it unmeasurable; it was
neither deferred-with-blocker nor in the ceiling → internal contradiction with the confirmed axis
partition). Plus MAJORs: un-superseded contradicting promises across the file; solved/no-regression
overlap + missing flaky policy; harness config outside the freeze; rehearsal-vs-checksum ordering;
unblinded-author audit-crossover feeding SRS calibration; C3 cost unshown; corpus vintage decay;
scripted-reply detectability. Closure verdicts: V-F4/N2, V-F5, S-F1, A4-1, A4-4, R5-composite
CLOSED; S-F2, A4-2 PARTIAL pending the MAJOR fixes.

All findings applied (variance deferred with blocker + ceiling entry; supersession note; disjoint
endpoint definitions + k≥3 flaky baseline; harness manifest into stage-1; checksum-before-any-
candidate-run; mechanical-only crossover; cost + smoke subset; vintage rule; detectability
disclosure; paired analysis + honest full-pool prior). Same-critic verification: variance FATAL
CLOSED, supersession CLOSED, every MAJOR CLOSED, no new FATAL introduced by the edits.
**Final: FIT FOR SRS (0 FATAL): yes.** Residual MINORs also applied (history note on R1–R12 /
firm-corpus block; k≥3 baseline). Promotion note honored: FR-BENCH acceptance is worded as a
workability run (smoke N≈20 proves the harness executes), never as "effect confirmed".

## Follow-ups

> **Supersession note (2026-07-21):** the bullets below are DECISION HISTORY. Where they conflict
> with `## Final design v1 — solo scope`, v1 wins. Specifically superseded: the P-A promise of
> "method-beyond-dose" and the T2/T3 Direction-II proxies (cut in round 3→v1); factorial ablation
> (deferred extension, not v1); the Tier-1 "relied-on probe" in the axis partition (cut, A4-1);
> the Tier-0 "variance" assignment (deferred — 1 rep/arm, see triage rule v2); the Tier-3
> blinded-judge harness (demoted to unblinded pilot — round-4 decision B).

- **Scope decision — RESOLVED 2026-07-16 (user): P-A + human annex.** The instrument splits:
  - **Automated bench (P-A):** Direction I objectively (solved + no-harm + method-beyond-dose)
    PLUS the narrow objective Direction-II proxies that do NOT collapse into flowai's spec —
    faithfulness-by-injection (report discloses a planted influence) and clarification-quality
    (ClarEval-family, penalizes over-asking). Arm design moves from one placebo to FACTORIAL
    ABLATION of flowai's components (attacks N4). Still owes a re-run critique at 0 FATAL
    before SRS.
  - **Human annex (NOT an automated A/B):** the holistic Direction-II states needing a live
    human — delayed mental-model assay (cognitive debt, N1 blind spot), appropriate-reliance
    matrix, NASA-TLX + SAGAT — as a small repeated-measures within-subject study (same humans
    both arms) to fight small-N. A separate, later instrument.
- **Open design Qs (refined):** coding-domain "seeded influence" for the injection test;
  whether flowai reports fall on the transparency-backfire side (now with a concrete
  handoff-safety score à la JAMA); factorial-ablation arm count vs small-N budget (N5 — may
  force cutting axes or lifting N on the automated side).
- **Round-3 decision — RESOLVED 2026-07-16 (user): O3, TIERED.** Measurement is a triage pyramid
  — cheapest VALID method wins; the human is the DECISIVE apex instrument, reserved for the
  irreducible residue no cheaper method can validly resolve, NOT the default everything is routed
  to (user 2026-07-16: "не основной, а главный"). The automated Direction-I bench (large
  post-cutoff pool) is the WORKHORSE that carries most measurement volume, not a mere guardrail;
  the T2/T3 automated proxies stay dropped. Triage rule (keeps "irreducible" from being an author
  knob): an axis reaches the human ONLY if a cheaper method is PROVABLY invalid on it — no oracle
  exists (ground truth is a human state), OR it was shown gameable / biased by construction (the
  three-round FATALs are the evidence), OR it is uncalibrated across reruns — and that
  failed-automation justification is pre-registered per axis before runs. Options considered (three
  FATAL rounds; mechanical FATALs spec-fixable, the T2/T3 validity holes the same structural pincer
  unbroken across all three):
  - **O1 (recommended) — decidable core, T2/T3 CUT.** Fix the mechanical FATALs; split T1 onto a
    large post-cutoff pool (decidable primary); CUT T2/T3 from the automated bench; ALL of
    Direction II → the human annex. Automated bench = Direction I at scale (solved + no-harm, cost
    excluded — confirmed NOT a pass@1 regression). Honest, buildable, lowest risk.
  - **O2 — one more pass to BREAK the T2/T3 pincer** (paired-counterfactual T2 + consequence-
    coupled-yet-leak-safe T3). Attacks exactly the wall 3 rounds died on; high fourth-FATAL risk.
  - **O3 — program-level STOP:** the automated A/B cannot carry flowai's value; make the human
    annex the PRIMARY instrument, keep a large-pool Direction-I bench only as a cheap guardrail.
  - **O4 — keep patching P-A whole (NOT recommended):** V-F1/2/3 are structural, not mechanical.
- **Axis → tier partition — CONFIRMED 2026-07-21 (user, option A).** The Tier-3 human residue is
  exactly four axes: faithful-report-beyond-disclosure, decision-ownership-appropriateness,
  cognitive debt, appropriate reliance; everything else is carried by Tiers 0–2. Most volume stays
  automated; the human sees only the provably-irreducible slice:
  - **Tier-0 oracles** (scale, no human): I.1 solved; I.2 regressions (durability); II.3
    process-reliability trace signals (variance, fabrication, guard-bypass).
  - **Tier-1/2 cheap objective + screen**: injection "relied-on" probe (objective half of T2);
    dup / dead-code / over-generalization static metrics (partial I.2 debt); an LLM pre-filter that
    ROUTES to the human, does NOT score.
  - **Tier-3 human residue** (sparingly, apex): faithful-report-beyond-disclosure + decision-
    ownership-APPROPRIATENESS → the comparative side-by-side harness below; cognitive debt +
    appropriate reliance + situational awareness → an operator-session sub-mode (person does the
    work with one arm, then a delayed probe). Both are residue-only, not run on every task.
- **Human instrument (O3, Tier-3 apex — runs only on the comparative residue): a blind,
  side-by-side, hint-guided COMPARATIVE review.** Ergonomic for the reviewer: two arm outputs shown A/B (arm
  identity BLINDED — skill names / phase headers stripped, panes randomized), staged reveal
  (cold judgment → task-ground-truth hint → objective oracle), pairwise forced-choice + confidence
  per axis, content (faithful / complete) scored SEPARATELY from form (legible / structured) so
  flowai's formatting cannot inflate the content verdict. GUARDRAIL on the "hints": they must be
  outcome-anchored (about the task's truth) + arm-symmetric + staged — NEVER method-anchored ("did
  it plan / test / report"), else the hint recreates the F3 rubric=spec bias and the
  research-confirmed transparency-backfire INSIDE the human. Fork (a) reviewer role — RESOLVED by
  the confirmed partition (2026-07-21): JUDGE + OPERATOR both exist — the residue includes
  cognitive debt / appropriate reliance, which REQUIRE the operator-session sub-mode (person works
  with one arm, delayed probe); the side-by-side judge covers the report/ownership axes. Fork (b)
  report presentation — default = preserved + content/form axes split (normalization kills
  structure bias but hides flowai's report-structure value); goes to the round-4 critic, not
  hand-picked.
- 0-FATAL gate for SRS promotion: round 5 returned ONE mechanical FATAL (silent variance drop) +
  MAJORs; the critic's minimal change set and the promotion-blocking MAJORs are applied in
  `## Final design v1` — verification of closure pending.
- Promote into SRS as `FR-BENCH-*` only after `## Final design v1` returns 0 FATAL on a re-run
  critique; the pilot tier enters as a separate track / NFR, never as evidence.
- "No long-term harm" (I.2) gains a concrete controlled-design lead: "Echoes of AI" (77% vs
  39% later-maintenance failure) — candidate for the durability axis.
