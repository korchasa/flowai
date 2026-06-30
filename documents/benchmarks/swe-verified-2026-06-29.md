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

The gate + AGENTS.md fixed *part* of the process — the agent surfaces variants instead of coding mid-plan — but a transcript read of `14792` (see below) shows it still skipped the plan task file and, worse, mis-ranked the fix variants. Across three single-rep runs the resolved count sits at 0–1/12:

- prose-prompt run (skills never fired): 1/12 — `django__django-14792`
- skills-active, autonomous (no gate): 1/12 — `django__django-16256`
- gate + coherent AGENTS.md (this run): 0/12

A follow-up doc-stub fix (committed after this run) flips `14792` back to resolved — see "Follow-up fix" below.

### Why 14792 failed (transcript read — NOT a localization miss)

The hidden `FAIL_TO_PASS` targets `_get_timezone_name` in `django/utils/timezone.py`; the gold patch is the 4-line `return timezone.tzname(None) or str(timezone)`. The agent's ACP transcript shows the failure was NOT mis-localization — the agent diagnosed the root cause correctly and even listed the gold fix as a variant. Three distinct breakdowns instead:

1. **Skipped the plan task file.** Despite the rendered AGENTS.md ("this IS a flowai-managed sandbox… roles ACTIVE… record the plan as a task file"), the agent saw `documents/requirements.md` and `documents/index.md` absent on disk, conflated "files absent" with "roles unbound", declared the repo "not a flowai project" (transcript MSG 5), and presented variants in chat only. No `documents/` task file was written.
2. **Mis-ranked the fix variants.** `/plan` listed "Variant 2: architecturally correct — fix `_get_timezone_name`" (= the gold location) and returned to it four times (MSG 15, 16, 20, 21) calling it "simpler and safer", but each time talked itself out citing risk ("changing `_get_timezone_name` is risky — it's used in templates") and recommended Variant 1 (the backend symptom fix). The risk was unfounded: the gold fix's `or str(timezone)` tail preserves exactly the template behaviour it feared breaking. The emulated gate then took the recommendation ("go with your recommended variant") → symptom fix → `resolved=False`.
3. **False green at review.** The agent never ran the canonical `utils_tests.test_timezone`; it wrote 6 self-authored tests for `_prepare_tzname_delta` asserting its own (wrong) expectation, and `/review` returned "Approve" against them.

An isolated n=1 smoke of the same pipeline (runs/2026-06-29-docsys-smoke) happened to fix `django/utils/timezone.py` and resolve — so single-attempt variance is real, but on `14792` the decisive factor was the doc-system bail (1) feeding the variant mis-rank (2), not localization.

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

## Follow-up fix (after this run)

The breakdown #1 above (doc-system bail) was fixed by seeding tiny static SRS +
index stubs into the flowai sandbox (`installDocStubs`, commit `8db3af43`) so the
agent stops reading absent doc files as "roles unbound". Verified on `14792`
(runs/2026-06-30-docstubs-14792, n=1): the agent now writes
`documents/tasks/2026/06/fix-reverse-tz-conversion.md`, fixes the ROOT cause in
`django/utils/timezone.py` byte-identical to the gold patch, touches the
canonical `utils_tests.test_timezone`, and the instance **RESOLVES** (1/1). A
full 12-instance re-run with this fix is the next measurement (a fresh report
will supersede this one); breakdowns #2 (variant mis-rank) and #3 (false green)
remain open and are skill-level changes.

## Caveats

- Same-harness A/B: both arms are Claude Code + Sonnet over ACP, so a win would isolate flowai's contribution (not a scaffold or model difference).
- flowai is run only on baseline-failures, so the table shows "—" where the baseline already passed. All 12 flowai-attempted instances are baseline-failures by construction, so every flowai resolve would be a win.
- **Single-rep.** One attempt per instance; with LLM nondeterminism the 0–1/12 band is run-to-run noise. The headline is that flowai's *autonomous* arm did not lift resolution on this high-confidence-failure pool in this run — but the `14792` read shows the bottleneck is NOT localization. It is the chain doc-system bail → variant mis-rank → false-green review. The doc-system bail is now fixed (see Follow-up fix); the other two are open.
- This measures flowai's autonomous workflow with an *emulated* human gate (the operator authorizes the recommended variant), NOT a real human exercising judgment on the variants — which is flowai's actual value proposition.
- Follow-up (separate skill change): `review`/`implement` should run the repo's EXISTING tests for the changed area, not only self-authored ones — guards the false-green pattern (14792 wrote passing tests for its wrong fix).
- All SWE-bench Verified repos are Python.
