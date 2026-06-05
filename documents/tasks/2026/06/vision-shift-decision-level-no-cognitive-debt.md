---
date: 2026-06-05
status: done
tags: [vision, requirements, paradigm-shift]
implements:
  - FR-DECISION-GATE
  - FR-UPWARD-NARRATION
  - FR-AI-CODE-REVIEW
  - FR-DIFF-OPTIONAL
---
# Vision shift: human reviews decisions (not code), framework fights cognitive debt

## Goal

Realign the framework with the revised vision (already written into `AGENTS.md` §Project Vision and `README.md`). Business value: remove the human's obligation to read code, moving the human's authority *up* to the decision level, while actively preventing **cognitive (mental) debt**. The vision prose is done; the requirements (SRS), design (SDS), and affected workflow primitives are NOT yet aligned — this task closes that gap through the normal SRS→SDS→Acceptance-TDD flow.

## Overview

### Context

User directive (2026-06-05):
- The human should NOT review the code itself, but MUST define and review business decisions, architecture, and key project decisions.
- The human is the **initiator of every decision above the level of individual classes/methods**.
- The agent must communicate with the human in terms of requirements AND classes/methods — **without forcing the human into their code**.
- The framework must prevent and help fight **cognitive (mental) debt**.
- Diff-level review model chosen: **B** — diff review stays available but **optional**, not a mandatory barrier.

Observed baseline (survey of ~20 recent `~/.claude/` sessions): work is dominated by code-level engagement — ACP/HITL debugging, security-review of diffs, plan generation, "разобраться что не так с реализацией". This is exactly the code-level load the new vision removes. Today's primitives assume human-in-the-diff.

Vision already updated (do NOT redo):
- `AGENTS.md` §Project Vision — Vision Statement, Problem Statement (cognitive debt), Solution, Risks, Definitions.
- `README.md` — tagline, "Assisted Engineering Paradigm", "Division of responsibility", control flow, "supervised loop", "Key Principles" #1.

### Current State

Primitives built on the old "human inspects every diff" principle and now contradicting the new vision:
- `framework/*/commands/review/` + `review-and-commit/` — framed as helping a *human* code-reviewer. New model: AI owns code review; human reviews decision-level narration.
- The "supervised loop" semantics (plan → execute → human watches diffs → commit).
- Any skill/agent prose asserting "human inspects every diff" / "no unsupervised changes" at diff granularity.
- SRS `documents/requirements.md` — no FR encodes: (a) decision-level human gate above class/method line, (b) upward class/method narration, (c) cognitive-debt prevention gate, (d) optional diff review.
- SDS `documents/design.md` — no component describes the upward-narration / decision-surfacing mechanism.

### Constraints

- Follow SRS→SDS→implement order (AGENTS.md). New behavior = new/updated FR with a runnable `**Acceptance:**` reference BEFORE editing primitives.
- Every changed primitive (skill/command/agent) needs Acceptance Test TDD (RED→GREEN→REFACTOR→CHECK). Full sweep deferred to user.
- Universal across IDEs (Cursor, Claude Code, OpenCode, Codex) — no IDE-specific tool names.
- Model B is fixed: do NOT remove diff review, make it optional.
- "Above class/method level" is the decision boundary: human initiates/approves above it; AI is trusted (execution + AI code review) below it.

## Definition of Done

> FRs below are proposed IDs to be created during this task; each needs an `**Acceptance:**` reference (benchmark scenario) before its primitive is edited. Mark `[x]` only after the evidence command passes.

- [x] FR-DECISION-GATE: human gate sits at decision level (above class/method), not diff level; agent surfaces every above-class/method decision for human initiation/approval before implementing.
  - Test: `Benchmark: implement-decision-gate`
  - Evidence: `deno task acceptance-tests -f implement-decision-gate`
- [x] FR-UPWARD-NARRATION (absorbs former FR-COGNITIVE-DEBT-GUARD): agent narrates work to the human in requirements + class/method terms (names, responsibilities, relationships) in the CHAT SUMMARY, never requiring the human to read implementation code; every above-class/method decision must appear in that summary (completeness = anti-cognitive-debt). Decided 2026-06-05: anti-debt target is chat-summary completeness, NOT doc currency.
  - Test: `Benchmark: implement-upward-narration`
  - Evidence: `deno task acceptance-tests -f implement-upward-narration`
- [x] FR-AI-CODE-REVIEW: code review is owned by the AI; the human-facing review step reports a decision-level verdict, not a diff walk-through; heavy diff reading is delegated to the existing `diff-specialist` subagent (Q3 hybrid).
  - Test: `Benchmark: review-decision-level-verdict`
  - Evidence: `deno task acceptance-tests -f review-decision-level-verdict`
- [x] FR-DIFF-OPTIONAL: diff-level review is offered but optional — the workflow does not block on human diff inspection (model B). Shares the `review-decision-level-verdict` scenario (distinct checklist item — no near-duplicate).
  - Test: `Benchmark: review-decision-level-verdict`
  - Evidence: `deno task acceptance-tests -f review-decision-level-verdict`
- [x] SRS updated: FRs above added with `**Acceptance:**` references; `deno task check` (check-fr-coverage, check-srs-evidence) green.
  - Evidence: `deno task check`
- [x] SDS updated: component(s) for upward-narration + decision-surfacing + cognitive-debt gate; traceable to the new FRs.
  - Evidence: `deno task check`
- [x] No stale contradiction: grep shows no remaining "inspects every diff" / "you watch the diffs" / diff-mandatory wording in framework primitives.
  - Evidence: `grep -rni "inspect.*every diff\|watch the diffs\|review.*each diff" framework/ README.md AGENTS.md` returns only optional-framed matches

## Solution

### Locked decisions (2026-06-05, user-selected)

- **Audience:** flowai *users* — rule must ship to user IDEs (not just dev-`AGENTS.md`).
- **Q1 mechanism = E (hybrid):** rule lives in the shipped `framework/core/assets/AGENTS.template.md` (broad, always-on) AND is reinforced in the `implement` + `review` atoms (strong in-the-moment, benchmark-testable).
- **Q2 = merge:** former `FR-COGNITIVE-DEBT-GUARD` is absorbed into `FR-UPWARD-NARRATION`. Anti-debt mechanism = **completeness of the chat summary** the user reads (every above-class/method decision present), NOT doc currency, NOT a static script (a script cannot inspect chat). Enforced behaviorally by the narration benchmark.
- **Q3 = hybrid:** `review` stays a skill; its OUTPUT is reframed to a decision-level verdict; heavy diff reading is delegated to the existing `diff-specialist` subagent so line-level churn stays out of the human-visible context.
- **Sequencing:** all 4 FRs in one task, ordered SRS → SDS → AGENTS.template → per-primitive Acceptance-TDD.

### FR set (4)

- **FR-DECISION-GATE** — human gate at decision level; agent surfaces every above-class/method decision for approval *before* implementing.
- **FR-UPWARD-NARRATION** — agent narrates in requirements + class/method terms in the chat summary; every above-class/method decision appears there; never requires the human to read code. (Absorbs debt-guard: completeness = no silent above-class/method decision.)
- **FR-AI-CODE-REVIEW** — AI owns code review; human-facing review = decision-level verdict (not diff walk-through); heavy diff reading delegated to `diff-specialist`.
- **FR-DIFF-OPTIONAL** — diff inspection offered, non-blocking (Model B).

### Scenario map (3 new; no near-duplicate)

- `implement-decision-gate` → FR-DECISION-GATE (primitive: `implement`).
- `implement-upward-narration` → FR-UPWARD-NARRATION (primitive: `implement`).
- `review-decision-level-verdict` → FR-AI-CODE-REVIEW **and** FR-DIFF-OPTIONAL (primitive: `review`; one scenario, distinct checklist items — both share the verdict-not-diff-walk execution path, so per AGENTS.md "grep before near-duplicate" they collapse to one file).

### Steps

1. **SRS** (`documents/requirements.md`): add 4 `### FR-...` sections under §3, each `[ ]`, each with `**Acceptance verified by acceptance tests:** ` + backticked scenario id(s) above. `deno task check` green.
2. **SDS** (`documents/design.md`): add a component "Decision-Level Engagement Model" — (a) decision gate above class/method, (b) upward-narration contract (chat-summary completeness), (c) AI-owned review + optional diff + diff-specialist delegation. Trace to the 4 FRs. `deno task check` green.
3. **AGENTS.template.md** (shipped): add a short "Decision-Level Engagement" rules block — human owns above-class/method decisions; agent surfaces them before implementing; agent narrates upward in class/method terms in chat; AI owns code review; diff review optional (Model B). Universal wording (no IDE-specific tool names).
4. **Acceptance-TDD — `implement`** (`framework/atoms/implement.md`):
   - Smoke: run an existing `implement` scenario (`implement-tdd-cycle-completes`) to confirm infra.
   - RED: author `acceptance-tests/decision-gate/` (id `implement-decision-gate`) + `acceptance-tests/upward-narration/` (id `implement-upward-narration`); run → MUST fail on current atom.
   - GREEN: edit `framework/atoms/implement.md` (add decision-gate surfacing rule + upward-narration final step); regenerate (`deno run -A scripts/generate-skill-composites.ts --write`); run → pass.
   - REFACTOR: tighten; re-run.
5. **Acceptance-TDD — `review`** (`framework/atoms/review.md`):
   - Smoke: run an existing `review` scenario (`review-clean-approve`).
   - RED: author `acceptance-tests/decision-level-verdict/` (id `review-decision-level-verdict`) — checklist: verdict framed at decision level (no required human diff-read), diff inspection offered as optional/non-blocking, heavy diff reading delegated to `diff-specialist`. Run → MUST fail.
   - GREEN: edit `framework/atoms/review.md` (reframe output to decision-level verdict + delegate diff reading to `diff-specialist` + optional-diff framing, Model B); regenerate; run → pass.
   - REFACTOR: tighten; re-run.
6. **Final**: `deno task check` green; DoD grep (`inspect.*every diff|watch the diffs|review.*each diff`) returns only optional-framed matches; mark each FR/DoD `[x]` only after its scenario passes. Full acceptance sweep (`deno task acceptance-tests -f review` and `-f implement`) = CHECK phase, HANDED OFF to user.

### Risks

- Editing atoms requires regenerating skills — the generated `SKILL.md` is a gitignored build artefact; never hand-edit, always run the generator.
- `diff-specialist` delegation in `review` must remain optional-friendly across IDEs (subagent config differs; CLI translates) — keep the instruction generic ("delegate diff analysis to a diff-analysis subagent if available").
