---
date: "2026-07-11"
status: to do
tags: [prompts, atoms, review, plan, prompt-engineering]
---
# Apply global-workspace paper findings to framework atoms

## Goal

Improve reasoning reliability of the framework's prompt atoms (`framework/atoms/`)
by aligning them with the empirically demonstrated limits of LLM internal
working memory — so that multi-lens review passes, long multi-phase atoms, and
prohibition-style rules stop silently degrading under context pressure.

## Overview

### Source

Anthropic, "Verbalizable Representations Form a Global Workspace in Language
Models" (Gurnee, Sofroniew, Lindsey et al., Transformer Circuits, 2026-07-06):
https://transformer-circuits.pub/2026/workspace/index.html

Key findings relevant to prompt authoring:

- LLMs maintain a small privileged "workspace" of ~25 concept slots (~6 for
  unrelated items) that mediates flexible reasoning; everything else is
  automatic processing. Chain-of-thought text functionally substitutes for this
  workspace (GSM8K survives workspace ablation only with explicit CoT).
- A topic switch evicts prior workspace contents within a few tokens; a rule
  stated early in a long prompt is only re-loaded if something at the point of
  use re-primes it.
- The model can hold two concepts simultaneously but fails multi-step
  computation while concurrently maintaining an unrelated task.
- "Don't think about X" instructions load X into the workspace almost as
  strongly as "think about X" (white-bear effect); suppression routinely fails.
- The question seen *before* reading a text determines which concepts get
  loaded into the workspace during reading; asked after, the relevant marking
  may never happen.

### Current state of the atoms (audit 2026-07-11)

- `atoms/review.md` Rule 3 mandates "two hats, one pass" — QA + lead engineer
  "in parallel, not sequentially", plus JiT catching-test synthesis interleaved
  in the same pass. This is exactly the concurrent-load pattern the paper shows
  to fail. Contrast: `maintenance` already delegates to 5 narrow single-bucket
  scan workers.
- Prohibition density: 10–20 `do not / never / avoid` constructions per atom
  (review.md: 20). Some are trigger guards (fine); some ban behavior without
  prescribing the positive alternative.
- `atoms/plan.md` is 24 KB with multi-phase structure; critical constraints
  live only in the global Rules block, far from the phase steps where they
  apply.
- What already matches the paper (keep, do not touch): task/rules placed before
  material reading; mandatory todo tracking and task-file persistence
  (externalized working memory); maintenance scan decomposition.

### Recommendations (from the 2026-07-11 session analysis)

1. **review.md**: de-parallelize the lenses — either sequential passes over the
   same diff, or subagent delegation per lens (precedent: Rule 14
   diff-specialist), or minimally an "enumerate all suspicions one line each
   BEFORE expanding any finding" step, so assessments computed during reading
   are verbalized before the next lens evicts them.
2. **All atoms**: audit prohibitions; every behavioral ban gets a paired
   positive prescription ("Do NOT audit the whole project (that is
   maintenance's job)" is the good existing pattern).
3. **Long atoms (plan.md first)**: repeat phase-critical constraints inline in
   the phase step where they fire, not only in the global Rules block.
4. **Prompt-authoring guidance** (`engineer-prompts-for-reasoning` /
   devtools skills): add the three principles above (question-before-material,
   positive phrasing, one lens per pass + constraint locality) as sourced
   rules citing the paper.

## Definition of Done

- `atoms/review.md` no longer requires holding multiple review lenses
  concurrently within a single reasoning pass; the chosen mechanism
  (sequential / subagent / enumerate-first) is explicit in the atom.
- Every `do not / never / avoid` rule in `framework/atoms/*.md` either is a
  trigger guard or is paired with a positive alternative.
- `atoms/plan.md` phase steps restate the constraints that apply to them.
- Prompt-authoring skill documents the three principles with a citation of the
  source paper.
- Existing acceptance tests / benchmark baseline pass unchanged
  (`deno task check`, relevant acceptance-tests); no atom loses existing
  behavior guarantees.
