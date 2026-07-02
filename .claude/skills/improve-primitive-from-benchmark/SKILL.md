---
name: improve-primitive-from-benchmark
description: Fully autonomous improvement loop for flowai primitives — run the flowai SWE-bench arm, root-cause failures, generalize fixes beyond code, implement via Acceptance-Test TDD; gated by a critic subagent instead of the user. Use when asked to improve primitives from benchmark results or diagnose benchmark failures.
---

# Improve Primitive From Benchmark

## Overview

Dev-only loop for this repo. The SWE-bench A/B is a *measuring device* for flowai's real capability — assisted engineering on ANY complex task (code, infrastructure, non-IT). The loop: run the flowai arm → grade → root-cause every failure → **generalize** the fix so it is not benchmark overfitting → implement via Acceptance-Test TDD → re-measure and report honestly.

**Autonomy contract**: invoking this skill IS the user's standing authorization for the ENTIRE loop — primitive (atom) edits, acceptance-test runs including the full sweep for affected primitives, benchmark re-runs, and the report. Do NOT pause for user selection of variants, approval of fixes, or permission to run tests. The user audits through the printed Decision Log and the final report. This skill-level authorization supersedes the per-task "User Decision Gate" and "defer full sweep to the user" defaults from project instructions. The baseline arm is NOT re-run — reuse the most recent same-harness baseline from `documents/benchmarks/`; re-run baseline only when the harness itself changed (adapter, model, gate emulation).

## Rules

1. **Atoms, not artefacts**: fixes to `plan`/`implement`/`review` land in `framework/atoms/<name>.md`; generated `SKILL.md` files are gitignored build artefacts. Regenerate with `deno run -A scripts/generate-skill-composites.ts --write`.
2. **Critic instead of the user**: every decision that would normally go to the user (variant selection, fix wording, scope of primitive change) passes the Critic Protocol below instead. Self-select with printed rationale, then submit to the critic; proceed only after every objection is resolved.
3. **No user checkpoints**: the only legitimate stops are hard blockers — a safety guard fires (`system_health`, `process_watchdog`, pre-commit), the environment is missing (Docker down, `.venv-swebench` absent, auth), or the second fix attempt for the same failure fails → emit a STOP-ANALYSIS REPORT per project rules. Never stop to ask "which variant?" or "may I run X?".
4. **Decision Log**: print a running log in chat at each phase boundary — what was decided, why, what the critic objected to, how each objection was resolved (applied / rebutted-with-evidence). This is the audit trail replacing HITL.
5. **Honest reporting**: single-rep runs carry noise — report mechanisms ("instance X now goes root-cause and resolves"), never statistical claims. Corrections supersede prior reports; do not silently overwrite conclusions.
6. **No test-fitting the loop itself**: a fix derived while looking at gold patches is trained on the test. Declare it in the report; the real validation is unseen instances / the next run.
7. **Iteration caps**: per failing scenario max 2 RED→GREEN attempts (then STOP-ANALYSIS); per loop max 2 critic rework rounds per decision (a twice-repeated BLOCKING objection is a hard blocker, not a negotiation).

## Long-Run Safety (multi-hour / looped runs)

- **Preflight & keep-awake**: before Phase 1 — require Docker up, `.venv-swebench` present, ≥20 GB free disk (`df -h .`); run long commands under `caffeinate` (macOS) or confirm host sleep is off. Before any acceptance sweep, kill stale `deno test -A` leaks (>5 min at high CPU — known repo issue).
- **Disk hygiene**: sandboxes are full repo clones and dominate disk. After grading, delete `sandbox/` dirs of run dirs older than the current and previous run; keep predictions, transcripts, `_decision-log.md`, and reports.
- **Persistent Decision Log**: mirror every Decision Log entry to `scripts/benchmark/runs/<run-id>/_decision-log.md` (append-only). Chat context compacts over hours; the file is the durable audit trail and the resume point after compaction.
- **Checkpoint commits**: commit at each green phase boundary (root-cause aggregate, RED scenario, atom edit, final report). Prefixes `chore(bench):` / `docs(benchmark):` / `test(accept):` only. NEVER `feat:`/`fix:` and NEVER push to `main` autonomously — CI cuts a framework release on `feat:`/`fix:`; releasing stays a human decision. Work on a non-`main` branch; plain `git push` to that branch is fine.
- **Stage explicitly, never sweep**: the working tree is shared with parallel human/agent sessions. Stage ONLY the exact paths this loop authored (`git add <path> <path>`); `git add -A` / `-u` / `.` are forbidden. Before each commit, check `git status --short` — modified files the loop did not touch belong to someone else: leave them unstaged and note them in the Decision Log. (Incident: commit 6376c85a absorbed another session's uncommitted plan.md/requirements.md edits.)
- **Environment-failure detection**: ≥3 consecutive empty patches, auth errors, or quota/timeout failures across instances = ENVIRONMENT blocker, not a primitive failure — STOP-ANALYSIS instead of feeding them into Phase 3 classification.
- **Loop termination** (when this skill is invoked iteratively): STOP the loop and hand back to the user when (a) Phase 4 yields no fix candidate that survives the critic, or (b) the resolved count fails to improve for 2 consecutive iterations, or (c) the same atom would be edited a 3rd time across iterations — that is single-rep noise, needs human review. Announce which condition fired.

## Critic Protocol (subagent)

At each gate marked "CRITIC GATE" below, spawn a READ-ONLY subagent (e.g. a general-purpose/explore agent via the Task/Agent tool — no write tools needed) with:

- **Input**: the exact artifact under review (root-cause table, proposed fix wording, variant rationale, RED scenario text, atom diff) plus pointers to evidence (transcripts, gold patches, current atom text).
- **Role instruction**: "You are an adversarial reviewer. Your job is to REFUTE, not to approve. Attack specifically: (a) benchmark overfitting — wording that only helps 'GitHub issue with a hidden test' shapes; (b) attribution errors — fixes pinned on the wrong phase/primitive; (c) scope-invariant encoding — any wording that takes the scope choice away from the human; (d) code-centric phrasing that fails on infra/non-IT tasks; (e) training-on-test — rules that merely retro-fit the analyzed instances; (f) test-fitting in RED scenarios — checklist items that hint the expected answer. Return a numbered list of objections, each labeled BLOCKING or ADVISORY, each with concrete evidence or a concrete failure scenario. Return an empty list only if you genuinely cannot refute."
- **Triage**: for EACH objection print a verdict — **apply** (rework the artifact) or **rebut** (cite the evidence that defeats it; a bare "disagree" is not a rebuttal). ADVISORY objections may be deferred with one-line justification. BLOCKING objections MUST be applied or rebutted with evidence; after rework, re-submit to a FRESH critic subagent (max 2 rounds — Rule 7).
- Log the round in the Decision Log: objections count, applied/rebutted/deferred split.

## Phase 1 — Run the flowai arm

Run the Long-Run Safety preflight first. See [references/commands.md](references/commands.md) for exact commands, the resumable orchestrator pattern, and the output layout.

- One `(arm, instance)` per `--out` dir; skip instances whose prediction JSONL already exists (resumable).
- Concurrency ≤ 4; per-session `--step-timeout 1200000`.
- Console log per instance — needed later for root-causing.
- Run detached, poll the orchestrator's `_exits.log`; do not block the session.

## Phase 2 — Grade

- Merge per-instance predictions into one JSONL; grade via `benchmark.ts verify` (commands reference).
- Verdict per instance comes from `report.json` (`resolved: true/false`), not from patch presence.
- Clean up the stray `<model>.<run-id>.json` file the harness drops at repo root.

## Phase 3 — Root-cause every failure

For EACH unresolved instance, in parallel sub-agent batches (read-only agents; one agent per 2–3 instances):

1. Read the session transcript (`<out>/<arm>/<instance>/<instance>.log`) and the post-run sandbox (incl. `documents/tasks/` plan files).
2. Compare `model_patch` against the gold patch and `FAIL_TO_PASS` list (see commands reference for gold access).
3. Classify the failure per [references/failure-taxonomy.md](references/failure-taxonomy.md).
4. Attribute the ORIGINATING phase — plan / implement / review — with transcript evidence. Review interceptions count separately: "review saw the gap and dismissed it" is a review finding even when the gap originated in plan.

Aggregate: per-instance list (instance, phase, mode, one-line evidence), dominant mode, phase distribution, which primitive each cluster points at.

**CRITIC GATE 1**: submit the aggregate table to a critic subagent (attack focus: attribution errors, force-fit classifications, evidence gaps). Resolve objections before designing fixes.

## Phase 4 — Generalize (anti-overfit gate)

Draft candidate fixes, then pass each through this checklist YOURSELF before the critic sees them. A fix that fails is benchmark overfitting — drop or reformulate.

1. **Restate the failure mode domain-neutrally.** Good sign: the same mode exists in infrastructure ("migrated primary, backup job still points at old host") and non-IT ("re-planned the schedule, never updated the escalation doc"). If the mode only exists for "GitHub issue with a hidden acceptance test" — it is a benchmark artifact, not a capability gap.
2. **Discriminator question** for every proposed wording: *"Does this help on an infra task and a non-IT task, with a human on the gate — not only on a code issue with a hidden test?"* "Only the benchmark shape" → do not write it.
3. **Attribution honesty**: fix the primitive where the failure originated. Budget truncation and test-fitting are not plan bugs; a dismissed review finding is not an implement bug.
4. **Strengthen existing machinery** (DoD completeness, GODS sections, human gate, verdict gates) instead of adding new checklists. If the primitive already has the mechanism and the agent skips it, the fix is enforcement/phrasing, not a new step.
5. **Scope belongs to the human.** Never encode "the variant must cover the full requirement set" — partial scope / MVP / phased delivery is a legitimate human choice. Encode only: scope cuts must be EXPLICIT, justified by inspected evidence, and surfaced to the human — never silent.
6. **Conditional engagement**: completeness disciplines apply when the request has a definite outcome set. Open-ended / exploratory work routes ambiguity to the human gate instead of a self-confident checklist.
7. **Rewrite code verbs into domain-neutral ones**, with per-domain examples inside the rule itself: "grep callers" → "enumerate the affected surface (code: callers and duplicated logic; infra: environments, regions, dependent services; non-IT: stakeholders and downstream steps)".
8. **Declare the training-on-test risk** in the Decision Log: the fix was derived from N analyzed failures; it retroactively repairs those N by construction, so its evidence is the NEXT run.

Then generate ≥2 variants for the scope of each primitive change, self-select one with printed Pros/Cons/Risks rationale.

**CRITIC GATE 2** (replaces the user variant gate): submit the selected variant + exact proposed wording to a critic subagent (attack focus: items a–e of the Critic Protocol). Only after resolution proceed to implementation.

## Phase 5 — Implement

1. Create a GODS task file under `documents/tasks/<YYYY>/<MM>/<slug>.md` with the DoD tuple (FR-ID, Benchmark scenario id, Evidence command) and the critic-approved variant recorded in `## Solution`.
2. Acceptance-Test TDD: author the RED scenario under `framework/core/skills/<primitive>/acceptance-tests/<scenario>/` first. **CRITIC GATE 3**: submit the scenario to a critic subagent (attack focus: test-fitting — hints, scripted answers, leaked internals). Then confirm it FAILS on the unchanged atom.
3. Edit `framework/atoms/<name>.md` until the scenario passes. Regenerate composites. Max 2 RED→GREEN attempts per scenario (Rule 7).
4. Run the FULL acceptance sweep for the affected primitive (`deno task acceptance-tests -f <primitive-id>`) — authorized by the autonomy contract; the result cache keeps unchanged scenarios cheap. Fix regressions by re-entering RED→GREEN on the failing scenario.
5. `deno task check` green before commit.

## Phase 6 — Re-measure and report

- Re-run the flowai arm on the full pool (resumable orchestrator; at minimum the instances the fix targets if the environment constrains).
- Grade; write `documents/benchmarks/swe-verified-<date>.md` superseding the prior report: pipeline delta, per-instance table, run-by-run trajectory, explicit caveats (single-rep, same-harness A/B, emulated gate, Python-only pool, trained-on-test risk from Phase 4.8).
- Close with the full Decision Log summary: every critic round, objections applied/rebutted, fixes dropped by the anti-overfit gate.

## Verification

- [ ] No user checkpoints occurred — only hard-blocker stops, if any.
- [ ] Decision Log mirrored to `_decision-log.md` in the run dir; checkpoint commits at phase boundaries with allowed prefixes only; no `feat:`/`fix:` commits, no push to `main`.
- [ ] Old-run `sandbox/` dirs cleaned; free disk verified at preflight.
- [ ] Every unresolved instance has (phase, mode, evidence) — no "unknown" left without a stated reason.
- [ ] All three CRITIC GATEs ran with a real subagent; every BLOCKING objection applied or rebutted with evidence; rounds logged.
- [ ] Every proposed fix passed the Phase 4 checklist; rejected/reformulated candidates are listed, not silently dropped.
- [ ] Primitive edits went through RED scenario (critic-checked) → atom edit → regenerate → full primitive sweep.
- [ ] Report written with caveats and the Decision Log; prior report superseded, not rewritten in place.
- [ ] Stray grading artifacts at repo root removed; `deno task check` green.
