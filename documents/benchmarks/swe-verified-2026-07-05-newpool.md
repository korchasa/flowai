# SWE-bench Verified A/B — headroom pool, first signal (2026-07-05, run-id `newpool`)

First A/B on the **rebuilt headroom pool** (`sonnet-fails ∩ opus-solves`, 20 short
instances — commit `0820cbbc`). Both arms run Sonnet; the only variable is the
flowai process (loop5 pipeline: surface-scout + plan-critic + judged gate +
external sandboxes). Unlike every prior run on the retired zero-headroom pool,
this one produces a **non-noise signal**.

## Verdicts

- **baseline** (single-shot Sonnet, one neutral turn): **8/20**
- **flowai** (Sonnet + plan/implement/review): **11/20**
- **Wins** (baseline-fail → flowai-pass): **4** — `django-14404`, `sympy-23950`,
  `django-15695`, `pydata/xarray-4687`
- **Regression** (baseline-pass → flowai-fail): **1** — `sphinx-8056`
- **Net: +4 −1 = +3**

Per-instance (base → flowai):

- both PASS (5): `sympy-17139`, `django-15987`, `django-11790`, `django-11206`,
  `sphinx-8265`, `django-11728`, `django-15957` — process neither helped nor hurt.
- both FAIL (7): `requests-1921`, `django-12308`, `requests-2317`, `django-14376`,
  `sympy-21612`, `django-11141`, `django-14725` — headroom exists (Opus solved
  them) but neither our baseline nor flowai-on-Sonnet reached it.
- WIN (4): `django-14404`, `sympy-23950`, `django-15695`, `pydata/xarray-4687`.
- REGRESSION (1): `sphinx-8056`.

## Mechanisms (not statistics)

1. **Clearest process value — two empty-baseline wins.** On `django-14404` and
   `sympy-23950` the single-shot baseline produced NO patch at all (gave up in one
   turn); flowai produced resolving patches (1948 / 2112 bytes). The structured
   plan→implement→review forced the work to happen where a single turn produced
   nothing. This is the mechanism the framework exists for.
2. **The regression is real and worth naming: process over-reach.** `sphinx-8056`
   baseline landed a small correct fix (1338 bytes, F2P 1/1). flowai produced a
   5×-larger patch (6736 bytes) that FAILED the same gold test
   (`test_ext_napoleon_docstring.py::…test_multiple_parameters`, F2P 0/1). Bigger,
   wronger. The process talked itself into a broader change that broke the target
   behavior a single turn got right — a genuine "process can hurt" case, not noise
   to bury. Candidate for a future improve-primitive loop (over-engineering guard
   / minimal-diff discipline in implement or review).
3. **Two more wins** (`django-15695`, `xarray-4687`) are baseline-nonempty-but-wrong
   → flowai-correct: the extra passes fixed an incomplete first attempt.

## Key caveat — the baseline is stronger than the pool label implies

Our single-shot Sonnet resolved 8/20 instances the PUBLISHED `tools_claude-4-sonnet`
submission failed. The "sonnet-fails" label is **submission-specific**, not a
universal Sonnet incapacity: a different Sonnet harness (our one neutral turn) can
solve some of them. This does not invalidate the A/B — both arms are our own
Sonnet, so the +3 is a clean same-harness process delta on this pool — but it means
the pool is easier for our baseline than "published-Sonnet-failed" suggests. The
7 both-FAIL instances are where the real remaining headroom sits (Opus solved them,
we did not).

## Standing caveats

- **Single rep; stochastic judged gate.** The +3 and the −1 each carry run-to-run
  variance; treat as direction, not magnitude.
- **First UNSEEN-pool evidence for the loop5 primitives.** The surface-scout /
  plan-critic change was derived from the OLD pool (4551/7462/11820); none of these
  20 instances informed it. So this is the first non-trained-on-test sample — and
  it shows a +3 process lift with one over-reach regression.
- Python-only hard pool; emulated (LLM-judged) human gate; same-harness A/B.

## Trajectory

Retired zero-headroom pool: 0 / 2 / 1 / 1 / 0 resolved (all noise floor, both arms
near zero). Headroom pool, run 1: baseline 8, flowai 11 (+3). The pool rebuild is
what made the process effect measurable at all.
