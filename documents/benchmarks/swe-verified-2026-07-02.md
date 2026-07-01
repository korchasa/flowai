# SWE-bench Verified — flowai vs pure Claude Code (same-run A/B, both arms fresh)

- Date: 2026-07-02
- Harness: Claude Code + `sonnet` over ACP — both arms.
- Dataset: princeton-nlp/SWE-bench_Verified
- Pool: the full 13-instance pool (`scripts/benchmark/pool.json`).
- Method: BOTH arms run fresh in the SAME session — baseline (no flowai) and flowai (framework + operator-driven plan → implement → review) over all 13 instances. Unlike prior reports, the baseline column is NOT reused from an older run; it is measured on the same day, same harness.

## Pipeline this run

flowai arm carries every fix accumulated to date:

- Operator-emulated human gate (`/plan` planner-only → `/implement` authorizes the recommended variant → `/review`).
- AGENTS.md rendered from the framework template + doc-system stubs seeded (`installDocStubs`).
- **Plan recommendation ranks root-cause fidelity above diff size** (`framework/atoms/plan.md`, commit `cac00793`) — the fix for breakdown #2.
- **Review runs the repo's EXISTING tests for the changed symbols (incl. caller tests) and refuses Approve on self-authored tests alone** (`framework/atoms/review.md`, commit `1b101164`) — the fix for breakdown #3.
- `captureDiff` excludes agent-built venv/build artifacts.

## Result

- Baseline (pure Claude Code + Sonnet): **0/13 resolved** this run.
- flowai (full pipeline): **1/13 resolved** — `django__django-14792`. 0 grading errors.

**First same-run A/B where flowai beats baseline** (1 vs 0). The win is exactly the instance the plan-ranking + review-existing-suite fixes targeted.

Run-by-run trajectory (all single-rep on this hard pool):

- prose-prompt (skills never fired): flowai 1/12 — `16256`
- skills-active, autonomous (no gate): flowai 1/12 — `16256`
- gate + AGENTS.md: flowai 0/12
- gate + AGENTS.md + doc-stubs: flowai 0/12
- gate + AGENTS.md + doc-stubs + plan-ranking + review-existing-suite (this run): flowai 1/13, baseline 0/13

### The win — django__django-14792 (breakdowns #2 + #3 closed)

Every prior run mis-handled this instance (symptom fix in `db/backends/*/operations.py`, false-green review). This run, with the two skill fixes:

- **Plan task file created** (`documents/tasks/2026/07/fix-reverse-tz-conversion.md`).
- **Root-cause variant chosen** — the fix landed in `django/utils/timezone.py` (`_get_timezone_name`), byte-identical to the gold patch `return timezone.tzname(None) or str(timezone)`, and touched the canonical `tests/utils_tests/test_timezone.py`.
- **Resolved.** The plan-ranking fix stopped the agent down-ranking the root fix; the review-existing-suite gate removed the false-green escape hatch.

### Per-instance (pool, cheapest-first)

| Instance | Difficulty | baseline | flowai | plan task file |
| --- | --- | :-: | :-: | :-: |
| `django__django-14792` | <15 min fix | ❌ | ✅ | ✓ |
| `django__django-11820` | <15 min fix | ❌ | ❌ | ✗ |
| `sphinx-doc__sphinx-7462` | <15 min fix | ❌ | ❌ | ✓ |
| `sympy__sympy-20428` | 15 min - 1 hour | ❌ | ❌ | ✗ |
| `django__django-16667` | 15 min - 1 hour | ❌ | ❌ | ✓ |
| `django__django-13195` | 15 min - 1 hour | ❌ | ❌ | ✓ |
| `django__django-13513` | 15 min - 1 hour | — | — | ✗ |
| `django__django-16256` | 15 min - 1 hour | ❌ | ❌ | ✗ |
| `sphinx-doc__sphinx-7748` | 15 min - 1 hour | ❌ | ❌ | ✗ |
| `django__django-12325` | 1-4 hours | ❌ | ❌ | ✓ |
| `pylint-dev__pylint-4551` | 1-4 hours | ❌ | ❌ | ✗ |
| `django__django-16263` | 1-4 hours | ❌ | ❌ | ✗ |
| `sympy__sympy-16597` | 1-4 hours | ❌ | ❌ | ✗ |

`django__django-13513` (`—`): both arms produced an EMPTY patch this run, so swebench graded neither (12/13 graded per arm). In earlier reports the baseline column showed `13513 = ✅`, but that was a REUSED 2026-06-21 measurement; the fresh same-day baseline did not reproduce it (single-rep variance). Net: baseline 0, flowai 1 either way.

### flowai wins over pure Claude Code + Sonnet

- `django__django-14792`

## Reading the result

- The two skill fixes did what they were designed to do on their target instance and produced the first clean same-run win. That is a real, if small, signal on a high-confidence-failure pool.
- It is still 1/13 single-rep — not a statistical claim. The other 12 remain unresolved, and task-file creation is 5/13 (doc-system bail still fires for ~half). The pool is deliberately hard (all baseline-failures except the one empty-patch case).
- The honest headline: flowai now beats an identically-harnessed baseline on this pool (1 vs 0), driven by the plan-ranking + review-existing-suite fixes closing the exact breakdown chain the 14792 transcript exposed.

## Caveats

- Same-harness A/B: both arms Claude Code + Sonnet over ACP, so the win isolates flowai's contribution.
- **Both arms fresh this run** — the baseline is a same-day measurement, not reused.
- **Single-rep.** One attempt per instance; 0–1/13 carries run-to-run noise. The value is the mechanism (14792 now goes root + resolves), not the count.
- Emulated human gate: the operator authorizes the recommended variant. The plan-ranking fix improves what gets recommended, but a real human on the gate remains flowai's actual value proposition.
- Remaining lever: push task-file creation past 5/13 (breakdown #1, doc-system bail, still nondeterministic).
- All SWE-bench Verified repos are Python.
