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
`defective-redundant-gloss` sample in the `source` case is such a control: a
Russian reply that repeats its own wording in English parentheses, which the
judge accepted until the language criterion named that pattern.

The first measurements and their limitations are recorded in
[the investigation](../../../../documents/research/claude-language-investigation/claude-language-acceptance.md).
