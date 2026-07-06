# Measured baseline & ceiling — OUR scaffold (2026-07-05, FROZEN)

Purpose: replace the third-party published-submission proxy with a baseline and
ceiling measured on OUR OWN scaffold (pure Claude Code, single autonomous turn,
no flowai). Frozen data of record: `scripts/benchmark/measured_baseline.json`.
Not to be re-run (per the "baseline is never re-run" principle) unless the
harness itself changes.

## Why this exists

The pool was selected as `published tools_claude-4-sonnet FAILED ∩ published
tools_claude-4-opus SOLVED`. But our OWN single-turn Claude Code + Sonnet solved
many of those "sonnet-fails" instances. Root cause: **model capability is
scaffold-dependent.** The published `tools` submission is a different agent
(SWE-agent-style loop); its failures do not predict our Claude Code's failures.
A third-party submission is a weak proxy for our own arm — so we measure our own.

## Method

- **Baseline** = pure Claude Code + Sonnet, single autonomous turn, **3 reps**
  (run-ids `newpool`, `newpool-s2`, `newpool-s3`). 3 reps because single-turn is
  stochastic — resolution becomes a frequency (0/3…3/3), not a coin-flip label.
- **Ceiling** = pure Claude Code + Opus, single turn, **1 rep** (`newpool-opus`).
- Both arms isolated per instance (fresh `base_commit` clone, distinct sandbox
  roots). All 4 passes verified clean: 20/20 non-empty patches, 0 auth failures,
  0 health-aborts. Graded via official swebench in Docker.

## Measured numbers (20-instance pool)

- **Our Sonnet, per rep:** 8 / 14 / 12 resolved (mean ≈ 11.3). The 8→14 spread is
  the stochasticity the 3-rep design was built to capture.
- **Our Opus ceiling:** 15/20 resolved.

Per-instance resolution frequency (Sonnet reps → Opus):

- **Sonnet ALWAYS (3/3):** 7 — `sympy-17139`, `django-15987`, `django-11790`,
  `django-11206`, `sphinx-8265`, `sphinx-8056`, `django-11728`.
- **Sonnet FLAKY (1–2/3):** 8 — `requests-1921`(2), `requests-2317`(1),
  `django-14404`(2), `sympy-23950`(2), `sympy-21612`(1), `django-15695`(1),
  `xarray-4687`(2), `django-15957`(2).
- **Sonnet NEVER (0/3) & Opus SOLVES = clean headroom:** 1 — `django-14376`.
- **Sonnet NEVER (0/3) & Opus FAILS = no ceiling:** 4 — `django-12308`,
  `django-11141`, `django-14725`, `django-11532`.

## The finding

**The pool has almost no clean headroom for our scaffold.** Only 1 of 20 is a
strict "our-Sonnet-can't, our-Opus-can" case. 7 our Sonnet already solves
reliably (flowai cannot win there); 4 are beyond even our Opus (no ceiling); 8
are flaky (Sonnet sometimes solves). This confirms the concern that drove the
measurement: a pool chosen against a published submission is mismatched to our
own scaffold's actual capability frontier.

## Consequence for the flowai A/B

The honest headroom set for measuring flowai's process value on THIS pool is the
9 instances where our Sonnet is NOT already reliable (8 flaky + 1 clean
headroom) — flowai's job is to lift flaky/never-solved Sonnet toward reliable
success. The 7 always-solved and 4 no-ceiling instances measure nothing.
Pool re-selection is a separate decision (recorded as pending).

## Caveats

- Baseline 3 reps, ceiling 1 rep — the ceiling itself is single-rep and stochastic.
- Same-harness, same-scaffold; Python-only hard pool; arm64-buildable subset.
