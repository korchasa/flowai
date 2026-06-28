# SWE-bench Verified — flowai (operator-driven, human-gate emulated) vs pure Claude Code (same harness)

- Date: 2026-06-29
- Harness: Claude Code + `sonnet` over ACP — both arms.
- Dataset: princeton-nlp/SWE-bench_Verified
- Pool: 12 baseline-failure instances (a stronger Claude Code config + the tools-Sonnet submission both failed them; arm64-buildable). High-confidence "pure Claude Code + Sonnet fails".
- Method: run our OWN baseline (Claude Code + Sonnet, no flowai) over the pool; run flowai (same harness + framework) over the baseline's actual failures. Signal = **baseline-fail → flowai-pass**.

## What changed since 2026-06-28

The flowai arm now emulates the human decision gate and ships a coherent project doc:

- **Operator plays the human on the `/plan` gate.** The autonomous "never stop, decide yourself" line nullified the plan skill's gate (rule 1 NO IMPLEMENTATION; step 4 present variants + wait). The operator now issues a planner-only `/plan` (variants + recommendation, forbids source/test edits, stops), then a separate `/implement` authorizing the recommended variant, then `/review`. Baseline keeps the autonomy line. (see `documents/tasks/2026/06/plan-skill-autonomous-decision-gate.md`)
- **AGENTS.md rendered from the real framework template.** The prior crude render blanked every section, so the agent treated the repo as non-flowai and skipped the task file. Now `renderAgentsMd` fills `framework/core/assets/AGENTS.template.md` with benchmark values (no blanks; stack via the init `analyzeProject`) and the `documents/tasks/` doc-system is seeded on disk.
- **Patch-capture hardened.** `captureDiff` now excludes agent-created environments/build artifacts (`venv`, `build`, `__pycache__`, `.tox`, …) at any depth, and stray pip-redirect files (`=2.6.0,`). Caught on `pylint-4551`, whose patch was a 10 MB / 1047-file `venv/` dump (real fix: 9.7 KB / 5 source files).

## Result

- Baseline (pure Claude Code + Sonnet): resolved 1/13 (`django__django-13513`), failed 12. (unchanged arm.)
- flowai (operator-driven, human-gate emulated, coherent AGENTS.md) on the 12 baseline-failures: **0 resolved**. 0 empty patches, 0 grading errors, all 12 patches applied cleanly.

The gate + AGENTS.md fixed the *process* — the agent now creates the plan task file and surfaces variants instead of coding mid-plan — but did NOT make root-cause localization reliable. Across three single-rep runs the resolved count sits at 0–1/12 and the win (when present) wanders between instances:

- prose-prompt run (skills never fired): 1/12 — `django__django-14792`
- skills-active, autonomous (no gate): 1/12 — `django__django-16256`
- gate + coherent AGENTS.md (this run): 0/12

### Localization variance (the dominant factor)

`django__django-14792` is the clearest case. The hidden `FAIL_TO_PASS` targets `_get_timezone_name` in `django/utils/timezone.py`.

- This run (batch): the agent localized to `django/db/backends/{mysql,oracle,postgresql}/operations.py` — a downstream symptom, the original failure mode. `resolved=False`.
- An isolated n=1 smoke of the SAME pipeline (runs/2026-06-29-docsys-smoke): localized to `django/utils/timezone.py` (the root cause) → `resolved=True`.

Same prompts, same skills, opposite localization. With one attempt per instance, LLM nondeterminism in choosing the root cause dominates the outcome on this hard pool.

### Per-instance (pool, cheapest-first)

| Instance | Difficulty | baseline | flowai (gate + AGENTS.md) |
| --- | --- | :-: | :-: |
| `django__django-14792` | <15 min fix | ❌ | ❌ |
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

### flowai wins over pure Claude Code + Sonnet

- None this run.

## Caveats

- Same-harness A/B: both arms are Claude Code + Sonnet over ACP, so a win would isolate flowai's contribution (not a scaffold or model difference).
- flowai is run only on baseline-failures, so the table shows "—" where the baseline already passed. All 12 flowai-attempted instances are baseline-failures by construction, so every flowai resolve would be a win.
- **Single-rep.** One attempt per instance; with LLM nondeterminism the 0–1/12 band is run-to-run noise. The stable signal is the headline: flowai's *autonomous* arm does not reliably lift resolution on this high-confidence-failure pool — the bottleneck is root-cause localization, not workflow mechanics.
- This measures flowai's autonomous workflow with an *emulated* human gate (the operator authorizes the recommended variant), NOT a real human exercising judgment on the variants — which is flowai's actual value proposition.
- Follow-up (separate skill change): `review`/`implement` should run the repo's EXISTING tests for the changed area, not only self-authored ones — guards the false-green pattern (14792 wrote passing tests for its wrong fix).
- All SWE-bench Verified repos are Python.
