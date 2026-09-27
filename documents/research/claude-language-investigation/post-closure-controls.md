# Post-closure controls

Four controlled runs made after this collection was saved: Controls 1 to 3 on
2026-09-20, Control 4 on 2026-09-20 with its analysis completed on 2026-09-27.
Controls 1 to 3 used the live acceptance runner with the
`agents-rules-chat-source` scenario or a single-factor variant of it, three runs
each, judge `gpt-5.6-sol` at temperature 0, result cache bypassed. Each changed
exactly one factor, which the failure analysis names as the discipline the
original search lacked. Control 4 changes the model arm instead and covers all
six chat scenarios.

**Read the counts against the criterion of that day.** Every failure below was
scored while a parenthetical gloss — a foreign rendering of wording the reply
had already given, as in «очередь проверки (review queue)» — still counted as a
defect. That stopped being a defect on 2026-09-20, after these runs, because the
reply already carries the meaning in the reader's language and the bracketed
original only points back at the source. Re-scored under the current criterion,
9 of the 16 language failures measured on the shipped template would disappear.
What survives is a foreign word standing in place of the reader's language
(«это gate для rollout», «он требуется для summarization») and a foreign word
used as a label rather than a translation (a heading tagged «(English)»). The
numbers below are left as they were measured.

## Control 1 — do candidate 5's permissions defeat its own prohibition?

Retrospective interviews of three failed sessions named two permissive
sentences as the reason they appended English glosses. Both sentences belong to
instruction candidate 5, not to the shipped template.

**Factor changed:** exactly those two sentences deleted from
[attempt-5-template.txt](claude-language-fix-evidence/attempt-5-template.txt),
188 bytes, nothing else edited or reordered:

- `Only then add exact code identifiers or visible interface labels needed to locate or configure something.`
- `Keep proper names, conventional loanwords, and explicitly quoted evidence intact.`

The prohibition the interviews circled —
`Do not add foreign equivalents of ordinary phrases you already explained.` —
stayed in place. Resulting template:
[attempt-16-permission-ablation-template.txt](claude-language-fix-evidence/attempt-16-permission-ablation-template.txt).

**Baseline:** candidate 5 complete —
[attempt-5-source.json](claude-language-fix-evidence/attempt-5-source.json),
`russian_prose` 0 of 3.

**Result:** [attempt-16-source.json](claude-language-fix-evidence/attempt-16-source.json),
`russian_prose` 0 of 3. Latin parentheticals per run: 2, 4, 2. Run 1 glossed a
heading — `Условие включения (Rollout gate)` — although the same bullet orders
headings to be written in the conversation language. `operational_meaning`
passed in all three runs, as it did on the baseline.

**Answer: no.** Deleting both permissions moved nothing. The interviews named a
sentence that was not load-bearing, which matches the recall failure this
investigation already recorded: three of eight interviewed sessions
misremembered their own output.

## Control 2 — is the defect specific to Haiku?

The whole evidence base ran on `claude-haiku-4-5`. The failure analysis flags
this: two isolated Sonnet editor calls are not an end-to-end model comparison.

**Factor changed:** the agent model only. The shipped template was restored
first and verified by SHA-256 against its pre-experiment bytes.

**Result:** [model-control-sonnet-source.json](claude-language-fix-evidence/model-control-sonnet-source.json),
`claude-sonnet-4-6`, `russian_prose` 0 of 3. Latin inserts per run: 3, 3, 1.
The three glossed terms are the same on every run — `review queue`,
`notification address`, `batch size` — and the best run carried one gloss,
inside backticks. No heading was glossed.

**Answer: no.** The defect reproduces on both Claude models. Sonnet's failures
are narrower and more repeatable than Haiku's, but they are failures.

## Control 3 — does the gloss come from the source, or from English?

Every measurement so far read an English source document and answered in
Russian, so two different causes were confounded: staying faithful to the
source's own wording, and reaching for English as the default language of
technical terms.

**Factor changed:** the source fixture's language only, English to German. The
fixture carries the same five facts under the same four headings, and the user's
question, the project rule, the checklist and both timeouts are byte-identical
to the English scenario. The one checklist edit names German as well as English
in its example list, so a German gloss fails exactly as an English one does.
Scenario: `agents-rules-chat-source-german`, kept
[frozen in this folder](acceptance-tests/agents-rules-chat-source-german/README.md)
rather than in the live suite — it is a measurement, not a product requirement.
Shipped template, `claude-haiku-4-5`.

**Judge calibration first:** the four fixed samples of the new scenario were
graded twice each, and the judge matched the expected verdict 8 times out of 8 —
[source-language-control-german-calibration.json](claude-language-fix-evidence/source-language-control-german-calibration.json).

**Baseline:** the English fixture, shipped template, same model —
`russian_prose` 0 of 3.

**Result:** [source-language-control-german.json](claude-language-fix-evidence/source-language-control-german.json),
`russian_prose` 2 of 3. The single failure carried three glosses, and they split
in two:

- `(Prüfwarteschlange)` and `(Benachrichtigungsadresse)` are lifted verbatim from
  the German source.
- `(batch size)` appears nowhere in the source, which says `Stapelgröße`. The
  model translated a German term into English in order to gloss it.

**Answer: both, and source fidelity is the larger part.** Against an English
source the defect is constant, 3 failures in 3; against a German source it drops
to 1 in 3. So the main driver is carrying the source document's own wording into
the reply. English as the default language of technical terms is a second,
weaker driver that survives even when the source is German — and it is the one
the failing run could not have got from the document.

## Control 4 — is the defect specific to the claude arm?

**Factor changed:** the model arm. Everything else held: the same six
`agents-rules-chat-*` scenarios, three runs each, the checklist as it stands
after the 2026-09-20 edit, the same commit, and a shipped `AGENTS.md` whose
sha256 was verified as `5634038f9c…` in every one of the 36 sandboxes. Command:
`deno task acceptance-tests -i codex -f agents-rules-chat- -n 3 --no-cache`, run
`2026-09-20T20-16-09`, exit 0.

**Result:** 15 of 18 sessions passed on the codex `gpt-5.6-terra` arm, against 11
of 18 on the claude arm. Verdicts and full transcripts:
[language-sweep-codex-arm.json](claude-language-fix-evidence/language-sweep-codex-arm.json),
paired with
[language-sweep-new-criterion.json](claude-language-fix-evidence/language-sweep-new-criterion.json)
for the claude arm.

The three codex failures split by cause, not by label:

- Two `russian_prose` failures (`agents-rules-chat-jargon` run 1,
  `agents-rules-chat-interface` run 3) are an **instrument defect**. The ACP
  client's `#onSessionUpdate` in `scripts/acceptance-tests/lib/acp/client.ts`
  pushes `agent_thought_chunk` and `agent_message_chunk` into one buffer with no
  separator and no marker, so codex's English reasoning headline is glued to the
  front of the Russian answer. `judge-evidence.md` shows the seam verbatim:
  `**Confirming absence of SRS and SDS documents**Выгрузку нельзя включить`.
  The reply itself is clean.
- One real language failure: «недоступный endpoint» in
  `agents-rules-chat-dialogue` run 2, while run 3 of the same scenario wrote
  «заведомо недоступный адрес». The rule lowers the rate; it does not enforce.
- One real meaning failure: `expiry_and_revoke` in
  `agents-rules-chat-interface` run 3 named a setting without saying that it
  controls how long the replaced key keeps working.

**Qualitative reading of the two arms' prose.** Codex holds the reader's language
better and lays the properties of a variant out as separate labelled lines
without being pushed. Claude compresses those properties into one paragraph,
drops the risks line, appends English glosses («background delivery jobs»,
«review queue», «batch size») and writes English headings
(`## Support Request (English)`). Claude is better at one thing that matters
here: it explained what an unfamiliar setting does in all three sessions where
codex explained it in two.

**What Control 4 settles, and the counting it forced.** The language defect is
not specific to the claude arm, but it is markedly worse there, on a
byte-identical instruction. That is evidence against any account that blames the
instruction text alone. The control also forced a count across both arms
together, 36 sessions, and the count is the reason
`FR-READABILITY.READER-CONTEXT` was reopened on 2026-09-27: the sibling language
item failed 10 times, and all eight meaning items together failed once. Five of
the six scenarios give the agent one turn (`maxSteps: 1`); only
`agents-rules-chat-dialogue` runs three. Meaning lost while a fact is carried
from turn to turn cannot appear in a one-turn session, so the near-silence of the
meaning items is a property of the instrument, not a verdict on the models.

## What the controls settle

Controls 1 to 3 concern the language defect on one scenario. Control 4 widens
the frame to both model arms and all six scenarios; read its own closing
paragraph for what it adds.

The behaviour survives every lever tried so far on this scenario: fifteen
instruction candidates, a runtime editor, the removal of the permissions the
model itself blamed, and a switch of model. It also survives the strongest
isolation available —
[probe-minimal-template.txt](claude-language-fix-evidence/probe-minimal-template.txt),
a 474-byte instruction file with no competing rules and a direct order to
translate parenthetical explanations, produced the same four glosses.

That is evidence against the wording of any single rule being the cause, and it
is not evidence that the requirement is unreachable. Control 3 gives the first
lever that moves the rate: the language of the source document. It points the
next attempt at a rule about what to do with the source's wording, rather than
at another prohibition on mixing languages. One untested lever remains — a
scenario shape other than "summarise this document".
