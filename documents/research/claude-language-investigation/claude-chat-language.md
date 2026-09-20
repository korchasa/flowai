# Claude chat language: research and experimental boundaries

## Objective

Keep ordinary explanatory prose in the requested conversation language and explain internal names through their task-relevant meaning. Preserve useful exact identifiers, quotations, established loanwords, and explicitly requested foreign-language artifacts. These are distinct acceptance checks; Latin letters alone do not establish a defect.

## Research basis

- Anthropic recommends explicitly choosing the response language and identifies the system prompt as the most reliable location. Its reported multilingual knowledge scores are not measurements of language-mixing frequency. Source: [Multilingual support](https://platform.claude.com/docs/en/build-with-claude/multilingual-support), consulted 2026-09-20.
- Anthropic recommends a small, diverse set of representative examples instead of an expanding list of edge cases. This motivates testing positive examples from calendar and billing tasks while the acceptance fixture concerns delivery failures. It does not establish that examples will work for this Haiku task. Source: [Effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents).
- Marchisio et al. find language confusion across evaluated models and report only partial mitigation through examples and multilingual training. Complex prompts and sampling temperature affect the outcome. The paper does not validate a particular Claude Haiku instruction. Source: [Understanding and Mitigating Language Confusion in LLMs](https://aclanthology.org/2024.emnlp-main.380/).
- DeCRIM separates constraints, critique, and refinement. Its improvements concern an explicit pipeline with feedback, not a sentence asking a model to check itself. This motivates testing an independent draft editor as a distinct mechanism, while measuring added work and preserving factual accuracy. Source: [LLM Self-Correction with DeCRIM](https://aclanthology.org/2024.findings-emnlp.458/).

## Experimental interpretation

Previous full-template variants scored 0/3, 2/3, 0/3, 1/3, and 0/3 on the frozen source-prose scenario. These small samples do not establish long-run rates. A passing 2/3 runner threshold does not satisfy the task's all-three acceptance gate.

A minimal-template diagnostic included a unique Russian output marker. The actual Claude answer emitted the marker but still copied ordinary English phrases. This is behavioural evidence that the diagnostic instruction affected that run; it is not a capture of the original API request and does not prove delivery for every historical run. The marker is diagnostic only and must never ship.

Strategies are screened cheaply with one uncached run. A passing candidate must then survive repeated runs and the remaining cases. Screening failures are retained; a single screening pass is not acceptance. Queries, fixtures, judge criteria, and configured model selections remain frozen. Any minimal-template probe is diagnostic and cannot be shipped by discarding unrelated project requirements.

All experimental edits occur in the isolated `codex/claude-language-fix` worktree. The original checkout retains the restored baseline and previous evidence. The user explicitly authorized continued strategy exploration, overriding the earlier two-attempt stopping limit for this task.

## Independent controls

Language mixing, reader-context clarity, factual preservation, and editor invocation must be measured independently. A named editor can be available and its exact instruction delivered while the primary agent still skips delegation. Local request capture verified this availability and full root-template delivery, with a negative control excluding the root template.

An isolated editor removed mixing in some drafts but retained foreign glosses in another, and removed draft statements in a third. The unchanged judge accepted all outputs, including the retained glosses. This is evidence of a false acceptance outside the previously calibrated samples, not a successful fix. A positive requested-English-artifact control remained byte-identical.

Claude now documents a display transformation event, [MessageDisplay](https://code.claude.com/docs/en/hooks#messagedisplay). It can replace displayed assistant text before rendering, while original transcripts and model context remain unchanged. Installed CLI and pinned bridge support must be checked before adopting it; a Stop hook is a different, later mechanism. Display transformations would require acceptance evidence of the actually shown text rather than silently substituting an edited answer for the raw transcript.


The display-transformation hypothesis was tested without a real model: direct bundled Claude returned only the edited marker, but pinned bridge 0.68.0 exposed the original and then the edited marker. Both raw transcripts retained the original. This confirms the distinction between native display behaviour and the current acceptance transport. See the task's `claude-language-fix-evidence/evidence/message-display-probe/result.json`.

No mitigation was accepted. The final task handoff records all instruction-only screens, independent editor probes, judge disagreement, costs reported by the editors, restored product state, and the remaining directions. Failure of one mechanism does not eliminate the others.

A separate [failure analysis with five-whys chains](claude-language-failure-analysis.md) examines experimental decisions, evaluator gaps, rejected partial improvements, and remaining causal uncertainty.
