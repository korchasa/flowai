# flowai A/B on the measured-headroom pool — 3 reps (2026-07-11)

First proper flowai A/B over the measured-headroom pool (13 instances at run
time; 3 reps each so resolution is a 0/3..3/3 frequency comparable to the frozen
Sonnet baseline). Run dir: `scripts/benchmark/runs/2026-07-11-flowai3/`
(grading: `logs/run_evaluation/flowai3-r{1,2,3}/`).

- **Arm** = flowai (full workflow: plan → implement → review), Sonnet, our harness.
- **Baseline** = frozen Sonnet reps from `measured_headroom.json` (measured
  2026-07-05..07, NOT re-run — "baseline is never re-run" unless the harness changes).
- Same-harness A/B, single scaffold, Python-only pool. Single 3-rep sample —
  report **mechanisms**, not statistics.

## Headline

- Baseline Sonnet **11/39** resolved-reps → flowai **16/39** (+5 reps).
- Excluding `requests-2317` (infra noise, dropped from the pool — see below):
  Sonnet **10/36** → flowai **16/36**; net **+6**, **1** real regression.
- Split: 5 improvements, 2 regressions (1 real + 1 noise), 6 unchanged.

## Per-instance (sonnet reps → flowai reps, of 3)

- `pytest-7205` — 1 → **3** — clean WIN (+2)
- `django-11477` — 1 → **3** — clean WIN (+2)
- `django-14792` — 1 → 2 — improved (+1)
- `sphinx-10435` — 1 → 2 — improved (+1)
- `sphinx-8638` — 1 → 2 — improved (+1)
- `sympy-15017` — 1 → 1 — unchanged
- `sympy-21612` — 1 → 1 — unchanged
- `django-15695` — 1 → 1 — unchanged
- `django-16454` — 1 → 1 — unchanged
- `pylint-4970` — 0 → 0 — unchanged
- `django-14376` — 0 → 0 — unchanged
- `django-15098` — 1 → **0** — REAL regression (over-generalization)
- `requests-2317` — 1 → **0** — noise regression (infra 503s), dropped from pool

## Root-cause clusters (10 real failures; `requests-2317` excluded as noise)

Read-only sub-agents per Phase 3. Phase split: **plan 7, implement 3, review
interceptions 0**. Full mode definitions in
`.claude/skills/improve-primitive-from-benchmark/references/failure-taxonomy.md`.

### A. Plan diagnosis / scope (7 — dominant)

- **WRONG_DIAGNOSIS ×3 (stochastic)** — the failing rep fixed a plausible-but-wrong
  site; a sibling rep hit the right one:
  - `sympy-21612` — LaTeX parser instead of the string printer.
  - `sphinx-8638` — cross-reference resolver instead of the field definition.
  - `django-15695` — revived `database_backwards` instead of guarding
    `database_forwards` (broke `assertNumQueries(0)`).
- **SCOPE_NARROWED ×1** — `django-14376`: the plan named `client.py` (where all 3
  F2P tests live), then dismissed it as out of scope. surface-scout returned a
  degraded "no structured findings" — no counter-pressure exactly where it was needed.
- **VARIANT_MISRANK ×1** — `django-14792`: root cause named (`_get_timezone_name`),
  symptom variant selected across three backends despite the "fix the root" rule.
- **INCOMPLETE_FIX-narrow ×1** — `pylint-4970`: read "disable" as "report 0
  duplicates" instead of "print nothing"; guard placed after `_display_sims`;
  self-authored RED test froze the wrong reading (asserts `duplicates=0`, gold
  asserts empty output).
- **OVER_GENERALIZATION ×1 (NEW)** — `django-15098`: relaxed the language-prefix
  regex `([@-]\w+)?` → `([@-]\w+)*` (deterministic across all 3 reps). `*` is a
  strict superset of gold's `([@-]\w+){0,2}`, so every positive case passes — it
  fails only on the NEGATIVE cases shipped in the same F2P test
  (`test_get_language_from_path_real`): `/de-simple-page-test/ → None` and a
  501-char path `→ None`, both of which `*` wrongly matches as a language code.
  The bound `{0,2}` is legitimate (BCP-47: at most script + region) but is NOT
  derivable from the issue prose — the issue shows only positive cases; the spec
  lives in the test's negative space. Root: the matcher was widened without
  probing what must STILL be rejected. Counterpart of INCOMPLETE_FIX — too WIDE,
  not too narrow.

### B. Implement fidelity (3)

Plan adequate; execution deviated.

- `sphinx-10435` — dropped 1 of 3 coordinated edits (`[:-14]` kept vs gold `[:-15]`).
- `sympy-15017` — added an unrequested `if self._rank == 0: raise` guard reversing
  gold behavior.
- `django-16454` — **REGRESSION_IN_EXISTING (NEW)**: over-broad fix dropped gold's
  `if issubclass(parser_class, CommandParser)` guard; F2P passed but PASS_TO_PASS
  `test_subparser_non_django_error_formatting` regressed → `resolved: false`. The
  P2P set is neither run nor visible in the sandbox, so in-sandbox self-review
  cannot see it.

### C. Review intercepted 0 of 10

Same structural signature as every prior investigation: no independent oracle —
patch and self-approval both derive from the agent's own reading of the issue.

## Two new levers for the next improve-primitive iteration

1. **Probe the negative space when widening.** Failures are usually too narrow
   (INCOMPLETE_FIX); `django-15098` is the opposite (too wide). The lever is NOT
   "trace invariants to the ticket" — it is: when relaxing/widening a matcher or
   removing a constraint, enumerate what must STILL be rejected and verify against
   it. The correct bound often lives in domain knowledge (BCP-47 tag structure),
   not the issue prose. Domain-neutral: infra — "opened the firewall rule wider,
   what must stay blocked?"; non-IT — "loosened the eligibility rule, who must
   stay excluded?".
2. **Stochastic plan diagnosis** drives the flaky partials (WRONG_DIAGNOSIS /
   VARIANT_MISRANK): site selection varies rep-to-rep. A diagnosis-confidence /
   verification step would stabilize cluster A.

## `requests-2317` — dropped as infra noise (not a primitive signal)

- flowai's code fix (`to_native_string(method)`) **equals gold**. The 0/3 comes
  from the local httpbin returning intermittent 503s; it grades non-deterministically
  for everyone (baseline also 1/3). Removed from `pool.json` (precedent:
  `django-16263`); the measurement stays in `measured_headroom.json` with an
  `excluded_from_pool` note.
- **Harness defect it exposed (measurement validity):** the flowai sandbox ran the
  F2P suite under **host Python 3.14**, where `from collections import Mapping`
  raises `ImportError` (removed in 3.10+, present in the 3.9 eval env). The agent
  chased that phantom error into `collections.abc` scope creep across 6 files. The
  sandbox test-runner interpreter must match the instance's eval Python; otherwise
  version-drift errors masquerade as task failures.

## Caveats

- Single 3-rep sample; same-harness A/B; emulated human gate; Python-only pool.
- Frozen baseline reused, not re-run (harness unchanged since 2026-07-05).
- No fix applied in this pass — this is the root-cause/clustering deliverable.
  Fixes (OVER_GENERALIZATION fidelity check, stochastic-diagnosis stabilization)
  are candidates for the next improve-primitive loop, not committed here.
