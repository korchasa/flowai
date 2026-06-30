# SWE-bench Verified — flowai (operator-driven, human-gate emulated) vs pure Claude Code (same harness)

- Date: 2026-06-30
- Harness: Claude Code + `sonnet` over ACP — both arms.
- Dataset: princeton-nlp/SWE-bench_Verified
- Pool: 12 baseline-failure instances (a stronger Claude Code config + the tools-Sonnet submission both failed them; arm64-buildable). High-confidence "pure Claude Code + Sonnet fails".
- Method: run our OWN baseline (Claude Code + Sonnet, no flowai) over the pool; run flowai (same harness + framework) over the baseline's actual failures. Signal = **baseline-fail → flowai-pass**.

## Pipeline this run

flowai arm = operator-driven plan → implement → review with the human gate emulated:

- **Operator plays the human on `/plan`.** Planner-only `/plan` (variants + recommendation, forbids source/test edits, stops), then a separate `/implement` authorizing the recommended variant, then `/review`. Baseline keeps the autonomy line.
- **AGENTS.md rendered from the real framework template** (`renderAgentsMd`); stack via the init `analyzeProject`.
- **Doc-system stubs seeded** (`installDocStubs`, NEW this run): tiny static `documents/requirements.md` + `documents/index.md` + `documents/tasks/`, stating plainly this is a flowai task with no formal FRs — added to stop the agent reading absent doc files as "roles unbound" (see breakdown #1 below).
- **Patch-capture hardened** (`captureDiff`): excludes agent-built `venv`/`build`/`__pycache__`/… at any depth + stray pip-redirect files. Verified on `pylint-4551` (was a 10 MB / 1047-file venv dump; now 3.7 KB / 2 source files).

## Result

- Baseline (pure Claude Code + Sonnet): resolved 1/13 (`django__django-13513`), failed 12. (unchanged arm.)
- flowai (gate + AGENTS.md + doc-stubs) on the 12 baseline-failures: **0 resolved**. 0 empty patches, 0 grading errors, all 12 patches applied cleanly.

Run-by-run, the resolved count has stayed in a 0–1/12 band regardless of process improvements:

- prose-prompt run (skills never fired): 1/12 — `django__django-14792`
- skills-active, autonomous (no gate): 1/12 — `django__django-16256`
- gate + coherent AGENTS.md: 0/12
- gate + AGENTS.md + doc-stubs (this run): 0/12

The process improved but resolution did not. Doc-stubs lifted plan-task-file creation to **5/12** (`12325`, `14792`, `16667`, `7462`, `16597`) from ~0 — but that is still not reliable, and a created task file did not translate into a correct fix.

## Why it still fails — three breakdowns (transcript read of 14792)

The hidden `FAIL_TO_PASS` targets `_get_timezone_name` in `django/utils/timezone.py`; the gold patch is the 4-line `return timezone.tzname(None) or str(timezone)`. The agent diagnoses this root cause correctly and even lists the gold fix as a variant — so the failure is NOT mis-localization. Three breakdowns, in order of how far they are from fixed:

1. **Doc-system bail — PARTIALLY FIXED.** Before doc-stubs, the agent saw `documents/requirements.md` / `index.md` absent, conflated "files absent" with "roles unbound", declared the repo "not a flowai project", and skipped the plan task file. Doc-stubs removed that misread for `14792` (and 4 others), but 7/12 still skip the task file — the bail is reduced, not eliminated.
2. **Variant mis-rank — OPEN (skill-level).** `/plan` lists "Variant 2: architecturally correct — fix `_get_timezone_name`" (= the gold location), returns to it four times calling it "simpler and safer", then talks itself out citing risk ("`_get_timezone_name` is used in templates") and recommends Variant 1 (the backend symptom fix). The risk is unfounded — the gold fix's `or str(timezone)` tail preserves the template behaviour. The emulated gate takes the recommendation → symptom fix → unresolved. In THIS batch `14792` went to `db/backends/postgresql/operations.py` (symptom); an isolated n=1 re-run (runs/2026-06-30-docstubs-14792) happened to pick the root and **resolved** — so the variant choice is the live nondeterministic bottleneck.
3. **False green at review — OPEN (skill-level).** The agent never runs the canonical `utils_tests.test_timezone`; it writes self-authored tests for `_prepare_tzname_delta` asserting its own (wrong) expectation, and `/review` returns "Approve" against them.

### Per-instance (pool, cheapest-first)

| Instance | Difficulty | baseline | flowai (gate+AGENTS+stubs) | plan task file |
| --- | --- | :-: | :-: | :-: |
| `django__django-14792` | <15 min fix | ❌ | ❌ | ✓ |
| `django__django-11820` | <15 min fix | ❌ | ❌ | ✗ |
| `sphinx-doc__sphinx-7462` | <15 min fix | ❌ | ❌ | ✓ |
| `sympy__sympy-20428` | 15 min - 1 hour | ❌ | ❌ | ✗ |
| `django__django-16667` | 15 min - 1 hour | ❌ | ❌ | ✓ |
| `django__django-13195` | 15 min - 1 hour | ❌ | ❌ | ✗ |
| `django__django-13513` | 15 min - 1 hour | ✅ | — | — |
| `django__django-16256` | 15 min - 1 hour | ❌ | ❌ | ✗ |
| `sphinx-doc__sphinx-7748` | 15 min - 1 hour | ❌ | ❌ | ✗ |
| `django__django-12325` | 1-4 hours | ❌ | ❌ | ✓ |
| `pylint-dev__pylint-4551` | 1-4 hours | ❌ | ❌ | ✗ |
| `django__django-16263` | 1-4 hours | ❌ | ❌ | ✗ |
| `sympy__sympy-16597` | 1-4 hours | ❌ | ❌ | ✓ |

### flowai wins over pure Claude Code + Sonnet

- None this run.

## Next levers (skill-level, not benchmark plumbing)

- **#2 plan recommendation quality.** The plan skill should rank "fixes the named root cause / matches the issue's own description" above "smallest diff", and not down-rank a root fix on speculative risk without checking the callers. This is the highest-value open lever — it is what a real human on the gate would catch.
- **#3 review/implement must run the repo's EXISTING tests** for the changed area, not only self-authored ones — kills the false-green pattern.
- **#1 strengthen the doc-system framing** further (or seed more of the role files) to push task-file creation past 5/12.

## Caveats

- Same-harness A/B: both arms are Claude Code + Sonnet over ACP, so a win would isolate flowai's contribution (not a scaffold or model difference).
- flowai is run only on baseline-failures; the table shows "—" where the baseline already passed. All 12 flowai-attempted instances are baseline-failures by construction, so every flowai resolve would be a win.
- **Single-rep.** One attempt per instance; the 0–1/12 band carries run-to-run noise. But the `14792` transcript shows the bottleneck is the breakdown chain above (variant mis-rank → false-green review), NOT localization.
- This measures flowai's autonomous workflow with an *emulated* human gate (the operator authorizes the recommended variant), NOT a real human exercising judgment on the variants — which is flowai's actual value proposition, and exactly what breakdown #2 removes.
- All SWE-bench Verified repos are Python.
