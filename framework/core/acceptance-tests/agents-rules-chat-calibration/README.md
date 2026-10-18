# Chat language acceptance checks

These six pack-level acceptance scenarios test Russian chat explanations from
Claude. They score unwanted language mixing separately from explanations that
depend on source names or earlier conversational context.

| Scenario suffix | Context |
| --- | --- |
| `source` | English operational note |
| `code` | Code names, behaviour, and settings |
| `interface` | Interface labels and permission consequences |
| `jargon` | Opaque Russian internal names |
| `dialogue` | A real choice followed by a self-contained handover |
| `exceptions` | Requested English artifact and useful exact identifiers |

Run only these authored scenarios, from the repository root:

```sh
deno task acceptance-tests -i claude -f agents-rules-chat- -n 3 --no-cache
```

The configured Claude and judge models come from `acceptance-tests/config.json`.
Three runs document observed repeatability; they do not establish a population
failure rate. Inspect each checklist result and the raw assistant transcript.
A scenario that passes is coverage, not evidence that it reproduces the defect.

Each scenario also contains fixed acceptable and defective replies in
`calibration.json`. They exercise the same real judge and checklist, twice per
reply, independently of Claude. Run calibration explicitly because it uses paid
model calls:

```sh
deno test -A framework/core/acceptance-tests/agents-rules-chat-calibration/calibrate.ts -- acceptance-tests/runs/chat-calibration-new
```

The output directory must not exist. An optional final argument selects one
suffix, such as `interface`. `results.json` preserves every input, expected
decision, actual decision, reason, and judge configuration. Calibration does not
replace live Claude runs. Correct brief replies and established terms are
positive controls; Russian-only opaque replies are negative controls for meaning.
When the judge decides a reply wrongly, add that reply as a fixed control and
sharpen the checklist; never relax a criterion to match the verdict. The
`clear-redundant-gloss` sample in the `source` case is such a control: a
Russian reply that repeats its own wording in English parentheses. It was a
negative control until 2026-09-20, when the language criterion stopped counting
a redundant gloss as a defect, and it is a positive control now.

The script builds the judge home the way the runner does (`buildJudgeConfig`):
a claude judge model gets the run's claude ACP home, any other model a codex
app-server home. Until 2026-10-18 it always built a codex home, and on the
claude judge the first call hung forever.

The calibration script also covers one sibling that is not part of the chat
language set: `agents-rules-option-standalone` (suffix `option-standalone`,
FR-UNIVERSAL.QA-FORMAT rule 6). It checks that every option of a next-step
question can be understood without the report above it. Its defect, first seen
only on Opus, reproduces on the default Claude model since 2026-10-18. Its
`observed-*` controls are six real replies from the 2026-10-18 runs, each
labelled by the rule text with the reason in `labelBasis`. On the claude judge
(`claude-sonnet-5-5`, effort medium) the `options_standalone` item catches every
negative control but fails many positive ones: 3 of 10 positive calls were
right before the item got its "what counts as explained" allowances and decision
rule, 6 of 10 after, and every negative call was right in both
(`acceptance-tests/runs/option-calibration-2026-10-18` and `-b`). A third,
longer wording made the judge pass bare errand ids and was reverted (`-c`).

The first measurements and their limitations are recorded in
[the investigation](../../../../documents/research/claude-language-investigation/claude-language-acceptance.md).
