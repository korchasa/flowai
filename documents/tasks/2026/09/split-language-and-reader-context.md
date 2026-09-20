---
date: 2026-09-20
status: done
implements:
  - FR-READABILITY.LANGUAGE
  - FR-READABILITY.READER-CONTEXT
tags: [requirements, chat, language, reader-context]
---

# Split chat language integrity from reader-context comprehension

## Goal

Let either half of the chat-quality defect be closed on its own. Today one
requirement carries two independent defects, so a verified fix for one of them
cannot be recorded: the clause stays `[ ]` until both are solved, and a partial
success is indistinguishable from no progress.

## Overview

### Context

The investigation in
[documents/research/claude-language-investigation](../../../research/claude-language-investigation/README.md)
measured six acceptance scenarios against unchanged product instructions and
tried fifteen instruction candidates plus one runtime editor. None produced a
stable repair, and the product template was restored byte-for-byte. The
investigation's own first conclusion is to treat the two defects separately:
"Treat language mixing and reader-context complexity as separate requirements.
Neither needs to share a mechanism with the other."

The measurements support that separation. Unwanted foreign prose reproduces in
every run of `agents-rules-chat-source` and intermittently in `code` and
`exceptions`. Unexplained meanings reproduce once, in `agents-rules-chat-interface`
run 1, while `jargon` and `dialogue` pass three runs of three. The two defects
do not co-occur, do not share a failing scenario set, and — per the
investigation — need not share a remedy.

### Current State

- `FR-READABILITY.LANGUAGE` in `documents/requirements.md` states both
  requirements in one description and one `**Acceptance:**` line. Anchor
  `` `[ANC:fr:readability.language]` ``.
- Six scenarios live in `framework/core/acceptance-tests/agents-rules-chat-*`,
  plus the calibration harness `agents-rules-chat-calibration`. Committed in
  `ad6763e2`.
- Every scenario carries a `russian_prose` checklist item (language) and one or
  more meaning items (comprehension). `agents-rules-chat-dialogue` additionally
  carries `followup_occurred`, which verifies the second conversation turn
  actually happened — an instrument guard, not a product requirement.
- `documents/design.md` §3.4 "Chat language and reader-context acceptance"
  references the single clause.
- All six `mod.ts` files and `calibrate.ts` carry a `FR-READABILITY.LANGUAGE`
  traceability comment.
- `FR-MAINT-LANG` cross-references the clause as "the reply side of the same
  problem"; that category detects borrowed names and foreign labels in project
  files, so it belongs with the language half.
- `agents-rules-reader-context` exists as separate, English-language historical
  coverage. It is referenced by no requirement and carries no traceability
  comment.

### Constraints

- Documentation only. No product instruction, scenario, fixture, checklist or
  calibration file changes in this task — the frozen inputs stay frozen so
  earlier verdicts remain comparable.
- No paid acceptance run is needed or implied. Recorded statuses quote the
  shipped-template measurements `2026-09-20T10-38-58` and `2026-09-20T10-46-16`;
  they are not re-measured here.
- Neither new clause may be marked `[x]`. Splitting a requirement records nothing
  about compliance.
- Keep the anchor `` `[ANC:fr:readability.language]` `` on the language half so the
  existing `FR-MAINT-LANG` cross-reference and the design reference stay live.
- Three observations establish repeatability only. Do not restate them as a
  population failure rate in either clause.

## Definition of Done

- [x] FR-READABILITY.LANGUAGE: The SRS carries two sibling sub-requirements, one
      per defect, each with its own anchor.
  - Test: `deno run -A scripts/check-salp.ts`
  - Evidence: `test "$(grep -c '^#### FR-READABILITY\.\(LANGUAGE\|READER-CONTEXT\):' documents/requirements.md)" = 2 && deno run -A scripts/check-salp.ts`
- [x] FR-READABILITY.LANGUAGE: The language clause names the language checklist
      item and the protected foreign-deliverable control, and claims no meaning
      item.
  - Test: covered by the Evidence command.
  - Evidence: `python3 -c "import re,sys; t=open('documents/requirements.md',encoding='utf-8').read(); b=re.split(r'^#### ',t,flags=re.M); g=[x for x in b if x.startswith('FR-READABILITY.LANGUAGE:')][0]; assert 'russian_prose' in g and 'english_artifact' in g, 'language items missing'; assert 'handover_meaning' not in g and 'permission_meaning' not in g, 'meaning item still in language clause'; print('ok')"`
- [x] FR-READABILITY.READER-CONTEXT: The comprehension clause names every meaning
      checklist item and excludes the instrument guard from its criteria.
  - Test: covered by the Evidence command.
  - Evidence: `python3 -c "import re; t=open('documents/requirements.md',encoding='utf-8').read(); b=re.split(r'^#### ',t,flags=re.M); g=[x for x in b if x.startswith('FR-READABILITY.READER-CONTEXT:')][0]; need=['operational_meaning','strategy_meaning','settings_meaning','permission_meaning','expiry_and_revoke','reader_meaning','handover_meaning','identifier_and_meaning']; missing=[n for n in need if n not in g]; assert not missing, missing; assert 'followup_occurred' in g, 'instrument guard not disclaimed'; print('ok')"`
- [x] FR-READABILITY.READER-CONTEXT: Both clauses stay unmet, so the split claims
      no compliance.
  - Evidence: `python3 -c "import re; t=open('documents/requirements.md',encoding='utf-8').read(); b=re.split(r'^#### ',t,flags=re.M); gs=[x for x in b if x.startswith('FR-READABILITY.LANGUAGE:') or x.startswith('FR-READABILITY.READER-CONTEXT:')]; assert len(gs)==2; assert all(re.search(r'^- \*\*Status:\*\* \[ \]',g,flags=re.M) for g in gs), 'a split clause claims compliance'; print('ok')"`
- [x] FR-READABILITY.READER-CONTEXT: The SDS acceptance section references both
      requirements and says which checklist items serve which.
  - Evidence: `grep -q 'REF:fr:readability.reader-context' documents/design.md && grep -q 'REF:fr:readability.language' documents/design.md && echo ok`
- [x] FR-READABILITY.LANGUAGE: Every chat scenario module and the calibration
      harness carry both traceability markers.
  - Evidence: `python3 -c "import glob,sys; fs=sorted(glob.glob('framework/core/acceptance-tests/agents-rules-chat-*/mod.ts'))+['framework/core/acceptance-tests/agents-rules-chat-calibration/calibrate.ts']; bad=[f for f in fs if not ('FR-READABILITY.LANGUAGE' in open(f,encoding='utf-8').read() and 'FR-READABILITY.READER-CONTEXT' in open(f,encoding='utf-8').read())]; assert len(fs)==7, fs; assert not bad, bad; print('ok')"`
- [x] FR-READABILITY.LANGUAGE: Repository checks stay green, and the task record
      validates.
  - Test: `deno task check`
  - Evidence: `deno run -A scripts/check-task-format.ts && deno run -A scripts/check-srs-evidence.ts && deno run -A scripts/check-traceability.ts` plus a recorded full-check summary line with zero failures.

### Verification record

Every Evidence command above was run twice: against `HEAD` (the unsplit state),
where all six document assertions fail, and against the working tree, where all
six pass. The `HEAD` copies were extracted with `git show` into a scratch
directory; the working tree was not disturbed.

- `check-salp.ts`, `check-task-format.ts`, `check-srs-evidence.ts` and
  `check-traceability.ts` all exit 0. Evidence claims: 45 resolve. Comment
  doc-links: 49 resolve. Task `implements` references: 128 match the SRS.
- Full check: 863 script tests and 187 framework tests passed, 0 failed, exit 0.
  The three `=== FAIL deno eval Deno.exit(...)` lines are the documented
  intentional fixtures of `task-check_test.ts`, not failures.
- The full check was run through `buildCheckPlan({syncPluginsLocal:false})`
  because this checkout's `.env` sets `AUTO_INSTALL_PLUGINS=true`, and a
  documentation-only change must not re-point the user's local plugin
  marketplace. `grep -c '^\[sync-plugins-local\]'` over the log returns 0, so
  the step did not run. Every other check command was retained.
- No acceptance scenario was run. The statuses in both clauses quote the
  18 sessions that already existed on the shipped template:
  `acceptance-tests/runs/2026-09-20T10-38-58` and, for `agents-rules-chat-exceptions`
  under the corrected rubric, `acceptance-tests/runs/2026-09-20T10-46-16`.
- Correction applied 2026-09-20 after the first draft of this task: both statuses
  had also cited `acceptance-tests/runs/2026-09-20T11-09-13`. That run carries
  instruction candidate 5 (`Compose from meaning first`), not the shipped rule
  (`The reader did not see this session`), so it measures a rejected candidate
  rather than this requirement. Verified by comparing the chat-style bullet in
  each run's sandbox `AGENTS.md` against `framework/core/assets/AGENTS.template.md`;
  the `10-38-58` sandbox matches the shipped bullet byte-for-byte.
- Addendum 2026-09-20, after this task's own verification: two single-factor
  controls were run outside its scope and are recorded in
  [post-closure controls](../../../research/claude-language-investigation/post-closure-controls.md).
  `FR-READABILITY.LANGUAGE`'s status now cites them as well. They changed no
  status marker and no acceptance reference — both controls failed 0 of 3, so
  the clause stays `[ ]` for the reason it already carried.

## Solution

1. Rewrite `FR-READABILITY.LANGUAGE` in `documents/requirements.md` so it states
   language integrity only: target-language prose, the closed list of permitted
   foreign spans, and the redundant-gloss rule. Keep its anchor. Its acceptance
   names the `russian_prose` item in all six scenarios and `english_artifact` as
   the protected-deliverable control, keeps the calibration requirement and the
   `defective-redundant-gloss` control, and quotes the 2026-09-20 source result.
2. Add sibling `FR-READABILITY.READER-CONTEXT` immediately after it, with anchor
   `` `[ANC:fr:readability.reader-context]` ``. It states that a chat explanation must
   be understandable to a reader who has not seen the session, names the eight
   meaning items as its acceptance, marks `followup_occurred` as an instrument
   guard rather than a criterion, and records `agents-rules-reader-context` as
   separate historical coverage rather than acceptance.
3. Give both clauses a `**Background:**` line pointing at the investigation
   folder, and a `**Tasks:**` line pointing at this file. Leave both `[ ]`.
4. Update `documents/design.md` §3.4 "Chat language and reader-context
   acceptance" to reference both anchors and to say which checklist items belong
   to which requirement.
5. Extend the traceability comment in the six `mod.ts` files and in
   `calibrate.ts` to name both requirement ids, since each module measures both.
6. Add one sentence to the investigation README recording that the requirement it
   informed was later split in two, so the snapshot does not read as current.
7. Run the validators in the Definition of Done. Run the full check with the
   plugin sync step disabled, so the user's local plugin marketplace is not
   re-pointed by a documentation change, and record the summary counts.
