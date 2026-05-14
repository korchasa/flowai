---
name: flowai-jit-review
description: Use when the user asks for a JIT review, wants to catch hidden regressions in a staged/unstaged diff or commit range, or says "check my changes for hidden bugs". Synthesizes ephemeral Catching JiTTests (pass on parent, fail on diff). Not for fixing known failing tests (see flowai-fix-tests) or general code review (flowai-review).
effort: high
---

# JIT Review — Catching JiTTests for a diff

Adapts Meta's Intent-Aware JiTTests methodology to flowai. On a diff (staged,
unstaged, or commit-range), synthesize **ephemeral** tests that pass on the
parent revision and fail on the diff revision — the only objective signal that
you caught a real regression. Tests are discarded by default.

## Preconditions (fail-fast)

1. Project's AGENTS.md `Development Commands` section MUST declare a `test` (or
   `check`) command. If absent, STOP with:
   > JIT-review requires a declared `test` or `check` command in AGENTS.md
   > Development Commands. Aborting.
   Do NOT guess a runner (`npm test`, `pytest`, `go test`, etc.).
2. `git` MUST be available. If the repo is a shallow clone or `git worktree`
   is unsupported, fall back to reconstructing parent files via
   `git show HEAD:<path>` into a scratch dir.
3. Diff size guardrail: if the diff touches > ~10 files OR > ~500 LOC, warn
   the user and offer to split the review per-file or per-concern. Proceed
   only if they confirm.

## Pipeline (Intent-Aware, 10 stages)

### 1. Scope & diff collection

- Resolve diff-target from user request:
  - "staged" → `git diff --cached`
  - "unstaged" → `git diff`
  - explicit `<sha>..<sha>` range → that range
  - ambiguous → ask the user once; default to unstaged if they say "current".
- Identify the parent revision:
  - unstaged / staged → parent = `HEAD`
  - commit-range → parent = first sha of the range (its parent, typically
    `<range-start>^`).
- Reconstruct parent sources in a scratch worktree whose name includes a
  session / sandbox identifier (to avoid collisions when the skill runs in
  parallel acceptance tests or multiple shells):
  ```
  git worktree add <SCRATCH>/jit-parent-<session-id> <parent-sha>
  ```
  If `git worktree` fails → fall back to copying each changed file via
  `git show <parent-sha>:<path>` into `<SCRATCH>/jit-parent-<session-id>/`.
- Gather intent hints:
  - `git log -1 --pretty=%B <parent-sha>..HEAD` (or the range's commit
    messages).
  - Optional: `gh pr view --json body` IF the `gh` CLI is available AND the
    branch has a PR. If `gh` is missing or errors, proceed silently — PR body
    is a bonus, not a requirement.

### 2. Parent baseline

- Run the AGENTS.md `test` command inside the parent worktree.
- Parent baseline MUST be green. If it is red, STOP with:
  > Pre-existing test failures on the parent revision. JIT review requires a
  > green parent baseline — please fix those first.
- Do NOT run baseline on the diff revision: red tests there are exactly the
  signal we are trying to surface.

### 3. Intent inference (≤5 per diff)

For each changed hunk, record explicitly, in prose:
- **What the author tried to do** (intent).
- **Which invariants should have held** (pre- and post-conditions).

Cap the total list at 5 intents. If the diff implies more, merge related
intents or drop the least-risky.

### 4. Risk modelling (≤3 per intent)

For each intent, list up to 3 hypotheses of the form:
> "If the author, while trying to do X, had slipped on Y, the code would now
> fail at Z."

Risks must be **diff-specific** — not generic code smells ("null deref",
"unhandled exception") unless the diff directly exposes that risk.

### 5. Mutant synthesis (≤15 mutants total)

Generate one mutant per risk: a tiny patch on the diff-side file that models
the concrete failure mode. Typical mutations tied to common risks:

- comparator flip: `>` ↔ `>=`, `<` ↔ `<=`, `==` ↔ `!=`
- removed guard: delete an `if (x == null) return …`
- inverted return: swap two return branches
- skipped branch: remove an `else` body
- off-by-one: `i < n` ↔ `i <= n`, `length - 1` ↔ `length`
- swapped args: `f(a, b)` ↔ `f(b, a)`

Edge case: if the diff is **pure deletion** of code, no behavioural mutant
applies — record `no behavioral risks to probe` and jump to stage 9.

### 6. Test synthesis

For each mutant, write ONE test that:

1. Compiles / parses in the project's test language.
2. Passes on the parent revision.
3. **Kills** the mutant (fails when the mutation is applied on top of the
   current diff code, or passes only because the current code still behaves
   as the parent did).

Tests are written to an **ephemeral directory**. Apply ALL of:

- **Outside** the project's main test tree (e.g., NOT under `tests/`, NOT
  next to the file under test). Pick a scratch location that the host runner
  is configured to pick up — typically one of:
  - system temp, e.g. `$(mktemp -d)/jit-tests-<session-id>/` (preferred when
    the project's test command can be invoked with an explicit path).
  - repo-local scratch, e.g. `.flowai/jit/<session-id>/` — add the dir to
    `.gitignore` first (check `.gitignore` entry exists; if missing, append).
- **Not tracked by git** — under `.gitignore` or under system temp.
- **Stable within the session** — remember the path; you must find it again
  to relocate tests if the user says `save`.
- **Deleted on `discard`** — the directory is considered owned by the skill.

### 7. Dual-run verification

- **(a) parent**: run the generated tests against the parent worktree. Any
  test failing on parent is **invalid** (assumption leak) — discard it.
- **(b) diff**: run the (surviving) tests against the diff revision. Any
  test failing here is a **Catching JiTTest** — this is the core deliverable.
- **(c) mutants** (kill-rate probe): apply each mutant patch to the diff
  tree, run the matching test, record whether the mutant is killed. SKIP
  this sub-stage if the time-budget degradation is active (see §9).

### 8. Filter ensemble

Drop, in order:
- **Flaky** tests — rerun each surviving test 3 times; if the result flips,
  discard.
- **Assertion duplicates** — two tests asserting the same thing on the same
  input.
- **Zero-kill** tests — passed on parent, passed on diff, killed no mutant.

### 9. Report

Use this markdown skeleton verbatim (never collapse the **Intents** list into
per-test bullets — it MUST appear as its own top-level enumerated section
before any catching tests, so the author can audit whether the skill read the
diff correctly):

```markdown
## JIT Review: <N> catching tests

### Intents (inferred from diff, ≤5)
1. **<intent-1>** — invariants: <expected pre/post-conditions>
2. **<intent-2>** — invariants: ...
...

### Catching tests (pass on parent, fail on diff)
1. **<test-name>** — risk: <short risk description>
   - Intent ref: <#N from Intents list>
   - Mutant killed: <yes / no / skipped:degraded>
   - Failure on diff: <one-line assertion output>
   - Location: <source file>:<line>
2. ...

### Uncovered risks (no catching test generated)
- <risk> — reason: <why no test — e.g. non-deterministic, external I/O>

### Degradation notes
- Mutant-prove skipped: single test run exceeded 30 s threshold.

### Next
- save <test-name> → <proposed destination path>
- save all → <proposed destination directory>
- discard all → <scratch path>
```

Ranking: top 5 catching tests by `severity × uniqueness`, where severity is
"how plausible and impactful the caught regression is" and uniqueness is
"how many of the current catching tests assert a distinct symptom".

Time-budget degradation: if a single invocation of the `test` command on
the smallest scope takes > 30 seconds, SKIP stage 7(c) for the rest of the
session. Flag this in the "Degradation notes" section. The catching
invariant (pass on parent, fail on diff) is still preserved; only the
mutant kill-rate metric is lost.

### 10. Ephemeral dispose

After the report, prompt the user interactively:

```
Save which tests?
  - save <test-name>   → move one test into the main test tree
                         (I will propose a destination path)
  - save all           → move every catching test
  - discard all        → delete the scratch directory
```

Handle the response:
- `save <name>`: propose a destination based on the file under test
  (e.g. alongside `discount_test.ts`). Ask for confirmation before moving.
  On approval, `git mv` or equivalent — then stage the file.
- `save all`: same, iterated.
- `discard all` (default on timeout or ambiguous answer): delete the
  entire scratch directory. Do NOT leave stray files.

## Non-negotiables

- **Never modify production code.** JIT review reports risks; the author
  fixes them. Even if a catching test trivially points at a one-line fix,
  do not apply it.
- **Never write to the main test tree without an explicit `save`.** Every
  generated test must start in the ephemeral directory.
- **No mocks of the project's test runner.** Run it as declared in
  AGENTS.md against real code.
- **No guessing the runner.** If AGENTS.md lacks a `test` command, stop
  (see Preconditions).
- **Session isolation.** The scratch directory name must carry a unique
  session id so parallel invocations do not clobber each other.

## Verification checklist (self-check before reporting)

- [ ] Parent baseline ran in the worktree and was green.
- [ ] Intents list present and ≤5.
- [ ] Risks tied to intents, not generic code smells, ≤3 per intent.
- [ ] At least one mutant modelled a concrete diff-specific failure (unless
      the diff was pure deletion).
- [ ] Every reported catching test: (a) passed on parent, (b) failed on
      diff; evidence logged.
- [ ] Tests live under an ephemeral directory satisfying all four rules
      (outside main test tree, not in git, session-stable, disposable).
- [ ] Regression described with file path and line / construct.
- [ ] Degradation flagged explicitly if stage 7(c) was skipped.
- [ ] Production code unchanged; main test tree unchanged unless the user
      said `save`.
- [ ] Save / discard prompt issued; scratch directory deleted on `discard`.
