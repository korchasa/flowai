---
date: 2026-08-27
status: done
tags: [agents-template, style, readability, coga]
implements:
  - FR-READABILITY
  - FR-ACCEPT.RULES
---
# Replace compressed style with a readability floor (plain language + W3C COGA)

## Goal

The repository's `Compressed Style Rules` push docs past the density where compression
still helps, and the resulting register carries over into chat answers. Replace the
compression mandate with a readability floor drawn from plain language (ISO 24495-1)
and the W3C COGA note "Making Content Usable", and add an explicit chat-scope rule so
the docs register stops leaking into conversation.

## Overview

### Context

Measured on `claude-opus-5` in an isolated `$HOME`, prose-explanation task, 3-4 runs
per variant. Mean sentence length and share of sentences over 25 words:

- no `CLAUDE.md`: 27.9 words, 55 %
- dense `CLAUDE.md`, no chat rule: 32.9 words, 53 %
- standards reference only: 28.3 words, 53 %
- reference + 1 rule (`under 25 words`): 19.6 words, 27 %
- reference + 3 rules: 19.3 words, 22 %, and the answer shrank from 798 to 451 tokens
- reference-free 6-rule list: 19.6 words, 23 %

Findings that shape the design:

1. The `Compressed Style Rules` section is NOT the leak source — removing it alone moved
   sentence length only from 32.9 to 31.8 words (overlapping ranges). The leak comes from
   the density of the document as a whole: reading a compressed SRS excerpt produced 33.0
   words, the same content rewritten in plain language produced 27.9 — the no-document
   baseline.
2. A bare reference to the two standards does not work. The models know both standards
   (verified by a direct knowledge probe) but do not apply them from the name alone. One
   checkable numeric rule supplies the whole effect.
3. `Prefer compact formats: lists, tables, …` is the one compression rule that EARNED its
   place: in a blind audit of a neutral Wikipedia article the compressed rewrite beat the
   plain-language rewrite (9/10 vs 8.5/10 and 9/10 vs 7/10) precisely because it used
   numbered phases and lists. COGA requires the same. Keep it.
4. Cost: the 3-rule block is ~110 input tokens, cached, and saves ~290 output tokens on a
   full explanation. It pays for itself on the first answer.
5. `codex` shows none of these effects — all variants sat at 19-20 words. The change is
   calibrated on Claude and is not expected to regress codex.

### Current State

- `framework/core/assets/AGENTS.template.md:8` — `Core Project Rules` mandates
  "compressed style"; line 215 holds `### Compressed Style Rules (All Docs)` with 7 bullets.
- `AGENTS.md:7` and `AGENTS.md:266` — the same two places in this repository.
- `framework/core/commands/init/SKILL.md:25` — lists "compressed style" among what `init`
  generates.
- `framework/core/acceptance-tests/agents-rules-*/` — 8 pack-level scenarios cover template
  rules; none covers output style.

### Constraints

- Keep `No changelogs`, `English only`, and `Prefer compact formats` — they are not
  compression rules and (for the last one) measurably help.
- The chat-scope block MUST open with its scope sentence: that sentence is the part that
  stops the docs register from carrying over.
- Do not add an imperative-mood rule: in the article audit it stripped the acting subject
  ("Wait for replies" instead of "The coordinator waits").
- Editing `AGENTS.template.md` invalidates the acceptance-test cache for EVERY scenario.
  Author runs only the new scenario; the full sweep is handed to the user.

## Definition of Done

- [x] FR-READABILITY: `AGENTS.template.md` ships a readability floor for docs and a
      chat-scope style block, and no longer mandates compressed style.
  - Test: `Benchmark: agents-rules-readability`
  - Evidence: `grep -c "Compressed Style Rules" framework/core/assets/AGENTS.template.md` returns 0
    AND `grep -c "Chat Output Style" framework/core/assets/AGENTS.template.md` returns 1
- [x] FR-READABILITY: this repository's own `AGENTS.md` carries the same two blocks.
  - Test: `Benchmark: agents-rules-readability` (fixture renders from the template, so the
    repo file is checked by grep only)
  - Evidence: `grep -c "Chat Output Style" AGENTS.md` returns 1 AND
    `grep -c "compressed style" AGENTS.md` returns 0
- [x] FR-ACCEPT.RULES: a pack-level scenario verifies the chat-style rule on a real fixture,
      and it fails on the pre-change template (RED) before it passes (GREEN).
  - Test: `Benchmark: agents-rules-readability`
  - Evidence: `deno task acceptance-tests -f agents-rules-readability` reports 0 errors
- [x] Downstream references updated: `init/SKILL.md` no longer promises compressed style.
  - Test: n/a (prose)
  - Evidence: `grep -c "compressed style" framework/core/commands/init/SKILL.md` returns 0
- [x] Project baseline stays green.
  - Test: n/a
  - Evidence: `deno task check` reports 0 failed

## Solution

1. SRS: add `FR-READABILITY` with the acceptance reference `agents-rules-readability`;
   register the new scenario under `FR-ACCEPT.RULES`.
2. SDS: add a component section describing the two blocks, their scope boundary, and the
   measurements above.
3. RED: author `framework/core/acceptance-tests/agents-rules-readability/mod.ts`. The
   scenario asks the agent to report a failed check in chat; the checklist scores the
   observable style contract — result first, sentences under 25 words, and a failure report
   that names the next step. Run it against the CURRENT template and confirm it fails.
4. GREEN: edit `framework/core/assets/AGENTS.template.md` — drop the compressed-style line
   from `Core Project Rules`, replace `### Compressed Style Rules (All Docs)` with
   `### Readability Floor (All Docs)`, and insert `## Chat Output Style`. Mirror both into
   `AGENTS.md`. Re-run the scenario.
5. Update `init/SKILL.md`.
6. Run `deno task check`. Hand the full acceptance sweep to the user.
