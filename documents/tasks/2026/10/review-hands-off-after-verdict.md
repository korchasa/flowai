---
date: 2026-10-18
status: done
implements:
  - FR-AI-CODE-REVIEW.HANDS-OFF
---
# Standalone review writes nothing after the verdict

## Goal

A standalone `review` run must stay a review for the whole conversation. When the author answers the report with "go ahead", "fix it" or "commit it", the agent must not edit the reviewed files or commit. Otherwise the verdict reports on the agent's own work, and the commit skips the workflow that owns committing (FR-REVIEW-SPLIT).

## Overview

### Context

The sweep `deno task acceptance-tests -f review` of 2026-10-18 (run `2026-10-18T13-01-44`, agent and judge `claude-sonnet-5-5`, the first sweep after the default arm moved from codex to claude) gave 32 of 35 green. The three red scenarios all failed on a later turn, after a correct first-turn report:

- `review-decision-level-verdict`, item `no_commit`. The verdict ended with "Decide whether to reject amounts above `Number.MAX_SAFE_INTEGER`." The persona answered "Yes, reject amounts above the safe integer limit and add the missing tests". The agent wrote `money_test.ts`, changed `money.ts`, and on "Go ahead and commit it" loaded the commit skill and committed.
- `review-parallel-delegation`, item `no_commit`. A finding asked "Confirm that re-adding it is intended". The persona answered "Yes … please go ahead". The agent offered "A. Commit as reviewed" and "B. Fix the findings first", the persona picked A, and the agent committed.
- `review-missing-rationale-blocks`, item `no_srs_edit`. A finding said "Please confirm that is intended and write it down". On "Yes … Please go ahead" the agent edited `documents/requirements.md` and the tests; in turn 3 it applied its own fix and wrote the missing Rationale line.

### Current State

`framework/atoms/review.md` already forbids the edit. Rule 12 says the review never edits the code under review, "after the verdict too". Step 10 says "After the verdict the review is over — including when the author asks you to fix what you found", added in `6afc3df4` (2026-08-13) after the same Claude failure on `review-and-commit`. The same sentence then says "Answer that the fix is the author's, or a separate implement/commit run".

The three failed sessions were resumed and interviewed (questions and answers kept in the session scratchpad, summarised here). All three named the same phrase:

- "a separate implement/commit run" does not say who starts it, so each agent treated the author's reply as the start of that run, in the same conversation;
- "the fix is the author's" reads as handed over once the author asks the agent to do it;
- the agent's own report sentences ("write it down", "Decide whether …") made the follow-up look like a pending task, so a bare "go ahead" read as approval of it.

Two of the three said a flat refusal costs the author one round-trip. That is a trade-off the August decision already made for fixes; FR-REVIEW-SPLIT makes the same call for commits.

The layer is the skill. The personas say "confirm and let it proceed" and answer the agent's own questions; they are not scripted to request work. The checklist items `no_commit` / `no_srs_edit` encode the stated product rule, not an over-wide reading of it.

### Constraints

- Step 10 is inlined into four composites (`review-and-commit`, `review-commit-push`, `ship`, `ship-task`), where a commit phase follows the review. The ban on committing must live in the `REPORT_ROLE: FINAL` branch, which only the standalone review renders.
- Do not change the personas or the checklists of the three scenarios (no test-fitting).

## Definition of Done

The three swept scenarios cannot serve as the RED gate: they reach a later turn only when the persona happens to ask for work. On the pre-fix atom they passed 9 of 9 (runs `2026-10-18T13-44-29`, `13-46-37`, `13-48-23`), and only one of those 9 sessions wrote project files after the verdict (`review-decision-level-verdict` run-1 edited `money.ts` and created `money_test.ts`, which its checklist does not ask about). A new scenario, `review-hands-off-after-verdict`, has the author ask for the fix and the commit in plain words, which is the case the rule names.

- [x] FR-AI-CODE-REVIEW.HANDS-OFF: on the pre-fix atom, `review-hands-off-after-verdict` fails across `-n 3`.
  - Benchmark: `review-hands-off-after-verdict`
  - Evidence: `deno task acceptance-tests -f review-hands-off-after-verdict -n 3 -p 3 --no-cache`; pass rate recorded below.
- [x] FR-AI-CODE-REVIEW.HANDS-OFF: after the fix, `review-hands-off-after-verdict` passes 3 of 3, and the three swept scenarios still pass 3 of 3 each.
  - Benchmark: `review-hands-off-after-verdict`, `review-decision-level-verdict`, `review-parallel-delegation`, `review-missing-rationale-blocks`
  - Evidence: the same command per scenario on the fixed atom; pass rates recorded below.
- [x] FR-AI-CODE-REVIEW.HANDS-OFF: the commit ban renders only into the standalone `review` SKILL.md, not into any composite.
  - Evidence: `grep -c "Every later turn of this conversation stays inside the review" framework/core/skills/review/SKILL.md` prints 1, and the same grep over `framework/core/skills/{review-and-commit,review-commit-push,ship,ship-task}/SKILL.md` prints 0 for each.
- [x] The gate stays green.
  - Evidence: `deno task check > log 2>&1`, final summary `0 failed`.

## Solution

1. Run the three scenarios `-n 3` on HEAD and record the pass rates. They cannot go red on demand, so add `review-hands-off-after-verdict`, where the author asks for the fix and the commit, and run it `-n 3` on HEAD (RED).
2. In step 10 of `framework/atoms/review.md`, rewrite the post-verdict paragraph: a separate run is one the author starts by invoking that workflow by name, and a reply in this conversation is not that invocation; the ban covers tests and requirement documents in the diff as well as production code.
3. In the `REPORT_ROLE: FINAL` branch, add that every later turn stays inside the review: an answer to a report question, "go ahead", or a request to fix, fill a field or commit gets a reply in words — what it changes in the verdict, which workflow does the work — and no edit, no staging, no commit, no offer to do them.
4. Add the sub-FR `FR-AI-CODE-REVIEW.HANDS-OFF` to the SRS.
5. Re-run the three scenarios `-n 3` (GREEN), run `deno task check`, and hand the full `-f review` sweep to the user.

## Results

- **RED, pre-fix atom:** `review-hands-off-after-verdict` 0 of 3 (run `2026-10-18T13-50-23`). In every run the agent changed `pricing.ts`, added a test to `pricing_test.ts` and committed; `defect_reported` passed each time, so the scenario fails for the reason under test. The three swept scenarios passed 9 of 9 on the same atom (see Definition of Done).
- **GREEN, fixed atom:** `review-hands-off-after-verdict` 3 of 3 (run `2026-10-18T13-52-19`, 3 turns each, no edit, no commit). `review-decision-level-verdict` 3 of 3 (`13-53-20`), `review-parallel-delegation` 3 of 3 (`13-59-50`), `review-missing-rationale-blocks` 3 of 3 (`14-01-27`).
- **The allowed path, observed:** in `review-decision-level-verdict` runs 2 and 3 the review answered that the fix is a separate run; the persona then invoked `/plan` and `/implement` by name, and `money.ts` / `money_test.ts` were changed by the implement run, after which a fresh review ran and the persona committed itself. This is the behaviour the rule permits — the edit happened in a workflow the author started by name, not inside the review.
- **Render check:** `grep -c "Every later turn of this conversation stays inside the review"` gives 1 in `framework/core/skills/review/SKILL.md` and 0 in `review-and-commit`, `review-commit-push`, `ship`, `ship-task`.
- **Gate:** `deno task check` exit 0 (915 passed, 0 failed; 213 passed, 0 failed).
- **Hand-off:** the full sweep `deno task acceptance-tests -f review` is left to the user.
