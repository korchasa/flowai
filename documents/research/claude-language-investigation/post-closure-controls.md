# Post-closure controls

Two controlled runs made on 2026-09-20, after this collection was saved. Both
used the live acceptance runner with the `agents-rules-chat-source` scenario,
three runs each, judge `gpt-5.6-sol` at temperature 0, result cache bypassed.
Each changed exactly one factor, which the failure analysis names as the
discipline the original search lacked.

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

## What the two controls settle

The behaviour survives every lever tried so far on this scenario: fifteen
instruction candidates, a runtime editor, the removal of the permissions the
model itself blamed, and a switch of model. It also survives the strongest
isolation available —
[probe-minimal-template.txt](claude-language-fix-evidence/probe-minimal-template.txt),
a 474-byte instruction file with no competing rules and a direct order to
translate parenthetical explanations, produced the same four glosses.

That is evidence against the wording of any single rule being the cause, and it
is not evidence that the requirement is unreachable. Untested levers remain:
a non-English source fixture, which would separate "translating from an English
source" from "mixing languages at all", and a scenario shape other than
"summarise this document".
