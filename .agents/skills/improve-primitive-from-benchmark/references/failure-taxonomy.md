# Failure Taxonomy (flowai SWE-bench sessions)

Classification for Phase 3. Modes are derived from the 2026-06/07 investigations (11 failed sessions analyzed); extend the list when a session fits nothing — do not force-fit.

For each instance record: `instance — phase — mode — one-line evidence (transcript quote or patch diff fact)`.

## Modes

- **INCOMPLETE_FIX** — right file/site located, but the implemented contract is narrower or different than what the issue requires. Dominant mode (9/11 in the 2026-07 investigation). Evidence markers: model_patch touches the same file as gold but misses branches/second files/output literals. Examples: `django-11820` (missed the `else: _cls = None` branch), `sphinx-7462` (fixed one of two duplicated `unparse` implementations, missed `pycode/ast.py`), `django-16667` (wrong output literal — gold requires `"0-0-0"`), `pylint-4551` (no `Optional[...]` wrapping for `=None` defaults), `sphinx-7748` (missed the trailing `\` multi-signature convention), `django-12325` (left the old `raise ImproperlyConfigured` in `options.py`).
- **SCOPE_NARROWED** — sub-mode of INCOMPLETE_FIX where the agent SAW the wider requirement and consciously dismissed it as "out of scope of the ticket". Examples: `django-13195` (chose the "don't touch callers" variant; missed 2 callers + the secure branch), `django-16256` (review found the missing async wrappers and dismissed them). Distinct because the lever is scope discipline, not analysis depth.
- **VARIANT_MISRANK** — plan surfaced a root-cause variant but recommended the symptom patch (smaller diff / speculative risk). Example: `django-13195`. Partially addressed by the plan ranking rule (`cac00793`).
- **WRONG_DIAGNOSIS** — fixed a plausible but wrong site entirely. Example: `sympy-20428` (patched densetools instead of `EX.__bool__`).
- **FALSE_GREEN_REVIEW** — review approved on self-authored tests that encode the agent's own (wrong/narrow) reading; no independent oracle. Structural: FAIL_TO_PASS is absent from the sandbox (see commands.md). Partially addressed by the existing-suite gate (`1b101164`) — that gate catches regressions, NOT missing new behavior.
- **DOC_BAIL** — agent aborted the flowai workflow because the doc-system looked unbound (no SRS/index); no task file created. Addressed by `installDocStubs` (`8db3af43`); still nondeterministic (task files 5/13 on 2026-07-02).
- **BUDGET_TRUNCATION** — session hit step/token limits mid-flow (e.g. before review). Example: `django-16263`. Not a primitive bug; a harness/budget datum.
- **TEST_FITTING** — agent adjusted tests/expectations to make its own change pass. Example: `sympy-16597`. An implement/review honesty failure, never a plan failure.
- **EMPTY_PATCH** — no diff produced; swebench does not grade it. Record as `—`, investigate the transcript for why (bail, crash, timeout).
- **OVER_GENERALIZATION** — the counterpart of INCOMPLETE_FIX: right file/site, but the implemented contract is WIDER than the issue requires. Since grading is test-based (no diff-match), breadth is never penalized directly — it fails only when a shipped test case exercises the extra breadth and expects a different result. Two channels: (a) a NEGATIVE case inside the F2P set the wide fix wrongly accepts; (b) a PASS_TO_PASS contract the wide fix breaks (that sub-case is REGRESSION_IN_EXISTING). Example: `django-15098` (relaxed `([@-]\w+)?` → `([@-]\w+)*`, a strict superset of gold's `([@-]\w+){0,2}`; passes all positive cases but fails the negative cases in the same F2P test — `/de-simple-page-test/ → None`, 501-char path `→ None`). The correct bound (`{0,2}` = BCP-47 script+region) is legitimate but NOT derivable from the issue prose, which shows only positive cases. Lever: when relaxing/widening a matcher or removing a constraint, enumerate what must STILL be rejected and verify against it — the spec often lives in the negative space, not the ticket.
- **REGRESSION_IN_EXISTING** — F2P tests pass, but an over-broad edit breaks a PASS_TO_PASS test → swebench grades `resolved: false`. Distinct from FALSE_GREEN_REVIEW (there the NEW behavior is wrong/narrow); here the new behavior is right but a pre-existing contract was collaterally broken. Structural blind spot: the P2P set is neither run nor visible in the sandbox, so in-sandbox self-review cannot catch it. Example: `django-16454` (fix dropped gold's `if issubclass(parser_class, CommandParser)` guard, regressing `test_subparser_non_django_error_formatting`). Lever: "change the minimum surface that satisfies the requirement; preserve existing guards unless the issue names them".

## Phase attribution guidance

- **plan** — the requirement set or affected surface was never captured (most INCOMPLETE_FIX, WRONG_DIAGNOSIS, VARIANT_MISRANK).
- **implement** — plan was adequate; execution deviated or cut corners (TEST_FITTING, some INCOMPLETE_FIX).
- **review** — counted on interceptions: did review catch what plan/implement missed? A dismissed finding (`16256`) is a review datum even though the gap originated earlier. In the 2026-07 investigation review intercepted 0/11.
- Cross-check every "plan" attribution: if the plan text (sandbox `documents/tasks/`) already lists the missed behavior, the failure moved downstream.

## 2026-07-02 aggregate (for calibration)

- Dominant: INCOMPLETE_FIX 9/11; origin: plan ~8/11, implement ~2/11; review interceptions 0.
- Structural root: no independent oracle — RED test and review verdict both derive from the agent's own reading of the issue.

## 2026-07-11 aggregate (measured-headroom pool, 3 reps, for calibration)

- 10 real failures (excl. `requests-2317` = infra noise, see below). Phase split: plan 7, implement 3, review interceptions 0.
- Mode split — plan cluster: WRONG_DIAGNOSIS ×3 (stochastic; sibling rep hit the right site), SCOPE_NARROWED ×1 (`django-14376`, surface-scout returned degraded no-findings), VARIANT_MISRANK ×1 (`django-14792`), INCOMPLETE_FIX-narrow ×1 (`pylint-4970`, "disable"="show 0" not "print nothing", frozen by self-authored RED), OVER_GENERALIZATION ×1 (`django-15098`, NEW). Implement cluster: INCOMPLETE_FIX ×2 (`sphinx-10435` dropped 1 of 3 coordinated edits; `sympy-15017` added an unrequested guard), REGRESSION_IN_EXISTING ×1 (`django-16454`, NEW).
- Two NEW modes this round: OVER_GENERALIZATION and REGRESSION_IN_EXISTING (both above).
- Stochastic diagnosis is the top driver of flaky partials: the plan's site selection varies rep-to-rep (WRONG_DIAGNOSIS/VARIANT_MISRANK). A diagnosis-confidence/verification step would stabilize the cluster.
- Harness datum (not a primitive signal): `requests-2317` is not a genuine regression — flowai's code fix equals gold, but the local httpbin returns intermittent 503s so it grades 0–1/3 for everyone (baseline also 1/3). Dropped from the pool (precedent: `django-16263`). It also exposed a measurement-validity defect: the sandbox ran the F2P suite under host Python 3.14, where `from collections import Mapping` raises ImportError (absent in the 3.9 eval env), inducing phantom `collections.abc` scope creep across 6 files. Sandbox test-runner Python should match the instance's eval interpreter.
