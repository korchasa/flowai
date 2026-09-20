# Claude language investigation — collected materials

This folder is a saved collection of the investigation, working hypotheses, failed candidates, independent controls, and retrospective conclusions. Start with the working record, then the failure analysis. No stable repair was accepted.

## Documents

- [Complete working record and remaining hypotheses](fix-claude-chat-language.md)
- [Failure analysis and five-whys chains](claude-language-failure-analysis.md)
- [Post-closure single-factor controls](post-closure-controls.md)
- [Research basis and source links](claude-chat-language.md)
- [Acceptance-scenario design and initial measurements](claude-language-acceptance.md)
- [Definition and research article from second-brain](language-drift.md)

## Evidence and reproduction inputs

- [Experiment index](claude-language-fix-evidence/experiment-index.json)
- [Permission ablation on candidate 5](claude-language-fix-evidence/attempt-16-source.json) and its [template](claude-language-fix-evidence/attempt-16-permission-ablation-template.txt)
- [End-to-end Sonnet model control](claude-language-fix-evidence/model-control-sonnet-source.json)
- [Restored product state and final checks](claude-language-fix-evidence/final-state.json)
- [Initial calibration](claude-language-evidence/final-calibration.json)
- [Haiku editor observations](claude-language-fix-evidence/editor-isolated/observations.json)
- [Sonnet editor observations](claude-language-fix-evidence/editor-isolated-sonnet/observations.json)
- [Instruction-delivery control](claude-language-fix-evidence/evidence/request-capture.json)
- [Native display versus bridge control](claude-language-fix-evidence/evidence/message-display-probe/result.json)
- [Acceptance scenarios, fixtures, calibration driver, and configuration snapshot](acceptance-scenarios.zip)
- [Available original session transcripts and missing-file inventory](session-inventory.json)
- [Source locations and SHA-256 integrity manifest](manifest.json)
- [Calibration sets as they stood during the investigation](acceptance-tests/) — a historical snapshot. The live set in `framework/core/acceptance-tests/agents-rules-chat-*/calibration.json` has moved on: `agents-rules-chat-source` now also carries the `defective-redundant-gloss` control added after this investigation closed.

The two evidence directories preserve captured files byte-for-byte and sit beside the documents that cite them, so every relative path inside this folder resolves. Historical commands and absolute run paths inside evidence remain unchanged. The manifest and session inventory map originals to saved copies, and their `source` fields keep the original investigation paths on purpose. The second-brain article preserves its original text; two of its links point into that vault and do not resolve inside this repository.

The requirement this investigation informed was split in two on 2026-09-20, after
the collection was saved: `FR-READABILITY.LANGUAGE` now covers chat language
integrity alone, and the new `FR-READABILITY.READER-CONTEXT` covers explanations
that a reader who has not seen the session can follow. The documents below still
describe the two defects under the single earlier clause. Two controls run after
that split are recorded in [post-closure controls](post-closure-controls.md);
their run directories are local and gitignored, so the verdicts and transcripts
they cite are saved as JSON beside the other evidence.

This collection is a snapshot. Canonical project files remain in their original locations. Running the scenario snapshot requires the FlowAI repository and its normal dependencies; the archive is not a standalone test runner. No credentials, environment files, installed dependencies, or unrelated session histories were copied.
