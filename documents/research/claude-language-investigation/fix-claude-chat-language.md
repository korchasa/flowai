---
date: 2026-09-20
status: in progress
implements:
  - FR-READABILITY
tags: [claude, instructions, acceptance-tests]
---

# Preserve chat language and explain source names

## Goal

Prevent unwanted language mixing and explanations that require the reader to know source labels or prior conversational context. Preserve useful exact identifiers and explicitly requested foreign-language artifacts.

## Overview

### Context

The user authorized a behavioural fix after the six-scenario acceptance study and explicitly requested subagents to reduce costs. Two bounded, read-only subagents review the cause and verification scope without receiving the full conversation.

### Current State

The source-prose scenario failed its language check in all three final baseline runs. Code and foreign-artifact cases each exposed mixing once; the interface case exposed an unexplained setting once. Russian-jargon and dialogue cases passed. Baseline evidence is in `claude-language-evidence/` beside the preceding `claude-language-acceptance.md` task. The current template SHA-256 was checked against `refined-inputs.json` before editing and matches the measured baseline exactly.

### Constraints

- Preserve the six queries, fixtures, judge criteria, and model settings. A product fix may use separate rules, a dedicated editor agent, or runtime integration; it must not weaken the measuring instrument.
- Use product template, agent, or runtime integration files, not this repository's read-only `AGENTS.md`. Keep the existing reader-context rule's intended coverage.
- Reuse the measured failing baseline; run source-prose three times first, then the other five authored cases. Do not run the entire template acceptance collection or install plugins.
- Judge scores must be checked against raw transcripts. Three successes are observed acceptance, not a long-run reliability guarantee.
- Existing unrelated missing `FR-MAINT-LANG` evidence remains a baseline check blocker; do not fabricate a requirement or change another task to conceal it.

## Definition of Done

- [x] FR-READABILITY: Confirm that the current template and frozen scenarios match the measured failing baseline before changing instructions.
  - Test: `python3 -c 'import json,hashlib,pathlib; p=pathlib.Path("documents/research/claude-language-investigation"); a=json.loads((p/"claude-language-evidence/refined-inputs.json").read_text()); b=json.loads((p/"claude-language-fix-evidence/inputs.json").read_text()); files=[f for f in a["files"] if f["path"]=="framework/core/assets/AGENTS.template.md"]+b["tests"]; assert all(hashlib.sha256(pathlib.Path(f["path"]).read_bytes()).hexdigest()==f["sha256"] for f in files)'`.
  - Evidence: the template matched the prior baseline exactly; all scenario modules, fixtures, and calibration samples remained unchanged throughout. After the unsuccessful experiments, the original template was restored and its SHA-256 matched again.
- [ ] FR-READABILITY: The source-prose acceptance case passes all checks in three uncached runs after the product change.
  - Test: `deno task acceptance-tests -i claude -f agents-rules-chat-source -n 3 --no-cache`.
  - Evidence: record all three checklist verdicts and raw replies; the unchanged baseline failed language 3/3.
- [ ] FR-READABILITY: The other five authored cases pass three uncached runs each, including real second turns and permitted foreign-language artifacts.
  - Test: run `deno task acceptance-tests -i claude -f agents-rules-chat-<suffix> -n 3 --no-cache` sequentially for `code`, `interface`, `jargon`, `dialogue`, and `exceptions`.
  - Evidence: inspect each verdict and raw transcript; distinguish remaining failures from threshold-level aggregate success.
- [ ] FR-READABILITY: Updated instructions and documentation pass the ordinary project checks, with any independent baseline blocker explicitly identified.
  - Test: `deno task check` using its standard check plan with optional local plugin installation disabled.
  - Evidence: retain check results, verify task format and document references, and report any unresolved failure instead of calling the whole repository green.

## Solution

1. Compare the template with measured baseline evidence; collect independent cause and regression-risk reviews from two short-context subagents.
2. Keep the shared Chat Output Style section as the attachment point. Clarify the language of prose, exact-name exceptions, and concrete explanation of settings. Evaluate language control independently of reader-context clarity. A dedicated editor and its invocation are separate hypotheses.
3. Run the unchanged source case three times. If it fails, inspect the raw reply and revise the instruction only for the demonstrated mechanism.
4. Run the remaining five authored cases sequentially and collect all subagent findings. Preserve run inputs, verdicts, and raw replies beside this task.
5. Update the requirement and design with the measured result, run ordinary checks without installing the uncommitted template, and hand off the full template sweep.

### STOP-ANALYSIS REPORT

The requested fix is not achieved. The original template, including the user's pre-existing reader-context edit, has been restored. No candidate was accepted, installed, or committed. The six frozen acceptance cases are unchanged.

| Candidate | Source case passes | Raw evidence |
| --- | --- | --- |
| Explicit language/meaning rule | 0/3 | `claude-language-fix-evidence/attempt-1-source.json` |
| Two checks before every reply | 2/3 | `claude-language-fix-evidence/attempt-2-source.json` |
| Narrower technical-term exception | 0/3 | `claude-language-fix-evidence/attempt-3-source.json` |

All nine responses preserved the required task facts. Mixing persisted: the second candidate's failed response retained `(review queue)`; the third also retained ordinary English parenthetical phrases. The 2/3 aggregate runner success is not a complete fix and must not be reported as one. The other five cases were not rerun because the primary gate never passed all three trials.

Diagnosis chain, with uncertainty preserved:

1. Why did the source case fail? The raw Russian explanations retain ordinary English phrases.
2. Why was this not an allowed exception? The phrases are prose glosses, not machine-readable identifiers or interface controls needed for the task.
3. Why might the model preserve them? A diagnostic continuation of the first failed session classified them as technical terms and interface labels. This is retrospective self-report, not proven causation.
4. Why did the explicit prohibition not settle the issue? The candidate rule combines preservation exceptions with translation requirements; the model's response shows over-broad exception classification. The narrower third wording still failed, so ambiguity alone is not an established sufficient explanation.
5. Why not keep rewriting? No tested candidate provides the required result. Instruction placement, attention to a large project context, and intrinsic response variance remain hypotheses. The bridge enables project settings, the correct file is present, and the diagnostic continuation quotes the candidate, but the original raw transcript does not expose its full system prompt.

Two short-context read-only subagents inspected the cause, proposed wording, selected economical checks, and reviewed exception risks. They made no file edits and launched no model tests. The parent ran only nine Claude acceptance sessions plus one successful diagnostic continuation; unchanged judge calibration was not repeated. The first direct continuation omitted the project environment and failed authentication; retrying with the same environment as the acceptance runner succeeded. That authentication failure is not a behavioural observation.

The rendered Claude instruction file passed the engineer-rule validator. Standard project checks passed all 1,050 ordinary tests, formatting, lint, and document checks except the pre-existing missing `FR-MAINT-LANG` task reference. Log: `/private/tmp/claude-language-fix-check.log`. Full template acceptance remains unrun.

The repository's `AGENTS.md`, Diagnosing Failures item 5, says: "Second fix attempt failed — STOP." This limit was missed until after the third attempt; work stopped and the template was restored. The retained files contain all three templates, raw responses, unchanged input hashes, and the successful diagnostic reply.

### Authorized second diagnostic cycle

The user explicitly authorized another cycle after the stop report. One subagent interviews the remaining two failing sessions from candidate 1 and compares all three retrospective accounts. These accounts are hypotheses, not proof of causation.

Candidate 4 changes placement only relative to candidate 2: its complete Chat Output Style block is moved verbatim to the beginning of the template. All remaining template text matches the baseline. This tests whether early placement improves attention while holding the rule wording fixed. The existing 2/3 result for candidate 2 is the comparison; no result is inferred before the new uncached runs complete. This cycle allows at most two failed candidates before another stop, unless the user changes that instruction.

Candidate 4 passed 1/3 source trials. All three factual checks passed. The two raw language failures include `Контрольная точка rollout` and unnecessary English parenthetical glosses. Early placement alone did not produce the required result. Evidence: `claude-language-fix-evidence/attempt-4-source.json` and `attempt-4-template.txt`.

Candidate 5 retained early placement but changed the instruction mechanism: compose a complete meaning-based explanation in the conversation language first, then add only necessary exact identifiers. It removed the post-draft self-check as the main mechanism. The shorter text preserved quoted evidence, proper names, conventional loanwords, and explicitly requested foreign-language artifacts. It passed 0/3 unchanged source trials: every response mixed languages, and one also omitted the condition that the pre-activation notification must come from a test failure. Evidence: `claude-language-fix-evidence/attempt-5-source.json` and `attempt-5-template.txt`.

The subagent's first two interview commands omitted `set -a` before sourcing `.env`; the child processes therefore lacked the same exported environment used by the successful parent interview and acceptance runner. Their authentication errors are invocation failures, not evidence that the configured account has lost access. The commands were retried with the correct export, without changing credentials or bypassing guards.

The second authorized cycle reached its two-failed-candidate limit. The product fix is still unachieved. The original template was restored from the preserved baseline and checked by SHA-256; all six scenario modules, fixtures, and calibration samples remain unchanged. The other five acceptance cases were not rerun, because neither candidate passed the primary case. No installation or commit occurred.

Both corrected diagnostic continuations succeeded. The three interviews consistently describe treating ordinary source phrases as technical terms or potential configuration identifiers. One proposed correction still adds the prohibited English gloss in parentheses. However, interviews 2 and 3 each attribute a phrase to their earlier answer that the raw answer does not contain. This limits their evidentiary value: they support an exception-classification hypothesis, not a verified account of the original internal decision. Evidence: `interview-attempt-1.json`, `interview-attempt-1-run-2.json`, and `interview-attempt-1-run-3.json` in the evidence directory. The two new successful continuations report a combined list-price cost of USD 0.084846; this is not the cost of the whole cycle, because acceptance agent usage is not measured by the runner.

The second cycle used six actual source acceptance runs and two successful diagnostic continuations. It did not repeat the unchanged judge calibration or run the other five cases after the primary failure. Final task-format, SRS evidence, SALP, and whitespace checks passed. Ordinary tests were not repeated after restoring the byte-identical template; their prior 1,050-pass result and the independent traceability blocker remain applicable.

A next investigation, if authorized, should verify whether the original request actually contains the project instruction text and test a minimal language rule in isolation from the large template. The current evidence does not justify declaring all instruction-based fixes impossible or recommending another broad rewrite as a proven fix. No further paid run or product edit was started after the two failures in this cycle.

### Authorized isolated-worktree strategy search

The user requested a separate git worktree and continued testing until success, explicitly overriding the earlier two-attempt limit. Work moved to `codex/claude-language-fix` at `82eba4e961ca22edf52a9f1e5b3ce8f89c9af117`; it was not behind `main`. Scoped uncommitted scenarios, documentation and evidence were copied into that tree, and pinned ACP bridges were installed there. The original checkout is not edited by this phase.

Research and inference boundaries are recorded in `documents/research/claude-chat-language.md`. The minimal diagnostic emitted its unique marker but failed language control. Candidate 6 added three positive examples outside the fixture domain and failed its first screening run. Candidate 7 failed language control and did not invoke any subagent. It therefore tested a delegation instruction, not the effectiveness of an independent editor. Candidate 8 added contrastive examples: its first screening run passed, but all three confirmation runs failed language while preserving facts. Evidence: `claude-language-fix-evidence/attempt-8-confirm.json`. Neither diagnostic markers nor a truncated project template are candidates for release.

The user explicitly clarified that language mixing and overly complex explanations may use different remedies, including a dedicated subagent. Candidate 9 restores the baseline reader-context rule and adds a named language editor plus a pre-send delegation rule. The frozen source scenario is the existing behavioural RED; a successful run must also show an actual editor tool call before user-facing output. Stop-time correction is insufficient: already streamed defective text remains visible and is still scored. The editor must preserve facts and exact useful strings while changing only language mixing. No general improvement is claimed from a single screening success.

Candidate 9 failed the unchanged source scenario and made no editor call (raw tools: Bash, Read). The dedicated agent file was present in the sandbox. This is an invocation failure, not evidence against independent editing. Evidence: `claude-language-fix-evidence/attempt-9-source.json`. Two independent probes now distinguish request delivery from editing capability: a local-only request capture, and direct editor runs on preserved failed drafts plus a protected foreign-artifact control. Neither probe substitutes for end-to-end acceptance.

Candidate 10 is an independent reader-context experiment, not a language fix. It restores the baseline template and adds an object/event/change/timing check for settings actually mentioned. The baseline interface run left the effect of the overlap setting unexplained behind an abstract benefit. The unchanged interface scenario tests this candidate. The experimental language-editor definition remains available, but the template does not require or mention it in this experiment; raw calls will show whether it was used.

Candidate 10 passed its first interface run but only 1/3 confirmation runs. One repeated the unexplained transition-period defect; another misstated team-wide scope. Evidence: `claude-language-fix-evidence/attempt-10-interface-confirm.json`. Its additional instruction is not accepted. Candidate 11 tests role-based routing at the start of the template with the same editor definition; this isolates invocation from editor quality. Local request capture verified exact complete candidate-9 delivery and actual editor availability, with a without-root negative control. Evidence: `claude-language-fix-evidence/evidence/request-capture.json`.

Candidate 11 passed the language/fact checklist in one screening run, but the raw transcript contains only Read and no editor call. It therefore fails the proposed routing mechanism despite its green behavioural verdict. The isolated editor experiment made four editor calls and four judge calls: one source draft retained four foreign glosses; another lost draft statements; the protected English-artifact control remained byte-identical. All four judge verdicts were positive, so one language verdict is a demonstrated false acceptance and the source checklist does not cover full draft-preservation. Evidence: `claude-language-fix-evidence/editor-isolated/results.json` and `observations.json`. The six original scenarios are still unchanged; raw-text review remains mandatory.

The user corrected the search balance: instruction-only strategies must continue alongside runtime editing, not be abandoned after earlier failures. Candidate 12 restores the baseline reader rule and tests a short Russian-language enforcement clause, conditional on Russian being the selected conversation language. It has no delegation requirement. Further independent instruction families are a reader-language constraint and a concrete foreign-gloss removal pass. The runtime editor remains a parallel investigation, not the sole remedy.

Candidate 12 failed its screening run on the invented foreign gloss `manual review queue`, while preserving task facts. Candidate 13 tests an audience constraint: the reader knows only the selected conversation language, while a requested foreign-language artifact has a separate audience. It retains proper-name and exact-identifier exceptions and leaves the baseline clarity rule intact. Both are instruction-only strategies; no delegation is required.

Candidate 13 failed its screening run on ordinary English glosses and a mixed-language heading, with all task facts preserved. Candidate 14 tests an evidence-backed exact-string inventory before drafting, rather than a broad technical-term exception. Source headings and ordinary technical prose do not establish a code identifier or interface label. Protected names must not be invented or expanded.

Candidate 14 failed its first source trial on redundant foreign glosses, with facts preserved. Candidate 15 changes detection completeness: inspect every Latin-letter span, including parentheses, headings, backticks, and hybrid words; classify each against the unchanged exception categories, translate ordinary prose, remove redundant glosses, and scan again. Latin letters are not automatically errors.


### Saved handoff at the user's token-budget stop

The user requested preservation and conclusions with 3% of the session budget remaining. This is a stop of the current experiment run, not acceptance of a fix. Both instruction-only and runtime/editor strategies remain in scope. No further paid runs should be inferred from this record.

**Result:** no stable fix has been verified. The product template was restored byte-for-byte from `claude-language-fix-evidence/worktree-baseline-template.txt`, preserving the pre-existing reader-context rule. The experimental agent was removed from the product; its exact definition remains in `attempt-9-agent.txt`. The 18 frozen scenario/fixture/calibration files are unchanged. Nothing was installed, committed, or pushed. The original checkout was not changed by this isolated-worktree phase.

| Strategy | Observed result | Evidence in `claude-language-fix-evidence/` |
| --- | --- | --- |
| Minimal template plus marker | Marker obeyed; language failed | `probe-minimal.json` |
| Candidate 6: positive examples | 0/1 source | `attempt-6-source.json` |
| Candidate 7: generic delegation | 0/1 source; no subagent called | `attempt-7-source.json` |
| Candidate 8: contrastive examples | Screening 1/1, confirmation 0/3 | `attempt-8-screen.json`, `attempt-8-confirm.json` |
| Candidate 9: named editor | 0/1 source; no subagent called | `attempt-9-source.json` |
| Candidate 10: object/event/change/timing | Interface screening 1/1, confirmation 1/3 | `attempt-10-interface-screen.json`, `attempt-10-interface-confirm.json` |
| Candidate 11: coordinator role | Source 1/1, but editor never called | `attempt-11-source.json` |
| Candidate 12: Russian-language rule | 0/1 source | `attempt-12-source.json` |
| Candidate 13: reader knows only target language | 0/1 source | `attempt-13-source.json` |
| Candidate 14: grounded exact-string exceptions | 0/1 source | `attempt-14-source.json` |
| Candidate 15: complete Latin-span inspection | 0/1 source | `attempt-15-source.json` |

Candidates 1–5 and their failures are preserved above. `experiment-index.json` indexes collected verdicts and actual tools. These small, adaptively selected samples are not population failure-rate estimates. A green screening verdict is not acceptance; candidate 11 also failed its proposed invocation mechanism.

**Independent findings:**

- Full candidate-9 instructions and the available editor reached the outgoing model request. A local-only capture found the exact complete rendered template, its tail, both rules, and editor availability; the without-root control removed the root instructions. This rules out truncation/non-delivery in the tested path, not every historical run. Evidence: `evidence/request-capture.json`.
- Direct Haiku editing used four editor calls and four unchanged-judge calls. One draft retained four foreign glosses; another lost draft statements; the English-artifact control stayed byte-identical. The judge accepted all four, including one demonstrably defective language output. Raw inspection therefore remains mandatory. The existing calibration did not cover that particular ambiguity. Evidence: `editor-isolated/results.json`, `editor-isolated/observations.json`.
- Direct Sonnet editing used the exact same prompt/input for two controls, without a judge. It removed four glosses but retained `retry` and removed two Russian explanations; the protected artifact remained byte-identical. Stronger editing alone did not prove a faithful language-only operation. Evidence: `editor-isolated-sonnet/results.json`, `editor-isolated-sonnet/observations.json`.
- Haiku's four editor calls reported USD 0.094601. The paired two-call comparison was Sonnet USD 0.03963 versus Haiku USD 0.035833. These are reported editor costs only, not total task cost. Acceptance agent usage is unmeasured; runner zero-dollar counters must not be used as billing evidence.
- Native `MessageDisplay` is implemented in local Claude 2.1.261 and the bridge's Claude 2.1.232 / SDK 0.3.232. A free localhost synthetic-protocol probe showed direct output contains only the edited marker, while bridge 0.68.0 emits original followed by edited. Both raw transcripts retain the original. This is an actual transport limitation, not an editor failure. Evidence: `evidence/message-display-probe/result.json`; official reference: https://code.claude.com/docs/en/hooks#messagedisplay. Guarded runs used no real model or external network.

**Conclusions and continuation:**

1. Treat language mixing and reader-context complexity as separate requirements. Neither needs to share a mechanism with the other.
2. Continue instruction-only experiments. Prior failures do not establish impossibility. Untested directions include stronger lexical constraints with protected exceptions, a concise native-writing contract, an independently loaded language rule, and an explicit mechanical draft check. Keep the fixed cases and preserve failed runs.
3. Continue runtime editing in parallel. Do not call an ignored delegation instruction a tested editor pipeline. Native display editing has a demonstrated integration point, but the current bridge must stop exposing original partial text before it can verify that solution end to end.
4. Test editing fidelity independently of task-fact coverage. A source checklist can pass while an editor removes other draft statements. Separate detection, editing, invocation, and transport observations.
5. Address the newly observed judge false acceptance with retained counterexamples before claiming stable automatic detection. Do not weaken exception criteria or count a contradicted verdict as success.
6. No new candidate merits the remaining five-case sweep yet. Once one passes repeated source trials with raw-text review, run all six authored cases and the relevant language/identifier controls. The full unrelated template sweep remains deferred.

The previous ordinary-check result (1,050 tests passed, independent pre-existing missing FR-MAINT-LANG reference) is historical and is not a fresh full check of these added evidence files. Final lightweight checks are recorded separately; the repository must not be described as wholly green.


Final preservation checks: the template hash matches the saved baseline; all 18 frozen input files match their recorded hashes; `git diff --check` passes. Raw editor Markdown exports were renamed to `.txt` without changing contents so the task-format scanner does not treat them as task plans. Their original names and preserved locations are listed in `claude-language-fix-evidence/evidence-relocations.json`; historical metadata may retain the original names.

The final read-only upstream inspection found official bridge 0.79.0 (Agent SDK 0.3.274) still excludes a user override of `includePartialMessages` and forces it on. Its release notes do not claim a MessageDisplay fix. `emitRawSDKMessages` adds evidence alongside the ordinary stream and does not itself suppress original deltas. This is source inspection, not a runtime test of bundled Claude 2.1.274; that runtime remains untested. Sources: https://github.com/agentclientprotocol/claude-agent-acp/releases/tag/v0.79.0 and https://github.com/agentclientprotocol/claude-agent-acp/blob/v0.79.0/src/acp-agent.ts (option contract near line 1133; query options near line 7751). No bridge upgrade or patch was made.

Final task-format validation passed with no warnings after archival filename cleanup. Validation and restored-state evidence: `claude-language-fix-evidence/final-state.json`.
