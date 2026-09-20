---
date: 2026-09-20
status: in progress
implements:
  - FR-READABILITY
tags: [acceptance-tests, claude, language]
---

# Repeatable Claude acceptance scenarios for language and reader context

## Goal

Provide FlowAI acceptance tests that expose both unwanted language mixing and explanations that depend on context unavailable to the reader. Cover English source labels, code names, interface labels, Russian internal jargon, conversational carry-over, and legitimate uses of exact identifiers and other languages. The definition is in the user's second-brain article `knowledge/AI/concepts/language-drift.md`.

## Overview

### Context

The user authorized separate short scenarios plus one multi-turn conversation. These are acceptance tests, not the SWE-rebench benchmark. Claude Haiku with medium reasoning effort is the previously selected test model. The existing English-language `agents-rules-reader-context` scenario cannot establish compliance for Russian conversation.

### Current State

- A reader-context rule is already an uncommitted edit in `framework/core/assets/AGENTS.template.md`; preserve it throughout this task.
- The untracked previous scenario and its measurements belong to the preceding work; do not erase or reclassify them.
- The existing runner supports real Claude sessions and a model judge. Its interactive user emulator answers questions but does not unconditionally send follow-up turns.
- The previous scenario's judge criteria disagree about tolerated unexplained names. New criteria must state observable meanings and distinguish citations from unexplained concepts.

### Constraints

- Author and measure tests before changing any product instruction. This task first establishes the failure cases; a failing product result is useful evidence, not a reason to weaken the judge.
- Keep requests natural. Do not tell the tested agent how to pass, make it imitate a bad answer, or plant an instruction that requires the prohibited behaviour.
- Keep each case's fixture and criteria together so the existing scenario cache fingerprints both.
- Record language and comprehension separately. Preserve quoted source text, useful identifiers, and intentionally English deliverables as negative controls.
- Compare repeated judgments of fixed good/bad answers before attributing verdict changes to Claude.
- Three repeated observations are an initial reproducibility check, not proof of a 90–95 percent population success rate. Do not turn the user's earlier 5–10 percent tolerance into a different threshold silently.
- No product-rule edits, commits, global model changes, or full primitive acceptance sweep in this stage.

## Definition of Done

- [x] FR-READABILITY: A discoverable scenario set covers all six contexts, including a verified second conversation turn and permissible-language controls.
  - Test: `deno eval 'import {discoverScenarios} from "./scripts/acceptance-tests/lib/acceptance_discovery.ts"; const cases=(await discoverScenarios()).filter(s=>s.id.startsWith("agents-rules-chat-")); console.log(cases.map(s=>s.id)); if(cases.length!==6) Deno.exit(1);'` and scenario review.
  - Evidence: discovery returned an empty array and exit 1 before authoring, then exactly six IDs and exit 0 after authoring. `claude-language-evidence/refined-claude-runs.json` contains all 18 raw sessions; all three dialogue runs contain the real second user message and subsequent assistant handover.
- [x] FR-READABILITY: The same judge criteria distinguish predefined good and bad replies and give consistent repeated verdicts for each fixed reply.
  - Test: `deno test -A framework/core/acceptance-tests/agents-rules-chat-calibration/calibrate.ts -- acceptance-tests/runs/chat-calibration-new` (use a fresh output directory for every new run).
  - Evidence: final unchanged criteria for five cases passed 26 judgments in `claude-language-evidence/final-calibration.json`. The corrected exceptions criterion passed all six judgments in `claude-language-evidence/exceptions-calibration-green.json`. Together these are 16 fixed replies, each judged twice, with zero mismatches under the final criteria. Earlier results in the first file for the superseded exceptions criterion are historical, not part of this total.
- [x] FR-READABILITY: Each new scenario is measured three times on the configured Claude model without cached results, and each claimed reproduced defect is verified in raw assistant text.
  - Test: `deno task acceptance-tests -i claude -f agents-rules-chat- -n 3 --no-cache`.
  - Evidence: final-criteria results are in `claude-language-evidence/refined-claude-runs.json` for five unchanged scenarios and `claude-language-evidence/final-exceptions-runs.json` for the corrected exceptions scenario. The measurement record below classifies all six cases and quotes raw failures.
- [ ] FR-READABILITY: The test files pass the repository checks, and documentation describes the measured scope without claiming an instruction fix.
  - Test: `deno task check`.
  - Evidence: check result and any independent baseline blockers are recorded; pending product compliance remains pending.

## Solution

1. Run the existing reader-context scenario on Claude to verify the agent, judge, isolation and authentication before authoring new scenarios.
2. Add pending language/comprehension acceptance coverage to the requirements and describe the case boundaries in the design document.
3. Create six small, independently fingerprinted scenarios: English source prose; code meanings; interface decisions; Russian source jargon; conversational carry-over; language/identifier exceptions. The multi-turn case must request a genuine choice and verify the emulator reply and subsequent assistant answer.
4. For each rubric, store fixed acceptable and defective replies. Run these through the existing judge in an isolated home. Keep calibration separate from agent acceptance so canned replies never substitute for the tested Claude response.
5. Run each authored scenario on current instructions, inspect the transcript, and repeat the unchanged case. Preserve all failures and judge disagreements. Revise a case only for a documented mismatch between the intended problem and what the case measures.
6. Record the measured coverage and commands. The outcome is a reproducible failing acceptance set and honest coverage gaps, or a documented inability to reproduce; neither outcome establishes that the product instruction has been fixed.

### Verification record

- Existing judge unit tests: 5 passed, 0 failed before new cases were authored.
- Infrastructure smoke: `acceptance-tests/runs/2026-09-20T10-21-25/`, Claude `claude-haiku-4-5-20251001`, 13 tool calls in the raw JSONL and a complete answer. The summary's zero steps and absent agent tokens are instrumentation limitations, not proof that no agent ran. The older reader-context checklist failed on unexplained names.
- Initial restricted launch `2026-09-20T10-19-15` was terminated after judge startup failure and no Claude response; it is not a behavioural result. The successful smoke used the normal network-capable execution environment.
- First new source-prose probe: `acceptance-tests/runs/2026-09-20T10-28-31/`. Raw assistant answer contains `background delivery jobs` and `notification address` as redundant parenthetical translations. Language check failed; task facts passed.
- Full repository checks used `buildCheckPlan({syncPluginsLocal:false})` and the standard command runners, because this checkout's `AUTO_INSTALL_PLUGINS=true` would otherwise install the uncommitted product template into user-level plugins. All validation commands were retained; only the optional installation was omitted. 863 script tests and 187 framework tests passed. The sole check failure is the existing `maintenance-language-hygiene.md` reference to missing `FR-MAINT-LANG`; that task is unchanged, and the requirement is absent from `HEAD` too. No guard was bypassed.
- Full check log: `/private/tmp/flowai-chat-check-20260920.log` (temporary; the result above is the durable record).

### Instrument corrections

Initial calibration distinguished the supplied examples, but it did not prove that the criteria accepted every legitimate concise answer. The first 18 Claude runs exposed requirements to restate optional details. These are test-design errors, not evidence of Claude's language drift.

- The interface criterion initially required unsolicited information about future projects. A correct brief answer failed twice under that criterion. The corrected criterion requires a concrete one-project choice and its consequences; unused modes need not be explained.
- The dialogue criterion initially required an explicit statement that queued work is not deleted. The corrected criterion permits omission of that unrequested sentence but still rejects a false deletion claim.
- The language criterion explicitly permits established terms such as `email`; Latin letters alone are not evidence of unwanted mixing.
- The exceptions criterion initially required explaining an unused setting that disables repeats. A correct brief repair failed twice. Its replacement must require the cause and the selected repair, with accurate meanings for any optional alternatives the answer actually mentions.

Original rubrics, 18 original Claude transcripts, initial calibration, and both demonstrated false-positive checks are retained in `claude-language-evidence/`. Do not combine verdicts from different rubric versions into one claimed failure rate. Fixed replies calibrate the instrument; only real Claude sessions establish observed product behaviour.

**Redundant-gloss boundary, added after the fix attempt.** The isolated editor probe produced a Russian reply that still carried four parenthetical English glosses, and the unchanged judge passed `russian_prose` on it, classifying the gloss as a technical term. The same pattern is the dominant live failure: all three source runs failed on it. That reply is now a fixed negative control, `defective-redundant-gloss` in `agents-rules-chat-source/calibration.json`, copied byte-for-byte from `claude-language-fix-evidence/editor-isolated/source-1/edited.txt`.

- Reproduced on the unchanged criterion: both repeats passed the defective reply. Evidence: `claude-language-evidence/gloss-calibration-red.json`, judge `gpt-5.6-sol`, medium effort, temperature 0.
- Correction: the `russian_prose` description in all six scenarios now fails a parenthetical or appositive foreign rendering of wording already given in the reply's language, and limits the identifier exception to an exact string the reader must type, search for or click. This tightens detection and relaxes nothing.
- After the correction all 17 fixed replies matched their labels in both repeats, 34 judgments with zero mismatches, and no positive control flipped — including the exceptions case that protects a requested English artifact. Evidence: `claude-language-evidence/gloss-calibration-green.json`.
- Verdicts recorded before this edit were produced under the looser criterion. Do not pool them with later ones. The source-case failures below stand, because a tightened criterion cannot turn a failure into a pass. The passing rows were scored under the looser criterion and were not re-measured; a reply that carries a redundant gloss would now fail, so those rows are an upper bound on compliance, not a verified one.

### Measured result

Models: Claude `claude-haiku-4-5` with medium effort; raw responses identify `claude-haiku-4-5-20251001`. Judge: `gpt-5.6-sol`, medium effort, configured temperature 0. Product instructions were held unchanged, including the reader-context rule already present before this task. Inputs and template content are preserved in `claude-language-evidence/refined-inputs.json`; the final exceptions criterion is in `exceptions-calibration-green.json`.

Final-criteria observations comprise 18 uncached Claude sessions: 15 from `2026-09-20T10-38-58`, excluding its superseded exceptions measurements, plus three from `2026-09-20T10-46-16`.

| Scenario | Entire checklist passed | Interpretation |
| --- | --- | --- |
| `agents-rules-chat-source` | 0/3 | Repeated language mixing; task facts passed 3/3 |
| `agents-rules-chat-code` | 2/3 | One language-mixing failure; code and setting meanings passed 3/3 |
| `agents-rules-chat-interface` | 2/3 | One unexplained setting consequence; language passed 3/3 |
| `agents-rules-chat-jargon` | 3/3 | Passing coverage; no reproduced Russian-only opacity |
| `agents-rules-chat-dialogue` | 3/3 | All three had real second turns and understandable handovers |
| `agents-rules-chat-exceptions` | 2/3 | One foreign heading outside the requested English artifact; artifact and repair passed 3/3 |

Raw evidence supporting failures:

- Source runs 1–3 retain unnecessary English: `очередь проверки (review queue)`, `это gate для rollout`, and `адрес для уведомлений (notification address)`. These are prose, not necessary machine-readable identifiers.
- Code run 1 says `он требуется для summarization`. The separate meanings checks pass; do not describe this as failure to explain the two algorithms.
- Interface run 1 says `Grace Window — оставить по умолчанию (0 часов, если не нужна плавная смена ключей)`. It never explains that the setting controls how long the old key remains usable after replacement. This reproduces the opaque-interface explanation once, not consistently.
- Final exceptions run 3 labels the surrounding Russian section `Текст обращения в поддержку (English)`. The actual English support text is permitted and passed.

The runner reports a scenario as passing at a 2/3 threshold. That aggregate label does not mean all responses passed, and it is not the user's 5–10 percent error tolerance. The source case provides the strongest current starting point for a future instruction change. The other cases are regression coverage or intermittent reproductions. A stable reproduction of every language-drift subtype remains unestablished; this task does not redefine the defect to match only the observed source-case failures.

### Final verification and remaining work

- All six scenarios are discoverable. All seven TypeScript modules type-check. Formatting and lint checks pass.
- Final standard checks ran all 1,050 ordinary tests successfully (863 scripts, 187 framework). A temporary task-status mismatch introduced while updating this record was corrected; `deno run -A scripts/check-task-format.ts` then passed. The independent missing `FR-MAINT-LANG` reference remains the sole unresolved baseline blocker. Therefore the repository-check criterion stays unchecked.
- Final full check log: `/private/tmp/flowai-chat-final-check-20260920.log`. No plugins were installed, no product instructions changed, and no commits were made.
- Rerun the authored subset with `deno task acceptance-tests -i claude -f agents-rules-chat- -n 3 --no-cache`. For the next instruction experiment, begin with `-f agents-rules-chat-source`; keep the other cases as coverage. Calibration instructions are in `framework/core/acceptance-tests/agents-rules-chat-calibration/README.md`.
- General reproduction stability, a product instruction fix, and its subsequent acceptance verification remain separate work. Three observations do not establish long-run reliability.
