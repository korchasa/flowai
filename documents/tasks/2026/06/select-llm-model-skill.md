---
date: "2026-06-13"
status: done
implements: [FR-MODEL-SELECT]
tags: [beta, skill, llm, leaderboards, model-selection]
related_tasks: []
---
# Beta Skill: `select-llm-model` — Task-Driven LLM Model Recommender

## Goal

Give developers a repeatable, evidence-backed way to pick the right LLM for a
concrete task instead of guessing from memory or a single stale leaderboard.
The skill ingests a free-form task description, derives which capability axes
matter (intelligence, coding, agentic-coding, reasoning, tool-use, price,
speed), and returns a ranked shortlist of models with per-axis rationale and
source citations. Ships in the opt-in `beta` pack as a first, experimental
capability not yet promoted to `core`.

## Overview

### Context

User wants a beta skill for LLM-model selection, developed incrementally
("давай его последовательно разрабатывать"). User supplied 20 candidate data
sources (leaderboards + individual benchmarks) and asked to (a) evaluate their
usefulness, (b) keep only the relevant/fresh ones, and (c) devise a data
acquisition method for each kept source.

**Source triage (done in planning).** The 20 sources overlap heavily: most
individual benchmarks (GPQA, HLE, ARC-AGI, LiveCodeBench, Aider, τ²-bench, …)
are already incorporated into the composite indices of the aggregators, and
many have sparse coverage of the newest frontier models. Tying the skill to 20
live sources is slow and brittle. Selected set (10), each mapped to a decision
axis the recommender exposes:

- **Artificial Analysis** — Intelligence Index v3 + price + speed; 381 models;
  ~8×/day; structured/API. PRIMARY composite + cost/latency axes.
- **LMArena** — human pairwise-preference Elo; continuous. Unique "subjective
  quality" axis not derivable from benchmarks.
- **LLM-Stats** — composite + per-benchmark pages; continuous. Breadth
  cross-check against AA.
- **SWE-bench Verified** — real GitHub issues; main agentic-coding signal.
- **Terminal-Bench** — terminal-agent tasks; distinct agentic axis.
- **Aider Polyglot** — diff-edit coding; distinct from SWE-bench.
- **GPQA Diamond** — PhD-level "Google-proof" reasoning.
- **HLE (Humanity's Last Exam)** — frontier expert knowledge ceiling.
- **ARC-AGI (1/2/3)** — fluid/abstract reasoning.
- **τ²-bench** — dual-control tool-use dialogues (retail/airline/telecom).

**Dropped / context-only** (subsumed by AA sub-evals, sparse frontier coverage,
or low refresh cadence): Vellum, Epoch AI, Scale SEAL+Showdown, LiveCodeBench,
WebArena, OSWorld, AgentBench, LiveBench, SWE-bench Pro, BenchLM. (BenchLM is a
viable swap-in for LLM-Stats if breadth-cross-check needs widening later.)

**Decisions captured in Step-2 clarification:**
- Function: recommender (task → ranked models), NOT a raw leaderboard digest.
- Input: free-form task description; skill infers axis weights.
- Source set: extended (selected aggregators + individual benchmarks as explicit
  axes).

### Current State

- `framework/beta/` is an opt-in pack, currently **hook-only** (ships the
  `doc-anchors-validate` Stop hook; `framework/beta/pack.yaml` describes it as
  hook-only). It has NO `skills/` dir yet.
- Build/plugin pipeline (`scripts/build-plugins.ts`, documented in SDS §3.1.1 /
  the `DEFAULT_PACKS` note): a hook-only pack is **Claude-only** (no `hasSkills`
  → no Codex manifest/marketplace entry). Adding the first skill flips
  `hasSkills` true → `beta` would START emitting a Codex manifest + marketplace
  entry. This is a structural side-effect of placing a skill in `beta`.
- `framework/engineering/skills/deep-research/SKILL.md` already implements a
  "Phase 0: Search Method Detection" pattern (built-in search / playwright-cli /
  MCP) reusable for any live-fetch step.
- No FR covers model selection. `FR-MODEL-SELECT` is NEW → SRS section + index
  row + (deferred) SRS `**Tasks:**` back-pointer required.
- Skill placement rule: model-auto-invocable capability → `framework/beta/skills/`
  (NOT `commands/`). CLI writer must NOT receive `disable-model-invocation`.

### Constraints

- **Planning only now** — `/flowai:plan` does not implement. This file is the
  contract; SKILL.md + asset + refresh logic + benchmarks are authored in the
  develop/ship phase (Acceptance-Test TDD: RED benchmark → GREEN SKILL.md).
- **Universal skill rules (FR-UNIVERSAL):** no IDE-specific tool names; provide
  cross-IDE examples; SKILL.md frontmatter (`name`, `description`) per
  agentskills.io.
- **Acceptance-Test TDD mandatory** for the new skill: ≥1 benchmark scenario per
  distinct observable behavior BEFORE editing SKILL.md.
- **No silent fallbacks / fail-fast:** if the chosen data path is unavailable
  (no network, no snapshot), the skill must say so, not fabricate rankings.
- **Determinism for benchmarking:** observable behavior must be testable without
  flaky live-web dependence (drives the data-architecture variant choice).
- **`-beta` lifecycle (SDS):** the `-beta` *suffix* policy (60-day promote/retire)
  applies to A/B-test deltas, NOT to membership in the `beta` *pack*. This skill
  is a beta-pack member, so the 60-day suffix clock does NOT apply; clarify in
  SDS to avoid confusion.

**Selected architecture: Variant A — live-fetch at invocation.** No bundled
data. On each invocation the skill detects an available fetch method, fetches
the axis-relevant subset of the 10 sources, normalizes, ranks. The "method per
source" is the live-fetch recipe table embedded in SKILL.md. Determinism risk
for the mandatory Acceptance-Test TDD gate is mitigated by mocking the fetch
tool in benchmark scenarios (see Constraints + Follow-ups).

## Definition of Done

- [x] FR-MODEL-SELECT: SRS section `### FR-MODEL-SELECT` added with `**Acceptance:**` field and `[ ]` status.
  - Test: `documents/requirements.md` section `### FR-MODEL-SELECT`
  - Evidence: `grep -q '### FR-MODEL-SELECT' documents/requirements.md`
- [x] FR-MODEL-SELECT: `select-llm-model` skill exists in `beta` pack, model-auto-invocable (no `disable-model-invocation` in source), and on a free-form task query derives axis weights and emits a ranked model shortlist with per-axis rationale.
  - Benchmark: `select-llm-model-recommends-for-coding-task`
  - Evidence: `deno task acceptance-tests -f select-llm-model-recommends-for-coding-task`
- [x] FR-MODEL-SELECT: each recommendation cites which source/axis it derived from plus the live-fetch timestamp; sources that failed/lacked the model are listed as explicit gaps.
  - Benchmark: `select-llm-model-cites-sources`
  - Evidence: `deno task acceptance-tests -f select-llm-model-cites-sources`
- [x] FR-MODEL-SELECT: when no fetch method is available (no network/search tool), the skill STOPs and reports — it MUST NOT fabricate rankings (fail-fast).
  - Benchmark: `select-llm-model-fails-fast-no-fetch`
  - Evidence: `deno task acceptance-tests -f select-llm-model-fails-fast-no-fetch`
- [x] FR-MODEL-SELECT: skill is description-matched (triggers on "which LLM for…" style queries), verified by 3 trigger scenarios (FR-ACCEPT.TRIGGER).
  - Benchmark: `select-llm-model-trigger-*` (3 scenarios)
  - Evidence: `deno task acceptance-tests -f select-llm-model-trigger`
- [x] FR-MODEL-SELECT: `beta` pack flips from hook-only to skill-bearing — build pipeline emits the skill and a Codex manifest/marketplace entry for `flowai-beta`; `pack.yaml` description updated.
  - Test: `scripts/build-plugins_test.ts::beta-pack ships select-llm-model skill` (new)
  - Evidence: `deno test -A scripts/build-plugins_test.ts`
- [x] FR-MODEL-SELECT: docs synced — README §Packs notes `beta` ships a skill; SDS §3 adds the skill component and clarifies `-beta` suffix policy vs `beta`-pack membership.
  - Test: `documents/design.md` + `README.md`
  - Evidence: `deno task check` (doc-link / SALP / pack-ref validators pass)

## Solution

### Files to create / modify

**Create:**
- `framework/beta/skills/select-llm-model/SKILL.md` — the skill (frontmatter
  `name: select-llm-model` + `description` matching "which model / pick LLM for
  a task"; NO `disable-model-invocation`). Sections below.
- `framework/beta/skills/select-llm-model/acceptance-tests/<scenario>/mod.ts`
  (+ `fixture/` where needed) for each benchmark scenario in DoD. Uses
  `AcceptanceTestScenario` (field `skill`), with the fetch tool mocked.

**Modify:**
- `framework/beta/pack.yaml` — description: now also ships the `select-llm-model`
  skill (no longer hook-only).
- `documents/requirements.md` — add `### FR-MODEL-SELECT` section (SRS format:
  Desc / Scenario / Acceptance / Status `[ ]`) + `**Tasks:**` back-pointer
  (added by develop/commit when the section is introduced, since it is new).
- `documents/design.md` — SDS §3 component entry for the skill; SDS §2 note that
  `beta` gains `hasSkills` → Codex manifest emission; clarify the `-beta` *suffix*
  60-day policy does NOT apply to `beta`-*pack* membership.
- `README.md` — §Packs: `beta` now ships a skill (catalog line).
- `scripts/build-plugins_test.ts` — new test: `beta` emits the skill + Codex
  manifest/marketplace entry once it has a skill.
- `documents/index.md` — FR row for FR-MODEL-SELECT (added now by this plan).

### SKILL.md structure (Variant A)

1. **Trigger / scope** — frontmatter description tuned for description-matching
   on model-selection intents.
2. **Phase 0 — Fetch-method detection** (reuse `deep-research` pattern): probe
   built-in WebFetch/WebSearch → `playwright-cli` → fetch-capable MCP. If NONE:
   STOP, report, do not fabricate (fail-fast).
3. **Phase 1 — Axis derivation:** parse the free-form task → assign weights to
   capability axes {intelligence, coding, agentic-coding, diff-edit, reasoning,
   knowledge, fluid-reasoning, tool-use}. Heuristic mapping table in SKILL.md
   (keywords → axis weight). **Default (critique 3):** if the task gives no clear
   signal, fall back to a balanced general-purpose profile and DISCLOSE the
   assumption in the output rather than guessing narrow weights.
   **Price/speed are NOT capability weights (critique 7):** treat them as a
   filter / tie-breaker applied only when the task prose states a budget or
   latency constraint; when unstated they do not enter the weighted-sum (a zero
   weight must not dominate).
4. **Phase 2 — Source selection + fetch:** fetch ONLY the sources mapped to
   non-zero axes (e.g. a pure-coding task fetches AA + SWE-bench Verified +
   Terminal-Bench + Aider; skips τ²-bench/ARC-AGI). Per-source recipe table:
   `source → URL → fetch verb → extraction hint → axis`. This table IS the
   "method per source".
5. **Phase 3 — Normalize + rank (critique 5):** raw source scales are
   incomparable (LMArena Elo ~1000–1400, benchmarks 0–100%, $/Mtok). Convert each
   axis to a **rank/percentile within the fetched model set** BEFORE the
   weighted-sum — never sum raw Elo with raw percentages. Then weighted-sum over
   capability axes; price/speed applied as filter/tie-breaker per Phase 1.
6. **Phase 4 — Output:** ranked shortlist (top N), each with per-axis rationale,
   source citation, and the fetch timestamp; an explicit "Gaps" list (sources
   that failed or lacked a model). No fabrication on partial-fetch — degrade and
   disclose.

### Per-source acquisition method (the embedded recipe table)

| Source | URL | Method | Extract | Axis |
|---|---|---|---|---|
| Artificial Analysis | artificialanalysis.ai/leaderboards/models | WebFetch (API if key) | Intelligence Index, $/Mtok, tok/s | intelligence, price, speed |
| LMArena | arena.ai/leaderboard/text | WebFetch | Elo per model | human-preference |
| LLM-Stats | llm-stats.com | WebFetch | composite score | cross-check |
| SWE-bench Verified | swebench.com | WebFetch | %resolved | agentic-coding |
| Terminal-Bench | tbench.ai | WebFetch | %solved | terminal-agentic |
| Aider Polyglot | aider.chat/docs/leaderboards | WebFetch | %completed | diff-edit |
| GPQA Diamond | artificialanalysis.ai/evaluations/gpqa-diamond | WebFetch | % | reasoning |
| HLE | agi.safe.ai | WebFetch | % | knowledge-ceiling |
| ARC-AGI | arcprize.org | WebFetch | % | fluid-reasoning |
| τ²-bench | Sierra τ²-bench page | WebFetch | pass@1 | tool-use |

(URLs/selectors are best-effort and may drift — Phase 0 + per-source failure
handling cover layout/availability breakage; **a source whose fetch fails or
whose expected field is not found MUST become an explicit Gap, never a silent
omission or fabricated value** (critique 2).)

### Acceptance-Test TDD (RED → GREEN per scenario)

Mock the fetch tool. **Static-mock constraint (critique 1):** one mock = one
response for ALL invocations of the mocked tool — NO conditional logic in the
mock value. Therefore each scenario MUST either (a) drive a single-axis task
that fetches exactly one source (clean per-source assertion), or (b) return a
synthetic combined payload and assert only ranking/citation/gap logic, NOT
per-source differentiation. Picking (a) for the primary coding scenario avoids
the test-fitting trap of expecting differentiated multi-source data from one
static response.

- `select-llm-model-recommends-for-coding-task` — coding/agentic query → ranked
  list + per-axis rationale.
- `select-llm-model-cites-sources` — citations + fetch timestamp + Gaps present.
- `select-llm-model-fails-fast-no-fetch` — no fetch method mocked available →
  STOP + report, no fabricated ranking.
- `select-llm-model-trigger-{1,2,3}` — description-match triggers (FR-ACCEPT.TRIGGER).

RED: write scenario, run `deno task acceptance-tests -f <id>`, confirm it FAILS
(skill absent). GREEN: author SKILL.md until it passes. Run only the authored
scenario(s); hand off the full sweep `deno task acceptance-tests -f select-llm-model`
to the user (CHECK phase).

### Verification commands

- `deno task check` — fmt/lint/test/skill-validation (covers SRS/SDS/index/pack
  validators, naming-prefix NP-3 for skill placement, build-plugins test).
- `deno test -A scripts/build-plugins_test.ts` — beta-pack skill emission.
- `deno task acceptance-tests -f select-llm-model` — full scenario sweep (user-run CHECK).

### Error handling

- No fetch method → STOP + explicit report (fail-fast; DoD-covered).
- Partial fetch (some sources fail) → proceed with available, list failures as
  Gaps, never interpolate missing scores.
- Model present in some sources, absent in others → rank on available axes, mark
  the missing axes as "no data" rather than zero (zero would distort weighted-sum).

## Follow-ups

- **Determinism hedge (deferred):** if live-web flakiness makes the benchmark
  sweep unreliable in CI, revisit Variant C (snapshot baseline + on-demand AA
  live-refresh) as the promotion-out-of-beta step. Recorded, not actioned.
- **Promotion to `core`:** when stable, move `select-llm-model` from `beta` to a
  permanent pack and add a refresh/freshness story.
