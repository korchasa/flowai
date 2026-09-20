---
date: 2026-09-20
status: done
implements:
  - FR-READABILITY.LANGUAGE
tags: [requirements, chat, language, acceptance]
---

# Stop counting a redundant gloss as a language defect

## Goal

Make the chat-language requirement name the failure the reader actually suffers
from. A bracketed translation after wording the reply has already given costs
the reader nothing; a foreign word standing in place of their language costs
them the sentence. Scoring both the same way hid the second behind the first.

## Overview

### Context

The investigation into Claude's chat language ran fifteen instruction
candidates, a runtime editor, two single-factor controls and a source-language
control, and produced no accepted repair
(@documents/research/claude-language-investigation/README.md). Almost every
failure it measured was one pattern: «очередь проверки (review queue)» — a
Russian explanation followed by the source's own English wording in brackets.

Re-classifying the 16 language failures measured on the shipped product template
shows what else is there. 9 of them are glosses and nothing else. The other 7
carry a different defect:

- A foreign word instead of a native one, with no native word anywhere:
  «он требуется для summarization», «через callback», «недоступный endpoint»,
  «Установи в config эти значения», «это gate для rollout».
- A foreign word used as a label rather than a translation: the heading
  «## Текст обращения в поддержку (English)», where «на английском» was
  available. It is parenthetical in form but renders nothing.

These cluster in the scenarios about explaining code and handing over work, not
in the one about summarising a source document — a different cause from the
gloss, which the source-language control traced to fidelity to the source's own
wording.

### Current State

- `FR-READABILITY.LANGUAGE` (@documents/requirements.md) states that a
  parenthetical or appositive foreign rendering of wording already given "is a
  redundant gloss and fails even when it names a technical concept".
- The same sentence is repeated verbatim in the `russian_prose` checklist of six
  live scenarios under `framework/core/acceptance-tests/agents-rules-chat-*`.
- `agents-rules-chat-source/calibration.json` carries a fixed sample
  `defective-redundant-gloss` whose only Latin spans are four brackets, expected
  to fail.
- @documents/design.md describes that sample as a negative control added because
  the judge passed it until the criterion was tightened.
- The German source-language control has been moved out of the live suite and
  frozen at
  @documents/research/claude-language-investigation/acceptance-tests/agents-rules-chat-source-german/.

### Constraints

- The permission is narrow. It covers only a foreign span that renders an
  adjacent word or phrase the reply has already written in its own language.
- A foreign word standing in place of the reply's language still fails.
- A foreign word used as a label or marker rather than as a translation still
  fails.
- The identifier, product-name, quotation, code-block, established-term and
  requested-deliverable exceptions are unchanged.
- Investigation records are historical and are not rewritten; they get a dated
  note saying which criterion scored them.
- The full acceptance sweep is hours of LLM time and belongs to the user. The
  agent verifies with the calibration harness, which grades fixed replies.

## Definition of Done

- [x] FR-READABILITY.LANGUAGE: the requirement permits a parenthetical rendering
      of wording already given, and still fails a foreign word used in place of
      the reply's language or as a label.
  - Test: `deno test -A framework/core/acceptance-tests/agents-rules-chat-calibration/calibrate.ts -- <fresh-output-dir>`
  - Evidence: `grep -c 'is a redundant gloss and fails' documents/requirements.md` returns 0, and `grep -c 'redundant gloss and is allowed' documents/requirements.md` returns 1
- [x] The same wording reaches every live chat scenario's `russian_prose` item.
  - Test: same calibration command
  - Evidence: `grep -l 'redundant gloss and is allowed' framework/core/acceptance-tests/agents-rules-chat-*/mod.ts | wc -l` returns 6, and `grep -rc 'is a redundant gloss and fails' framework/core/acceptance-tests/agents-rules-chat-*/mod.ts | grep -vc ':0'` returns 0
- [x] The gloss-only calibration sample becomes a positive control instead of a
      negative one, and every other fixed sample keeps its verdict.
  - Test: `deno test -A framework/core/acceptance-tests/agents-rules-chat-calibration/calibrate.ts -- <fresh-output-dir>`
  - Evidence: the run reports `matched` for every sample of all six scenarios; `python3 -c "import json;d=json.load(open('framework/core/acceptance-tests/agents-rules-chat-source/calibration.json'));print([s['id'] for s in d if s['expected']['russian_prose']])"` includes `clear-redundant-gloss`
- [x] The investigation record says which criterion scored its counts.
  - Test: manual — korchasa
  - Evidence: `grep -c 'Read the counts against the criterion of that day' documents/research/claude-language-investigation/post-closure-controls.md` returns 1
- [x] The project gate stays green.
  - Test: `deno task check`
  - Evidence: the run's summary lines report `0 failed`

## Solution

1. Replace the prohibition sentence in `FR-READABILITY.LANGUAGE` with the
   narrow permission, and rewrite the clause's Acceptance and Status text that
   depended on the gloss being a defect.
2. Rewrite the matching sentence in @documents/design.md so the calibration
   sample is described as a positive control.
3. Apply the same replacement to the `russian_prose` description in the six live
   scenarios, in one scripted pass with a per-file match assertion.
4. In `agents-rules-chat-source/calibration.json`, rename
   `defective-redundant-gloss` to `clear-redundant-gloss` and flip its expected
   `russian_prose` verdict. Leave every other sample alone — the `defective`
   samples fail on English headings and on bare English words, which the new
   criterion still rejects.
5. Run the calibration harness over all six scenarios and confirm every sample
   matches. This is the verification that the judge reads the new criterion as
   intended; the full behavioural sweep stays with the user.
6. Run `deno task check`.

## Verification record

Run on 2026-09-20, in this order.

- Judge calibration over all six live scenarios, two repeats per sample:
  36 of 36 matched (`deno test -A framework/core/acceptance-tests/agents-rules-chat-calibration/calibrate.ts -- <dir>`, 3m28s).
  The two decisive samples read correctly: `clear-redundant-gloss` passed twice,
  the judge naming the brackets as glosses "immediately after equivalent Russian
  wording, which is explicitly allowed"; `defective` failed twice on the English
  headings and on `required` / `optional` / `Rollout gate`, which the judge
  called "ordinary English prose in place of Russian wording".
- Project gate: `863 passed | 0 failed` and `187 passed | 0 failed`, exit 0. Run
  with `syncPluginsLocal: false` and without `AUTO_INSTALL_PLUGINS`, so the
  user's plugin marketplace was not re-pointed; the log holds no
  `[sync-plugins-local]` line.

Not done here, and deliberately: the behavioural sweep
`deno task acceptance-tests -i claude -f agents-rules-chat- -n 3 --no-cache`.
It is hours of LLM time and belongs to the user. Until it runs,
`FR-READABILITY.LANGUAGE` has no verdict under the new criterion — the figures
in its Status are a re-classification of old reply texts by reading, not by the
judge.
