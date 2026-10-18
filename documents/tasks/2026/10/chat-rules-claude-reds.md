---
date: 2026-10-18
status: in progress
implements:
  - FR-READABILITY
  - FR-READABILITY.LANGUAGE
  - FR-CHAT-LINKS.RULE
  - FR-UNIVERSAL.QA-FORMAT
tags: [acceptance-tests, agents-rules, claude-arm]
related_tasks:
  - "[write-prd-basic-flaky](write-prd-basic-flaky.md)"
  - "[option-standalone](../09/option-standalone.md)"
---
# Chat-writing reds on the claude arm: six scenarios, split by broken layer

## Goal

The full sweep of 2026-10-18 on the claude arm left six chat-writing scenarios red. A red scenario is useful only when it
points at a real defect. Find, for each one, whether the rule, the scenario or the judge is broken, fix that layer, and
leave the scenarios green on the default model.

## Overview

### Context

- Sweep `acceptance-tests/runs/2026-10-18T14-45-21`, agent and judge `claude-sonnet-5-5`, one run per scenario. The
  default test arm moved from codex to claude on 2026-10-17; several of these rules were tuned on codex.
- Each red was resampled with `-n 3 --no-cache` on HEAD before any edit, then the failed sessions were resumed and
  interviewed in their own sandboxes.

### Current State

Per scenario, HEAD pass rate, the broken layer and what the interviews or judge reasons said:

- `agents-rules-file-links` 2/3 — checklist. Every failure was a path inside an inline-code shell command; the item
  exempted fenced blocks only. The sweep's `link_targets_resolve` failure ("this should pass") was judge noise.
- `agents-rules-chat-source` 1/3 — judge. It named the bracketed English glosses as allowed, then failed the item
  "under a strict reading".
- `agents-rules-readability` 0/3 — scenario, judge and rule. Setup patched two files after the runner's `init` commit,
  so the judge read the planted lines as the agent's edits (`no_fix_applied`). The sentence item failed sentences that
  break none of its stated limits. One session wrote "the linter wants `const`" and, interviewed, said the user's "do not
  fix anything" made it avoid naming the edit.
- `agents-rules-reader-context` 0/3 — rule and judge. Three sessions said a link, a self-describing name or a nearby
  claim had felt like an explanation, and that the rule has no before-send check. The judge also failed brief real
  explanations ("a model-calling function").
- `agents-rules-option-standalone` 0/3 — rule. Options carried `N1`, `E4`, bare percentages and "from the report".
  Interviews: the per-option check is the last sentence of a long layout paragraph and is applied to the title and
  Essence only. The defect, recorded as Opus-only on 2026-09-30, now shows on the default model.
- `write-prd-basic` 3/3 — a one-in-four slip, not a gate defect: a closing yes/no confirmation was left unnumbered.
  The interviewed session agreed the format covered it and suggested naming "a closing confirmation" explicitly.

### Constraints

- This session alone edits `framework/core/assets/AGENTS.template.md`, in one commit; it is in every scenario's cache
  key, so that commit invalidates every cached verdict.
- `framework/atoms/plan.md` and `scripts/acceptance-tests/lib/` belong to other sessions.
- No test-fitting: checklists are sharpened to what the rule says, never relaxed to match a verdict.

## Definition of Done

- [x] FR-CHAT-LINKS.RULE: a path inside a command is not scored as a file reference.
  - Benchmark: `agents-rules-file-links`
  - Evidence: `deno task acceptance-tests -f agents-rules-file-links -n 3 --no-cache` — 3/3 (`acceptance-tests/runs/2026-10-18T17-45-44`)
- [x] FR-READABILITY.LANGUAGE: the judge fails `russian_prose` only on a quoted span no allowance covers.
  - Benchmark: `agents-rules-chat-source`
  - Evidence: `deno task acceptance-tests -f agents-rules-chat-source -n 3 --no-cache` — 3/3 (`acceptance-tests/runs/2026-10-18T17-55-24`)
- [x] FR-READABILITY: the failure report names the edit even when the user forbids changes; the setup's planted lines are committed.
  - Benchmark: `agents-rules-readability`
  - Evidence: `deno task acceptance-tests -f agents-rules-readability -n 3 --no-cache` — 2/3, PASS at the 2/3 threshold (`acceptance-tests/runs/2026-10-18T17-49-16`)
- [x] FR-READABILITY: names from the code are explained and listed before sending.
  - Benchmark: `agents-rules-reader-context` (coverage, not acceptance — see FR-READABILITY.READER-CONTEXT)
  - Evidence: `deno task acceptance-tests -f agents-rules-reader-context -n 3 --no-cache` — 2/3 (`acceptance-tests/runs/2026-10-18T17-45-50`)
- [ ] FR-UNIVERSAL.QA-FORMAT rule 6: every option stands on its own on the default model.
  - Benchmark: `agents-rules-option-standalone`
  - Evidence: `deno task acceptance-tests -f agents-rules-option-standalone -n 3 --no-cache` — 0/3 on HEAD and on two rewrites (last: `acceptance-tests/runs/2026-10-18T17-50-51`); the rewrites were reverted on the user's decision.

## Solution

1. File links: the `files_are_links` item exempts a path that is an argument of an inline-code shell command, as it
   already exempted fenced blocks — a link there would break the command.
2. Chat source: `russian_prose` ends with a decision rule — fail only by quoting a span outside every allowance;
   "borderline" and "strict reading" are not grounds.
3. Readability: setup commits the two planted lines; `short_single_idea_sentences` is countable (over 25 words,
   semicolon / em-dash / nested-parentheses chains, two unrelated statements in one sentence), and a statement with its
   reason or consequence is one idea; `next_step_per_failure` accepts a choice between named edits and fails "what the
   tool wants". Template: the failure-report bullet asks for file, line and change, also when the user forbids changes.
4. Reader context: template reader rule — a name from the code counts, a link or self-describing name is not an
   explanation, list every backticked name before sending. Checklist: a short phrase is an explanation; the reader is
   the project's owner.
5. Option standalone — stopped after two failed rewrites (separate bullet with a hard condition; then a line-by-line
   check of all five option lines), both 0/3 and reverted. Next: repair `agents-rules-chat-calibration/calibrate.ts`
   for the claude judge (it builds a codex judge home and hangs), add the observed replies as fixed controls, separate
   judge strictness from the agent defect, then retry the rule.
6. `write-prd-basic`: no change — the scenario passes 3/3 on HEAD, so a fix could not be shown RED first.
