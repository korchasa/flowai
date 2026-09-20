---
date: 2026-09-20
status: done
implements:
  - FR-READABILITY.LANGUAGE
tags: [chat, language, acceptance, measurement]
---

# Measure chat language integrity under the current criterion

## Goal

Replace a hand estimate with a verdict. The language clause recorded its state
as a manual re-classification of replies scored under a criterion that no longer
applies, which cannot decide whether the requirement is met and cannot be
audited by re-running anything.

## Overview

### Context

On 2026-09-20 the redundant gloss — a bracketed foreign rendering of wording the
reply had already given — stopped counting as a language defect. The checklist
text in all six `agents-rules-chat-*` scenarios changed with it, and the
calibration control `agents-rules-chat-source/clear-redundant-gloss` moved from
negative to positive with its sample text untouched. That work is recorded in
[stop-counting-redundant-gloss](stop-counting-redundant-gloss.md).

No behavioural run followed it. The clause's status quoted a hand
re-classification of 45 earlier sessions instead, which is an estimate of what a
judge would say, not a judge's verdict.

### Current State

- `FR-READABILITY.LANGUAGE` declares its acceptance as
  `deno task acceptance-tests -i claude -f agents-rules-chat- -n 3 --no-cache`.
- The last behavioural sweeps of these scenarios (`2026-09-20T10-38-58` and the
  rubric-corrected `2026-09-20T10-46-16`) predate the criterion change.
- Run directories are gitignored, so any verdict worth citing must be saved into
  the investigation's evidence directory as JSON.

### Constraints

- Measure only. No product instruction, fixture, checklist or calibration file
  may change in this task — an edit to any of them would move the instrument
  under the measurement.
- The clause may not be marked `[x]` unless every scenario reaches its threshold.
- Counts taken before and after the checklist edit are verdicts of two different
  instruments. Do not present their difference as a change in the product
  without separate evidence.

## Definition of Done

- [x] FR-READABILITY.LANGUAGE: The declared acceptance command ran to completion
      on the shipped instruction template, with every session graded.
  - Test: `deno task acceptance-tests -i claude -f agents-rules-chat- -n 3 --no-cache`
  - Evidence: `python3 -c "import json; d=json.load(open('documents/research/claude-language-investigation/claude-language-fix-evidence/language-sweep-new-criterion.json')); assert len(d['rows'])==18, len(d['rows']); assert all(r['sessions'] and r['sessions'][0]['messages'] for r in d['rows']), 'a session has no transcript'; print('ok')"`
- [x] FR-READABILITY.LANGUAGE: No failure in the sweep rests on a redundant
      gloss, so the relaxed criterion is what the judge actually applied.
  - Evidence: `python3 -c "import json,re; d=json.load(open('documents/research/claude-language-investigation/claude-language-fix-evidence/language-sweep-new-criterion.json')); bad=[r['key'] for r in d['rows'] for v in r['verdict'].values() if not v['pass'] and re.search(r'gloss', v['reason'], re.I) and not re.search(r'allowed|qualify as', v['reason'], re.I)]; assert not bad, bad; print('ok')"`
- [x] FR-READABILITY.LANGUAGE: The clause states measured pass rates per
      scenario and no longer presents a hand re-classification as its state.
  - Evidence: `python3 -c "import re; t=open('documents/requirements.md',encoding='utf-8').read(); g=[b for b in re.split(r'^#### ',t,flags=re.M) if b.startswith('FR-READABILITY.LANGUAGE:')][0]; assert '2026-09-20T19-50-09' in g; assert 'agents-rules-chat-dialogue\` 0/3' in g and 'agents-rules-chat-source\` 2/3' in g; assert 're-classifying the same reply texts by hand' not in g; print('ok')"`
- [x] FR-READABILITY.LANGUAGE: The clause stays unmet, because two scenarios sit
      below the threshold.
  - Evidence: `python3 -c "import re; t=open('documents/requirements.md',encoding='utf-8').read(); g=[b for b in re.split(r'^#### ',t,flags=re.M) if b.startswith('FR-READABILITY.LANGUAGE:')][0]; assert re.search(r'^- \*\*Status:\*\* \[ \]', g, flags=re.M), 'clause claims compliance'; print('ok')"`
- [x] FR-READABILITY.LANGUAGE: Both sweeps are committed as evidence, indexed in
      the investigation, and the SRS and SDS both record that counts across the
      checklist edit are not comparable, naming the span that proves it.
  - Evidence: `test -f documents/research/claude-language-investigation/claude-language-fix-evidence/language-sweep-new-criterion.json && test -f documents/research/claude-language-investigation/claude-language-fix-evidence/language-sweep-old-criterion.json && grep -qF 'language-sweep-old-criterion.json' documents/research/claude-language-investigation/README.md && grep -qF 'недоступный endpoint' documents/design.md && grep -qF 'недоступный endpoint' documents/requirements.md && echo ok`
- [x] FR-READABILITY.LANGUAGE: Repository checks stay green and the task record
      validates.
  - Test: `deno task check`
  - Evidence: `deno run -A scripts/check-task-format.ts && deno run -A scripts/check-srs-evidence.ts && deno run -A scripts/check-salp.ts && deno run -A scripts/check-traceability.ts` plus a recorded full-check summary with zero failures.

### Verification record

- Sweep `acceptance-tests/runs/2026-09-20T19-50-09`, 18 sessions, 258 s total,
  agent `claude-haiku-4-5`, judge tokens 648 919, exit 1 (two scenarios below
  threshold). Every session's sandbox `AGENTS.md` hashes to `5634038f9c…`, the
  shipped template, checked per session rather than once.
- Pass rates: `code` 3/3, `interface` 3/3, `jargon` 3/3, `source` 2/3,
  `dialogue` 0/3, `exceptions` 0/3. All seven failures are on `russian_prose`
  and nothing else; every meaning item and `english_artifact` passed in all 18.
- The one failure reason that mentions a gloss cites it as permitted, not as the
  defect: `background delivery jobs` and `interactive requests` are accepted,
  and the failure is the heading `Ещё один момент — rollout gate`.
- Instrument change, established rather than assumed: `agents-rules-chat-dialogue`
  scored 3/3 on 2026-09-20T10-38-58 and 0/3 here, and two of the three replies
  that passed then contain `недоступный endpoint` — the span the current
  checklist fails. The product did not move; the checklist's new examples made
  that category detectable. The earlier sweep is saved beside the new one so the
  comparison stays reproducible after the run directories are deleted.
- `agents-rules-chat-exceptions` fails all three sessions on one span, the
  heading label `Support Request (English)`, while the English support request
  itself is preserved correctly in all three.
- Validators: `check-task-format`, `check-srs-evidence`, `check-salp` and
  `check-traceability` all exit 0 — 45 evidence claims, 49 comment doc-links and
  130 task `implements` references resolve. Full check: 863 script tests and 187
  framework tests passed, 0 failed. It was run through
  `buildCheckPlan({syncPluginsLocal:false})` under `env -u AUTO_INSTALL_PLUGINS`,
  so a documentation change could not re-point the local plugin marketplace;
  `grep -c '^\[sync-plugins-local\]'` over the log returns 0.

## Solution

1. Run the clause's declared acceptance command against a clean cache, on the
   shipped template, three sessions per scenario.
2. Verify per session that the sandbox instruction file is the shipped template,
   not a candidate left behind by the investigation.
3. Save the verdicts and full transcripts of the new sweep, and of the last
   sweep under the previous checklist, into the investigation's evidence
   directory, and index both in its README.
4. Rewrite the clause's status with the measured pass rates, the surviving
   defect shapes quoted from the failures, and the non-comparability caveat.
5. Add the same caveat to the SDS acceptance section as a rule about editing a
   checklist, with the span that proves it.
6. Run the validators and the full check.
