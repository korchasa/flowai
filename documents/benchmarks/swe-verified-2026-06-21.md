# SWE-bench Verified — flowai vs pure Claude Code (same harness)

- Date: 2026-06-21
- Harness: Claude Code + `sonnet` over ACP — both arms.
- Dataset: princeton-nlp/SWE-bench_Verified
- Pool: 14 instances both a stronger Claude Code config (`claude-opus-4-5-20251101` + vexp) AND the tools-Sonnet submission failed (arm64-buildable). High-confidence "pure Claude Code + Sonnet fails".
- Method: run our OWN baseline (Claude Code + Sonnet, no flowai) over the pool; run flowai (same harness + framework) over the baseline's actual failures. The signal is **baseline-fail → flowai-pass**.

## Result

- Baseline (pure Claude Code + Sonnet): resolved 1/14, failed 13.
- flowai on the 13 baseline-failures (12 attempted): **1 resolved** — instances pure Claude Code + Sonnet could not solve but flowai could.

### Per-instance (pool, cheapest-first)

| Instance | Difficulty | baseline | flowai |
| --- | --- | :-: | :-: |
| `django__django-14792` | <15 min fix | ❌ | ✅ |
| `django__django-11820` | <15 min fix | ❌ | ❌ |
| `sphinx-doc__sphinx-7462` | <15 min fix | ❌ | ❌ |
| `sympy__sympy-20428` | 15 min - 1 hour | ❌ | ❌ |
| `django__django-16667` | 15 min - 1 hour | ❌ | ❌ |
| `django__django-13195` | 15 min - 1 hour | ❌ | ❌ |
| `django__django-13513` | 15 min - 1 hour | ✅ | — |
| `django__django-16256` | 15 min - 1 hour | ❌ | ❌ |
| `sphinx-doc__sphinx-7748` | 15 min - 1 hour | ❌ | ❌ |
| `django__django-12325` | 1-4 hours | ❌ | ❌ |
| `pylint-dev__pylint-4551` | 1-4 hours | ❌ | ❌ |
| `django__django-16263` | 1-4 hours | ❌ | ❌ |
| `sympy__sympy-16597` | 1-4 hours | ❌ | ❌ |
| `pydata__xarray-6992` | >4 hours | ❌ | — |

### flowai wins over pure Claude Code + Sonnet

- `django__django-14792`

## Caveats

- Same-harness A/B: both arms are Claude Code + Sonnet over ACP, so a win isolates flowai's contribution (not a scaffold or model difference).
- flowai is run only on baseline-failures, so the table shows "—" for flowai where the baseline already passed (no regression data there).
- Single-rep, autonomous: the agent self-selects plan variants, so this measures flowai's autonomous workflow scaffolding, NOT its human-in-the-loop decision-gate value.
- The pool was seeded from a stronger Claude Code config's failures to be efficient; the baseline column is our own measurement, not that seed.
- All SWE-bench Verified repos are Python.
