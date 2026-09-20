---
date: 2026-09-20
status: done
implements:
  - FR-READABILITY.READER-CONTEXT
tags: [chat, reader-context, acceptance, calibration]
---

# Close the reader-context clause behind a proven instrument

## Goal

Award a pass only where something could have failed. The comprehension clause's
own acceptance came back clean across a full sweep, but two of its eight criteria
had never been shown capable of failing — so part of the pass rested on items of
unknown discrimination, and closing on that would have recorded compliance the
measurement did not support.

## Overview

### Context

`FR-READABILITY.READER-CONTEXT` requires a chat reply to be understandable to a
reader who has not seen the session. It is measured by eight meaning items spread
across the six `agents-rules-chat-*` scenarios, graded in the same run as the
language clause.

The sweep `2026-09-20T19-50-09`, recorded in
[measure-chat-language-new-criterion](measure-chat-language-new-criterion.md),
passed all eight items in all 18 sessions. That sweep was taken for the language
clause; the meaning items ride along in the same checklists.

### Current State

- The calibration harness grades fixed replies against the real scenario
  checklists twice each, so a criterion can be shown to discriminate without
  spending an agent session.
- Six of the eight meaning items already had a negative control:
  `strategy_meaning` and `settings_meaning` (`agents-rules-chat-code`),
  `permission_meaning` and `expiry_and_revoke` (`agents-rules-chat-interface`),
  `reader_meaning` (`agents-rules-chat-jargon`), `handover_meaning`
  (`agents-rules-chat-dialogue`).
- `operational_meaning` (`agents-rules-chat-source`) and `identifier_and_meaning`
  (`agents-rules-chat-exceptions`) had none: every fixed sample in those two sets
  expected them to pass.
- Run directories are gitignored, so any verdict worth citing is saved as JSON in
  the investigation's evidence directory.

### Constraints

- No scenario checklist, fixture, query or product instruction may change. Adding
  a calibration sample must leave the sweep a valid verdict on the current tree;
  editing a checklist would invalidate it.
- A negative control must isolate its own item: the reply's language stays clean,
  and only the meaning item is defective. A control that also trips
  `russian_prose` proves nothing about comprehension.
- The clause may be marked `[x]` only if both new controls actually fail their
  item, and for the planted reason rather than an incidental one.

## Definition of Done

- [x] FR-READABILITY.READER-CONTEXT: Every criterion of the clause carries a
      negative control in the calibration set.
  - Evidence: `python3 -c "import json; need={'agents-rules-chat-source':['operational_meaning'],'agents-rules-chat-code':['strategy_meaning','settings_meaning'],'agents-rules-chat-interface':['permission_meaning','expiry_and_revoke'],'agents-rules-chat-jargon':['reader_meaning'],'agents-rules-chat-dialogue':['handover_meaning'],'agents-rules-chat-exceptions':['identifier_and_meaning']}; missing=[]; [missing.append((sc,i)) for sc,items in need.items() for i in items if not any(s['expected'].get(i) is False for s in json.load(open(f'framework/core/acceptance-tests/{sc}/calibration.json',encoding='utf-8')))]; assert not missing, missing; print('ok')"`
- [x] FR-READABILITY.READER-CONTEXT: Each new control isolates its item — the
      language item and any deliverable item still expect a pass.
  - Evidence: `python3 -c "import json; a=[s for s in json.load(open('framework/core/acceptance-tests/agents-rules-chat-source/calibration.json',encoding='utf-8')) if s['id']=='defective-operational-meaning'][0]; b=[s for s in json.load(open('framework/core/acceptance-tests/agents-rules-chat-exceptions/calibration.json',encoding='utf-8')) if s['id']=='defective-identifier-meaning'][0]; assert a['expected']=={'russian_prose':True,'operational_meaning':False}, a['expected']; assert b['expected']=={'russian_prose':True,'english_artifact':True,'identifier_and_meaning':False}, b['expected']; print('ok')"`
- [x] FR-READABILITY.READER-CONTEXT: The real judge reproduces both controls, on
      two gradings each, failing only the planted item.
  - Test: `deno test -A framework/core/acceptance-tests/agents-rules-chat-calibration/calibrate.ts -- <fresh-dir> source` and the same with `exceptions`
  - Evidence: `python3 -c "import json; d=json.load(open('documents/research/claude-language-investigation/claude-language-fix-evidence/meaning-item-calibration-controls.json',encoding='utf-8')); rows=[r for c in d['cases'].values() for r in c['results'] if 'defective-operational-meaning' in r['label'] or 'defective-identifier-meaning' in r['label']]; assert len(rows)==4, len(rows); [ (lambda a: (__import__('sys').exit('wrong items: '+r['label']) if sorted(k for k,v in a.items() if not v['pass'])!=sorted(k for k,v in r['expected'].items() if v is False) else None))(r['actual']) for r in rows ]; print('ok')"`
- [x] FR-READABILITY.READER-CONTEXT: The clause records the pass with both kinds
      of evidence, and no checklist changed under the sweep it cites.
  - Evidence: `python3 -c "import re,subprocess; t=open('documents/requirements.md',encoding='utf-8').read(); g=[b for b in re.split(r'^#### ',t,flags=re.M) if b.startswith('FR-READABILITY.READER-CONTEXT:')][0]; assert re.search(r'^- \*\*Status:\*\* \[x\]',g,flags=re.M); assert 'language-sweep-new-criterion.json' in g and 'meaning-item-calibration-controls.json' in g; ch=subprocess.run(['git','diff','--name-only','9a8c1fac','--','framework/'],capture_output=True,text=True).stdout.split(); assert all(f.endswith('calibration.json') for f in ch), ch; print('ok')"`
- [x] FR-READABILITY.READER-CONTEXT: Repository checks stay green and the task
      record validates.
  - Test: `deno task check`
  - Evidence: `deno run -A scripts/check-task-format.ts && deno run -A scripts/check-srs-evidence.ts && deno run -A scripts/check-salp.ts && deno run -A scripts/check-traceability.ts` plus a recorded full-check summary with zero failures.

### Verification record

- `agents-rules-chat-source/defective-operational-meaning`: a Russian reply that
  names the source's own categories — the recovery policy, the required
  configuration parameters — without saying what they mean for the reader. Both
  gradings failed `operational_meaning` and passed `russian_prose`. The judge
  listed the omissions itself: the three-attempt limit, the wait for review
  rather than deletion, the notification address, the batch default of 20, and
  the test-failure notification before enabling.
- `agents-rules-chat-exceptions/defective-identifier-meaning`: the English
  support request is intact and keeps both exact strings, while the Russian
  explanation renders the machine-readable value as «фиксированный» and drops the
  key. Both gradings failed `identifier_and_meaning`, passed `russian_prose` and
  passed `english_artifact` — the reader is told what is wrong and still cannot
  make the change.
- Calibration totals: 10 gradings of the source set and 8 of the exceptions set,
  18 in all, every one matching its expected verdict.
- Only two files under `framework/` changed since the sweep, both
  `calibration.json`. No checklist, fixture or query moved, so the sweep remains
  a verdict on the current tree.
- Validators: `check-task-format`, `check-srs-evidence`, `check-salp` and
  `check-traceability` all exit 0 — 45 evidence claims, 49 comment doc-links and
  131 task `implements` references resolve. Full check: 863 script tests and 187
  framework tests passed, 0 failed, run through
  `buildCheckPlan({syncPluginsLocal:false})` under `env -u AUTO_INSTALL_PLUGINS`
  so the local plugin marketplace was not re-pointed;
  `grep -c '^\[sync-plugins-local\]'` over the log returns 0. `deno fmt` over the
  whitelist reformatted nothing.

## Solution

1. Author one negative control per uncovered criterion, keeping the reply's
   language clean so the control isolates the meaning item.
2. Grade each affected set with the real judge through the calibration harness
   and confirm both controls fail their own item, for the planted reason.
3. Save both calibration results as evidence beside the sweep.
4. Extend the clause's acceptance to require a negative control per criterion,
   and mark the clause met, citing the sweep and the controls together.
5. Record the same rule in the SDS acceptance section: an item that never fails
   cannot award a pass.
6. Run the validators and the full check.
