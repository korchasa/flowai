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

## Phase attribution guidance

- **plan** — the requirement set or affected surface was never captured (most INCOMPLETE_FIX, WRONG_DIAGNOSIS, VARIANT_MISRANK).
- **implement** — plan was adequate; execution deviated or cut corners (TEST_FITTING, some INCOMPLETE_FIX).
- **review** — counted on interceptions: did review catch what plan/implement missed? A dismissed finding (`16256`) is a review datum even though the gap originated earlier. In the 2026-07 investigation review intercepted 0/11.
- Cross-check every "plan" attribution: if the plan text (sandbox `documents/tasks/`) already lists the missed behavior, the failure moved downstream.

## 2026-07-02 aggregate (for calibration)

- Dominant: INCOMPLETE_FIX 9/11; origin: plan ~8/11, implement ~2/11; review interceptions 0.
- Structural root: no independent oracle — RED test and review verdict both derive from the agent's own reading of the issue.
