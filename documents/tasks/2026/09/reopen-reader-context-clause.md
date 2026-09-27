---
date: 2026-09-27
status: done
implements:
  - FR-READABILITY.READER-CONTEXT
tags: [chat, reader-context, acceptance, instrument]
related_tasks:
  - close-reader-context-clause
---

# Reopen the reader-context clause: the instrument cannot award compliance

## Goal

Stop the requirements document from claiming that chat replies are
understandable to a reader who did not see the session, when the only instrument
that measures it almost never fails. A clause marked met blocks the work that
would make it true: a future session reads `[x]`, trusts it, and never builds the
acceptance that could observe the defect.

## Overview

### Context

`FR-READABILITY.READER-CONTEXT` was marked met on 2026-09-20 by
[close-reader-context-clause](close-reader-context-clause.md), on a sweep of six
`agents-rules-chat-*` scenarios against the claude arm — 18 sessions, all eight
meaning items passing — plus a negative control per criterion in the calibration
harness.

Two measurements taken after that closure withdraw it.

A cross-arm control ran the same six scenarios on the codex `gpt-5.6-terra` arm,
three runs each, same checklist, same commit, byte-identical shipped template
(`AGENTS.md` sha256 `5634038f9c…`, verified in all 36 sandboxes). Run
`2026-09-20T20-16-09`, exit 0, 15 of 18 sessions passed. One failure is a real
meaning failure: `expiry_and_revoke` in `agents-rules-chat-interface` run 3 named
a setting without saying that it controls how long the replaced key keeps
working. The clause's own text already provides for this — "a later failure
reopens this clause rather than contradicting the measurement".

The stronger reason is a count the cross-arm run made possible. Across both arms,
36 sessions, all eight meaning items together produced 1 failure, while the
sibling language item produced 10. Five of the six scenarios give the agent a
single turn (`maxSteps: 1`); only `agents-rules-chat-dialogue` runs three.
Meaning lost while a fact is carried from turn to turn cannot appear in a
one-turn session. The negative controls prove each item can fail on a planted
defect; nothing shows an item firing at the magnitude a real reply produces. A
clean sweep from an instrument that is almost always silent is not evidence of
compliance.

A third finding is recorded but not fixed here: two of the codex arm's three
failures are an instrument defect on the sibling language item. `#onSessionUpdate`
in `scripts/acceptance-tests/lib/acp/client.ts` pushes `agent_thought_chunk` and
`agent_message_chunk` into one buffer with no separator, so an English reasoning
headline reaches the judge as the opening words of Russian prose. That is a
separate change and awaits its own decision.

### Current State

- Clause `FR-READABILITY.READER-CONTEXT` in `documents/requirements.md` marked
  `[x]`, citing the claude sweep and the calibration controls.
- `language-sweep-codex-arm.json` written but untracked, and not indexed by the
  investigation README.
- `post-closure-controls.md` records three controls and no cross-arm control.
- The run directories of both sweeps are gitignored and their sandboxes sit in
  the system temp directory, so the JSON files are the only durable record.

### Constraints

- Do not touch the shipped template or any checklist. This task changes the
  reading of measurements already taken, not the product and not the instrument.
- Keep the withdrawn evidence in the clause. It was measured correctly and a
  future session needs it.
- Do not rewrite the closure task's DoD evidence commands; annotate instead.

## Definition of Done

- [x] FR-READABILITY.READER-CONTEXT: The clause is open, states both reasons, and
      keeps the withdrawn evidence.
  - Evidence: `python3 -c "import re; t=open('documents/requirements.md',encoding='utf-8').read(); g=[b for b in re.split(r'^#### ',t,flags=re.M) if b.startswith('FR-READABILITY.READER-CONTEXT:')][0]; assert re.search(r'^- \*\*Status:\*\* \[ \]',g,flags=re.M), 'clause still claims compliance'; assert 'language-sweep-codex-arm.json' in g, 'cross-arm evidence not cited'; assert 'maxSteps' in g, 'single-turn limit not stated'; assert 'language-sweep-new-criterion.json' in g and 'meaning-item-calibration-controls.json' in g, 'withdrawn evidence dropped'; print('ok')"`
- [x] FR-READABILITY.READER-CONTEXT: The acceptance command is declared
      insufficient for closure, so the next session does not re-close on it.
  - Evidence: `python3 -c "import re; t=open('documents/requirements.md',encoding='utf-8').read(); g=[b for b in re.split(r'^#### ',t,flags=re.M) if b.startswith('FR-READABILITY.READER-CONTEXT:')][0]; a=[l for l in g.splitlines() if l.startswith('- **Acceptance:**')][0]; assert 'not sufficient' in a, a[:120]; print('ok')"`
- [x] FR-READABILITY.READER-CONTEXT: The cross-arm verdicts are tracked in git
      and hold the run they claim.
  - Evidence: `python3 -c "import json,subprocess; p='documents/research/claude-language-investigation/claude-language-fix-evidence/language-sweep-codex-arm.json'; assert subprocess.run(['git','ls-files','--error-unmatch',p],capture_output=True).returncode==0, 'not tracked'; d=json.load(open(p,encoding='utf-8')); s=json.dumps(d); assert '2026-09-20T20-16-09' in s, 'run id missing'; assert 'gpt-5.6-terra' in s or 'codex' in s, 'arm missing'; print('ok')"`
- [x] FR-READABILITY.READER-CONTEXT: The investigation record carries the
      cross-arm run as Control 4 and the index points at it.
  - Evidence: `python3 -c "c=open('documents/research/claude-language-investigation/post-closure-controls.md',encoding='utf-8').read(); r=open('documents/research/claude-language-investigation/README.md',encoding='utf-8').read(); assert '## Control 4' in c, 'no Control 4'; assert 'Three controlled runs' not in c, 'stale count in the lead'; assert 'language-sweep-codex-arm.json' in r, 'index does not list the file'; print('ok')"`
- [x] FR-READABILITY.READER-CONTEXT: The superseded closure task says its fourth
      evidence command no longer passes, and why.
  - Evidence: `python3 -c "t=open('documents/tasks/2026/09/close-reader-context-clause.md',encoding='utf-8').read(); assert 'Superseding note' in t, 'no note'; assert 'reopen-reader-context-clause' in t, 'no forward link'; print('ok')"`
- [x] FR-READABILITY.READER-CONTEXT: Repository checks stay green and the task
      record validates.
  - Test: `deno task check`
  - Evidence: `deno run -A scripts/check-task-format.ts && deno run -A scripts/check-srs-evidence.ts && deno run -A scripts/check-salp.ts && deno run -A scripts/check-traceability.ts`

### Verification record

- All six evidence commands run on 2026-09-27 and print `ok`. Each is falsifiable
  against the pre-change tree by construction: the clause was `[x]`, the
  acceptance line carried no insufficiency note, the cross-arm JSON was
  untracked, `post-closure-controls.md` had three controls and a lead that said
  "three", and the closure task had no note.
- Validators: `check-task-format`, `check-srs-evidence`, `check-salp`,
  `check-traceability` and `check-fr-coverage` all exit 0 — 45 evidence claims,
  49 comment doc-links and 132 task `implements` references resolve.
- Full check: `env -u AUTO_INSTALL_PLUGINS deno task check` exits 0, 863 script
  tests and 187 framework tests passed, 0 failed. Unsetting the variable did not
  suppress the marketplace re-point: the repository `.env` sets the flag, and
  `grep -c '^[sync-plugins-local]'` over the log returns 19. Harmless here — this
  is the main checkout, so the marketplace stayed pointed at
  `dist/claude-plugins` of this tree.
- No product file changed. `git diff --stat` covers `documents/` only.

## Solution

1. Flip the clause's status to `[ ]`. Lead with the reopening, give both reasons
   in order of strength — cross-arm failure first because it triggers the
   clause's own rule, instrument insensitivity second because it is the reason
   that matters — then keep the withdrawn evidence in a labelled third part.
2. Add a sentence to the clause's acceptance line saying the command is necessary
   but not sufficient, and naming what a closing acceptance has to add: a
   scenario that can observe meaning lost across turns, and the codex arm.
3. Commit `language-sweep-codex-arm.json` and index it in the investigation
   README.
4. Write the cross-arm run up as Control 4 in `post-closure-controls.md`: factor
   changed, result, the three failures split by cause, the qualitative reading of
   both arms' prose, and the count that reopened the clause. Update the file's
   lead and its closing section, which both said "three".
5. Append a superseding note to `close-reader-context-clause.md` explaining that
   its fourth evidence command now fails and why the facts it cites still stand.
6. Run the validators and the full check.
