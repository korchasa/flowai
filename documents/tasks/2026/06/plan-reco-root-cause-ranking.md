---
date: "2026-06-30"
status: done
implements: [FR-PLAN-VARIANT-ARCHETYPES]
tags: [plan-skill, recommendation, root-cause, swe-bench, finding]
related_tasks: [2026/06/review-run-existing-tests.md]
---
# Plan recommendation must rank root-cause fidelity above diff size

## Goal

Make the `plan` skill recommend the variant that fixes the NAMED root cause,
not the smallest/lowest-risk symptom patch. This is the single highest-value
lever surfaced by the SWE-bench A/B: with the human gate emulated (operator takes
the recommendation), a mis-ranked recommendation deterministically ships the
wrong fix.

## Overview

### Context

From the SWE-bench Verified run (documents/benchmarks/swe-verified-2026-06-30.md,
breakdown #2). On django__django-14792 the agent diagnosed the root cause
correctly and even listed the gold fix as "Variant 2: architecturally correct —
fix `_get_timezone_name`". It returned to that variant four times calling it
"simpler and safer", then talked itself out citing risk ("`_get_timezone_name`
is used in templates") and RECOMMENDED Variant 1 (the backend symptom fix in
`db/backends/*/operations.py`). The risk was unfounded — the gold fix's
`or str(timezone)` tail preserves the template behaviour it feared breaking — but
the agent never checked the callers before down-ranking the root fix. The
emulated gate took the recommendation → symptom fix → unresolved.

This is exactly the judgment a real human on the gate would exercise; the value
of flowai is that gate, and a mis-ranked recommendation defeats it.

### Current State

- `framework/atoms/plan.md` (→ `framework/core/skills/plan/SKILL.md`): step 4
  presents variants with Pros/Cons/Risks and a recommendation. FR-PLAN-VARIANT-
  ARCHETYPES requires three archetypes for non-obvious tasks but does NOT
  constrain HOW the recommendation is ranked — "smallest diff / least risk" can
  win over "fixes the named root cause".
- No requirement to verify a cited risk (e.g. "used in templates") against actual
  callers before using it to reject the root-cause variant.

### Constraints

- Workflow-primitive change (plan skill) with benchmark coverage → Acceptance-
  Test TDD (RED scenario first). Surface ≥2 variants before editing (done below).
- Must not regress normal human-in-the-loop planning: the human still chooses;
  this only changes how the AI RANKS and JUSTIFIES its recommendation.
- Keep the QA-FORMAT exemption for variant analysis intact.

## Variants

### Variant A — Recommendation-ranking rubric (text/rubric in plan.md) [recommended]
Add an explicit ranking rule to step 4: when variants differ in root-cause
fidelity, rank "fixes the named root cause / matches the issue's own causal
description" ABOVE "smallest diff" and "lowest speculative risk". The
recommendation MUST (a) name the root cause it addresses, (b) state why the
chosen variant fixes THAT cause, and (c) if a root-cause variant exists but is
not recommended, justify the rejection with EVIDENCE (callers/usages actually
inspected), not a speculative "might break X".
- Pros: directly targets the observed failure; localized text change; testable
  via a benchmark scenario.
- Cons: relies on the model honouring a rubric; no structural enforcement.
- Risks: low — additive guidance.

### Variant B — Forced root-cause-rejection justification (lighter)
Do not mandate ranking; only require that IF a root-cause variant is present and
NOT recommended, the reco must explicitly state the evidence-backed reason for
rejecting it (callers checked). Leaves the ranking to the model otherwise.
- Pros: minimal; preserves model freedom.
- Cons: weaker — allows the model to simply not surface a root-cause variant and
  avoid the justification entirely.
- Risks: low; may under-fix the observed case.

### Variant C — Structural diagnose→variant split
Restructure step 4: a diagnosis sub-step names the root-cause LOCATION explicitly,
then the variant set MUST include a "fix at the named root location" option,
flagged as the default recommendation unless the diagnosis is disproven.
- Pros: strongest enforcement; the root fix is always on the table and defaults
  to recommended.
- Cons: larger skill change; risks over-constraining genuinely
  architecture-level tasks where the "root" is debatable.
- Risks: medium — could mis-fire when the root is not a single location.

## Definition of Done

(Filled after variant selection. Each item will pair FR + acceptance tuple.)

- [x] FR-PLAN-VARIANT-ARCHETYPES: the plan recommendation ranks root-cause
      fidelity above diff size and justifies any rejection of a root-cause
      variant with inspected-caller evidence. Implemented as a ranking rule in
      `framework/atoms/plan.md` step 4 (regenerated into `plan` + `ship`).
  - Test: `Benchmark: plan-recommends-root-over-symptom` (regression-guard)
  - Evidence: `deno task acceptance-tests -f plan-recommends-root-over-symptom`

### RED-first waiver (why the guard, not strict RED)

The scenario passes on both `claude-sonnet-4-6` and `claude-haiku-4-5` before
AND after the rule (3 runs). The SWE-bench django-14792 mis-ranking stems from
large-codebase caller-uncertainty: a small self-contained acceptance fixture
makes the root cause obvious and caller-impact a single cheap read, so any
capable model already recommends the root fix. An honest RED is unreachable in
this harness. User granted an explicit RED-first waiver (chose "apply as guard")
— the rule ships as defensive guidance; the scenario guards against future
regression of the ranking discipline. Documented in the SRS `[x]` note and the
scenario `mod.ts` header.

## Solution (Variant A — recommendation-ranking rubric)

1. **RED** — author benchmark scenario
   `framework/core/skills/plan/acceptance-tests/recommends-root-over-symptom/mod.ts`:
   an issue with a clearly named root cause AND a tempting smaller symptom fix
   elsewhere. Checklist (observable behaviour): the plan recommendation (a) names
   the root cause, (b) picks the variant that fixes it, OR (c) if it rejects the
   root-cause variant, cites inspected callers/usages as evidence (not a
   speculative risk). Run the scenario — it MUST fail on current `plan.md`.
2. **GREEN** — edit `framework/atoms/plan.md` step 4: add a ranking rule —
   "when variants differ in root-cause fidelity, rank 'fixes the named root
   cause / matches the issue's causal description' above 'smallest diff' and
   'lowest speculative risk'. The recommendation MUST name the root cause, state
   why the chosen variant fixes it, and justify any rejection of a root-cause
   variant with EVIDENCE (callers actually inspected)." Then regenerate the
   composite outputs: `deno run -A scripts/generate-skill-composites.ts --write`
   (plan is an atom consumed by `ship`/`ship-task`).
3. **REFACTOR** — tighten wording; keep the QA-FORMAT variant-analysis exemption.
4. **CHECK** — run the new scenario; hand off the full plan-primitive sweep
   (`deno task acceptance-tests -f plan`) to the user (many scenarios, hours).

Note: `plan.md` is a generator atom — edit the atom, never the generated
`framework/core/skills/plan/SKILL.md` directly (gitignored build artefact).
