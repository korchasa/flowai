---
date: "2026-06-05"
status: in progress
implements: [FR-MAINT-SCAN]
tags: [maintenance, subagent, scan, performance, context-isolation]
related_tasks: [2026/06/maintenance-severity-scoring.md]
---
# Maintenance: Parallel Read-Only Scan Delegation

## Goal

Cut main-thread context pollution and wall-clock of the `maintenance` Scan Phase by fanning out its read-only category checks to **parallel read-only subagents**, while keeping finding parity, severity calibration, and the interactive Resolution UX byte-for-byte unchanged. The human-facing behavior (summary + per-finding Apply/Skip/Edit) must not regress; only HOW the scan gathers findings changes.

## Overview

### Context

`maintenance` runs two phases: a read-only **Scan** (16/17 independent categories — structural, hygiene, complexity, debt, docs-vs-code, doc-coverage, instruction-coherence, tooling, doc-health, architectural 10–17), a mandatory **Verify Findings + Severity** gate, then a HITL **Resolution** loop (Apply/Skip/Edit per finding). Today the whole Scan runs inline in one agent; 16 passes of grep/read pollute the main thread's context exactly where the subsequent HITL loop needs a clean window.

Why this is a good extraction (decided earlier this session):
- The Scan categories are read-only, mutually independent, parallelizable — the canonical fan-out shape.
- The skill **already** contemplates delegation: Rule 8 ("Subagent-supplied findings are leads, not conclusions") + Step 12 ("whether the scan was inline or delegated"). The Verify gate already re-grounds delegated findings against source. So the correctness scaffolding exists; this task structures and steers the delegation.
- Precedents in-repo: `review` SA1/SA2 → `console-expert` (optional delegation + inline fallback); `deep-research` → dedicated `deep-research-worker` (fan-out of read-only workers, parent consolidates).

Hard boundaries forced by the architecture:
- A subagent CANNOT do HITL → the Resolution loop and the "how to proceed" prompt MUST stay in the parent.
- Severity calibration ("Critical share ≤ 35 %", anti-inflation tie-break) is a GLOBAL property → it MUST run in the parent AFTER consolidating all workers, never per-worker.
- Delegation MUST be OPTIONAL with an inline fallback (the `review` principle) — no hard dependency on subagent availability; a failed/absent worker degrades to inline scan of that bucket, with no silent finding loss.

### Current State

- `framework/core/skills/maintenance/SKILL.md` — standalone skill (SDS §… line 70: "`maintenance` — standalone"); NOT an atom/composite → directly editable, no generator.
- Scan steps 1–12, Resolution steps 13–15. References: `references/verification-gate.md`, `references/severity-rubric.md`, `references/architectural-categories.md`, `references/example-findings.md`.
- Existing benchmark coverage: `maintenance-surfaces-severity-tags`, `maintenance-severity-filter-critical-high`, `maintenance-severity-calibration-no-inflation`, `maintenance-detects-doc-health-issues`, plus `acceptance-tests/tooling-relevance/`.
- FR landscape: `FR-DOC-LINT` (Cat 9), `FR-MAINT-SEVERITY` (severity), `FR-UNIVERSAL.QA-FORMAT`. **No FR governs scan execution structure** → FR binding for this change is variant-dependent (see Constraints).
- Read-only agent frontmatter pattern (`console-expert`): `tools: Read, Grep, Glob, Bash` + `disallowedTools: Write, Edit` + `readonly: true` + `mode: subagent` + `model`/`effort`/`maxTurns` + `opencode_tools: {write:false, edit:false}`.

### Constraints

- **Optional delegation + inline fallback** — mirror `review` SA1/SA2; no hard dependency on subagents.
- **Resolution stays in parent** — subagents can't HITL.
- **Verification parity** — every delegated finding re-grounded by the parent before the summary (Rule 8 / Step 12); no unverified subagent finding reaches the user.
- **Global severity post-consolidation** — Critical ≤ 35 % computed by parent across the union of worker findings, not per-worker.
- **No regression** — existing maintenance benchmarks must still pass (semantic-equivalence gate on findings/severity/summary).
- **Cross-IDE generic phrasing** — refer to "parallel read-only subagents (e.g. `Task`, `Agent`, `Explore`, background tasks)", never a single IDE's tool name.
- **New agent (if any)** follows canonical IDE-agnostic format under `framework/core/agents/` and needs its own acceptance tests per `write-agent-benchmarks`.
- **Primitive with benchmarks** → ≥2 variants surfaced before editing (this gate).
- **FR binding deferred to variant selection**: candidate options — (a) extend Component Coverage Matrix / `FR-MAINT-SEVERITY` benchmark set without a new FR (light variant), or (b) introduce a new `FR-MAINT-SCAN` (Parallel Scan Delegation) with its own acceptance scenario (structural variants). Decided at Solution time.

## Definition of Done

> Acceptance is **parity + deterministic-static**, never "delegation occurred".
> Subagent spawning is optional, non-deterministic, with an inline fallback —
> asserting it behaviorally is test-fitting. An LLM agent benchmark was tried and
> REJECTED: the harness lets the model substitute a generic `Explore` subagent
> for the named agent, so a green verdict does not depend on the agent definition
> at all (proven empirically — RED passed with the agent file absent from the
> sandbox). The agent's real guarantee (read-only confinement) is a STATIC
> frontmatter property, best verified by a parse-test. So the gate = existing
> maintenance scenarios still pass (parity) + a deterministic `*_test.ts` over the
> agent frontmatter and bucket partition + structural greps on SKILL.md.

- [x] FR-MAINT-SCAN: 5 specialized SELF-CONTAINED read-only scan-worker agents
      exist —
      `framework/core/agents/maintenance-scan-{hygiene,dependencies,contracts,docs,coverage}.md`
      (W1–W5) — each confined at the tool layer (`disallowedTools` ⊇ {Write,
      Edit}, `readonly: true`, `mode: subagent`), each declaring its bucket +
      exact `(Cats …)` set in the description, each embedding its full
      per-category check detail (`### Cat <n>` blocks) with ZERO references to
      skill files or spawn payloads; the legacy single template
      `maintenance-scan-worker.md` AND the skill-side detail files
      `scan-buckets.md` / `architectural-categories.md` are removed. Bodies
      forbid severity tags, fixes, and sub-agent spawning.
  - Test: `scripts/maintenance_scan_buckets_test.ts` — `scan agents: declared categories partition 1..16 exactly once`,
    `scan agents: confined read-only at the tool layer`,
    `scan agents: self-contained — embedded check detail, zero skill-file dependencies`,
    `scan delegation: superseded sources removed, SKILL.md decoupled`
  - Evidence: `deno test -A scripts/maintenance_scan_buckets_test.ts` → `4 passed | 0 failed`
    (also runs inside `deno task check`).
- [x] FR-MAINT-SCAN (rev. 2): SKILL.md Scan Phase delegates the 5 buckets to the
      self-contained agents WITHOUT payload, has NO inline fallback (failed
      agent → retry once → loud `Not scanned: W<n> …` line after the summary
      total), references neither deleted detail file, and keeps the Verify
      gate + severity calibration parent-only (post-consolidation, never
      per-worker).
  - Test: `scripts/maintenance_scan_buckets_test.ts::scan delegation: superseded sources removed, SKILL.md decoupled`
    + structural grep on `framework/core/skills/maintenance/SKILL.md`.
  - Evidence: `grep -qi 'Not scanned' …/SKILL.md && ! grep -q 'scan-buckets' …/SKILL.md && grep -qi 'parent' …/SKILL.md` all exit 0.
- [x] FR-MAINT-SCAN (rev. 2): the partition source is the 5 agent descriptions —
      their `(Cats …)` clauses cover categories 1–16 exactly once (W1=1-4,
      W2=10/11/16, W3=12/13/14, W4=5/7/9, W5=6/8/15); workers do NOT read
      `severity-rubric.md` or `verification-gate.md` (parent-only).
  - Test: `scripts/maintenance_scan_buckets_test.ts::scan agents: declared categories partition 1..16 exactly once`
  - Evidence: `deno test -A scripts/maintenance_scan_buckets_test.ts` → `4 passed`
    (parser asserts 5 agents, disjoint, union = {1..16}).
- [ ] FR-MAINT-SCAN: No regression — existing maintenance execution scenarios
      still pass after the SKILL.md restructure (finding / severity / summary
      parity + HITL Resolution UX byte-for-byte unchanged).
  - Benchmark: `maintenance-basic`, `maintenance-detects-doc-health-issues`,
    `maintenance-surfaces-severity-tags`,
    `maintenance-severity-filter-critical-high`,
    `maintenance-severity-calibration-no-inflation`.
  - Evidence: `deno task acceptance-tests -f maintenance-` reports `0 failed`.
    Full sweep deferred to user per AGENTS.md "Who runs acceptance tests".
- [x] FR-MAINT-SCAN: New FR section in SRS with `[ANC:fr:maint-scan]` + runnable
      `**Acceptance:**`, a matching `documents/index.md` `## FR` row, and SDS
      §3.2 lists the 5 `maintenance-scan-*` agents with bumped inventory counts
      (Agents 7→11; core agents 5→9 after the 2026-06-10 fork).
  - Test: `deno task check` (check-fr-coverage, check-salp, check-srs-evidence).
  - Evidence: `deno task check` → `0 failed` AND
    `grep -q 'ANC:fr:maint-scan' documents/requirements.md` AND
    `grep -q 'REF:fr:maint-scan' documents/index.md` AND
    `grep -q 'maintenance-scan-hygiene' documents/design.md`.
- [ ] FR-MAINT-SCAN: Before the deferred parity sweep, stale cache for the
      touched maintenance scenarios is invalidated so prior summary-format
      verdicts cannot mask a regression from the SKILL.md restructure.
  - Test: `n/a` (filesystem state).
  - Evidence:
    `find acceptance-tests/cache -type d -name 'maintenance-*' -prune -exec rm -rf {} +`
    runs cleanly (path-agnostic across `cache/<pack>/` layout; idempotent).

## Solution

Selected variant: **B′ — dedicated read-only scan-worker agent (single
parameterized template) + IDE-generic optional delegation in SKILL.md + new
`FR-MAINT-SCAN`**, with the scan partitioned into **5 thematic category buckets**.

### Agent shape decision (REVISED 2026-06-10, rev. 2: 5 SELF-CONTAINED agents)

Originally shipped as ONE shared template `maintenance-scan-worker.md` spawned
5× (mirroring `deep-research-worker`), with the fork "5 distinct agent files"
explicitly flagged as reversible. **On 2026-06-10 the user took that fork twice**:

1. The single template is REPLACED by 5 specialized agents, one per thematic
   bucket — W1 `maintenance-scan-hygiene`, W2 `maintenance-scan-dependencies`,
   W3 `maintenance-scan-contracts`, W4 `maintenance-scan-docs`,
   W5 `maintenance-scan-coverage`.
2. (rev. 2, same day) Agents became SELF-CONTAINED: the full per-category check
   detail moved INTO the agent bodies (`### Cat <n>` blocks); the skill-side
   detail files `references/scan-buckets.md` and
   `references/architectural-categories.md` are DELETED; the parent spawns
   agents with no payload. Consequence accepted by the user (explicit choice
   "громкий отказ"): the inline fallback is REMOVED — if a bucket's agent
   fails twice, the parent reports `Not scanned: W<n> (<categories>) —
   <reason>` after the summary total instead of re-scanning inline. Single
   source of detail = the agent bodies; the deterministic test pins the
   partition to the agent descriptions and forbids any agent→skill-file
   dependency.

### Bucket partition (themes, similar kept together, parent owns severity)

- **W1 — Mechanical hygiene & structure (Cats 1, 2, 3, 4):** shallow lexical
  tree pass — file placement/naming/config (1), dead code + unused imports +
  no-assertion tests (2), LOC/function/god-object limits (3), TODO/FIXME/HACK/XXX
  markers (4).
- **W2 — Structure & dependency graph (Cats 10, 11, 16):** import/export graph &
  module boundaries — cycles/layer-leak/reverse-deps (10), parallel impls +
  schema clones (11), public surface: barrel re-exports + synonym exports (16).
  Reads `references/architectural-categories.md` §10, §11, §16.
- **W3 — Type & behavior contracts (Cats 12, 13, 14):** impl bodies + type decls
  — capability/sentinel/type-vs-runtime (12), N-impl parity (13), defensive
  smells: silent swallows / `||`-fallback / error-as-decision (14). Reads
  `references/architectural-categories.md` §12, §13, §14.
- **W4 — Docs & instruction coherence (Cats 5, 7, 9):** truth & consistency of
  prose — docs↔code claims (5), inter-instruction contradictions (7), doc-system
  health: broken GFM links / stale `[x]` FRs / SRS↔SDS / index drift (9).
- **W5 — Coverage & pairing "X↔Y" (Cats 6, 8, 15):** enumerate→cross-reference —
  symbol↔docstring (6), tool↔stack/domain (8), invariant↔test descriptor +
  stub-only contract tests (15). The invariant↔test theme lives ONLY here (the
  lightweight pairing sub-bullet is removed from W1/Cat 2 — "don't split
  similar").

Coverage check: {1,2,3,4} ∪ {10,11,16} ∪ {12,13,14} ∪ {5,7,9} ∪ {6,8,15} =
1–16, each exactly once.

### Files to create / modify

- **CREATE `framework/core/agents/maintenance-scan-worker.md`** — shared
  read-only worker template.
  - Frontmatter (mirror `console-expert` / `deep-research-worker`):
    `name: maintenance-scan-worker`, `description:` ("Read-only maintenance scan
    worker for one category bucket… returns leads, no severity, no fixes…
    spawned by the maintenance Scan Phase — do NOT invoke directly."),
    `tools: Read, Grep, Glob, Bash`, `disallowedTools: Write, Edit`,
    `readonly: true`, `mode: subagent`, `model: smart`, `effort: medium`,
    `maxTurns: 20`, `opencode_tools: { write: false, edit: false }`.
  - Body (common instructions): inputs per spawn (`{bucket_name}`,
    `{categories}` precise per-theme block, `{finding_shape}`); workflow = scan
    ONLY the bucket's categories, return findings as **leads, not conclusions**;
    output shape per finding `category | site | problem | proposed fix`;
    constraints = NO severity tags, NO fixes, NO writes, do NOT read
    `severity-rubric.md` / `verification-gate.md` (parent-only), do NOT spawn
    sub-agents.
- **CREATE `framework/core/skills/maintenance/references/scan-buckets.md`** — the
  5 per-theme bucket specs, one `## W<n> — <theme> (Cats …)` block each.
  **Rework decision (this session): this file is the SINGLE SOURCE of the
  per-category check detail.** Each block carries the FULL sub-check detail for
  its categories — Cats 1–9 inline here (moved verbatim out of SKILL.md), Cats
  10–16 delegated to `architectural-categories.md` (W2/W3/W5-Cat15 reference it).
  Consumed both by a delegated worker (`{categories}` = the block) AND the
  parent's inline fallback. SKILL.md keeps NO inline check detail — only an
  orchestration step + Cat→bucket index (removes the duplication the user
  flagged: "Детали проверок должны быть только в них").
  **Path-resolution note:** once installed, the worker agent and the skill are
  separate primitives — the worker cannot resolve skill-relative
  `references/…` paths on its own. The parent (running the skill) passes the
  bucket spec text AND any needed reference excerpt (e.g. the relevant
  `architectural-categories.md` §§ for W2/W3) INLINE in the spawn prompt; the
  worker never path-resolves into the skill dir.
- **EDIT `framework/core/skills/maintenance/SKILL.md`** — Scan Phase restructure
  (rework this session):
  - Step 1 "Initialize & Plan" keeps the optional fan-out bullet (FR-MAINT-SCAN):
    MAY scan the 16 categories via 5 parallel read-only `maintenance-scan-worker`
    subagents (IDE-generic phrasing), inline fallback, Verify gate + severity +
    Resolution stay parent-only over the union.
  - **Collapse old Scan steps 2–11 (Cats 1–16 inline detail) into ONE
    orchestration step 2**: a Cat→bucket index (W1–W5) + delegate-or-inline
    instruction pointing at `references/scan-buckets.md` (Cats 1–9 detail) and
    `references/architectural-categories.md` (Cats 10–16). No inline sub-check
    detail remains in SKILL.md.
  - Renumber: old Step 12 Verify gate → Step 3; Resolution steps 13/14/15 →
    4/5/6. Fix all step cross-refs (Rule 8 "Step 12"→"Step 3", fan-out bullet
    "Steps 13–15"→"Steps 4–6", Question-Format "Step 15"/"Step 14"→"Step 6"/"Step
    5", Present-Summary "step 10"→"the Documentation Health check (Cat 9)").
  - Net effect: SKILL.md 19973→13460 chars (~4993→~3365 tokens) — detail
    de-duplicated into the single bucket source. Steps 3–6 (Verify/severity/
    summary/Resolution HITL) byte-identical in substance → parent-only guarantees
    preserved.
- **EDIT `documents/requirements.md`** — add `### FR-MAINT-SCAN: Parallel
  Read-Only Scan Delegation` (SALP anchor id `fr:maint-scan`) after
  `FR-MAINT-SEVERITY`
  (keep FR-MAINT* together): Description (optional fan-out of read-only buckets,
  parent owns Verify+severity+HITL, inline fallback), Scope (5 buckets cover
  1–16 once; workers leads-only no-severity; parent-only calibration; IDE-generic
  phrasing; no regression), `**Acceptance verified by acceptance tests:**`
  listing concrete ids — `maintenance-scan-worker-leads-readonly`,
  `maintenance-basic`, `maintenance-surfaces-severity-tags`,
  `maintenance-severity-calibration-no-inflation` — `**Status:** [ ]`.
  (Develop verifies `check-fr-coverage.ts` discovers the agent-scenario id; if
  not, swap that entry for a `deno task acceptance-tests -f …` command ref.)
- **EDIT `documents/index.md`** — `## FR` row for `maint-scan` (added in this
  plan, step 5b).
- **EDIT `documents/design.md`** — §3.2 Product Agents: add
  `core/agents/maintenance-scan-worker.md` bullet; bump inventory counts
  (Agents 6→7; core agents 4→5 on lines ~109–111 and ~98). Add a one-line note
  to the `maintenance` skill description that the Scan Phase optionally fans out
  to read-only workers (parent consolidates).
- **CREATE agent acceptance test**
  `framework/core/agents/maintenance-scan-worker/acceptance-tests/leads-readonly/mod.ts`
  (`AcceptanceTestAgentScenario`, field `agent`): fixture = a small project with
  one finding in 2–3 categories of a single bucket; checklist —
  `leads_only_no_severity` (no `[Critical|High|Medium|Low]` tags in output),
  `readonly_no_writes` (no file mutated), `bucket_scoped_categories_only` (no
  out-of-bucket findings). Fixture `deno.json` carries the standard excludes only
  if it invokes a project check.

### TDD sequencing (Acceptance Test TDD — agent + skill)

1. **RED (agent):** write `leads-readonly/mod.ts` + fixture; run
   `deno task acceptance-tests -f maintenance-scan-worker-leads-readonly` — MUST
   fail (agent does not exist yet).
2. **GREEN (agent):** create `maintenance-scan-worker.md` + `scan-buckets.md`;
   re-run the agent scenario until it passes.
3. **RED/parity (skill):** invalidate cache for the 5 maintenance scenarios
   (DoD evidence command), then edit SKILL.md Scan Phase. The parity scenarios
   are EXISTING — they must still pass (this is a no-regression gate, not a new
   RED); if any now fails, the restructure broke parity → fix SKILL.md.
4. **REFACTOR:** trim duplication between SKILL.md and `scan-buckets.md`; keep
   SKILL.md under `SKILL_MAX_LINES = 700` (`wc -l`).
5. **SRS/index/SDS** updates land with the GREEN skill edit (this plan already
   writes the index row; SRS section + SDS agent entry are develop-phase writes).
6. **CHECK (deferred to user):** `deno task acceptance-tests -f maintenance-`
   full sweep + `deno task check`.

### Verification commands

- Agent RED→GREEN: `deno task acceptance-tests -f maintenance-scan-worker-leads-readonly`.
- Parity: `deno task acceptance-tests -f maintenance-` → `0 failed`.
- Project gate: `deno task check` → `0 failed` (check-fr-coverage, check-salp,
  check-srs-evidence, check-skills line budget).
- Structural: `grep -c '^## W' framework/core/skills/maintenance/references/scan-buckets.md` = 5;
  `grep -qi 'inline fallback' …/SKILL.md`;
  `grep -q 'disallowedTools: Write, Edit' …/agents/maintenance-scan-worker.md`.
- Budget: `wc -l framework/core/skills/maintenance/SKILL.md` < 700.

### Risks & mitigations

- **Parity drift from restructure:** the 5 existing maintenance scenarios are the
  no-regression gate; cache invalidated before the SKILL.md edit so stale green
  verdicts cannot mask a regression. A scenario set may not exercise all 16
  categories, so a silently-dropped category could evade behavioral parity — the
  structural "1–16 exactly once" bucket-map grep (DoD item 3) is the safety net
  that catches category-drop at the spec level, independent of scenario coverage.
- **Severity inflation re-introduced per-worker:** workers emit NO severity;
  calibration is a single parent pass over the union — structurally impossible to
  inflate per-worker.
- **Worker writes despite "read-only":** `disallowedTools: Write, Edit` +
  `opencode_tools:{write:false,edit:false}` + `readonly:true` enforce it at the
  tool layer, not by prompt discipline; the agent scenario asserts no mutation.
- **Generic-subagent fallback ambiguity across IDEs:** phrasing stays IDE-generic
  ("e.g. Task, Agent, Explore, background tasks"); inline fallback removes any
  hard dependency on subagent availability.
- **SKILL.md size creep:** bucket specs live in `references/scan-buckets.md`, not
  the skill body; SKILL.md delta target ≤ 25 lines.

## Follow-ups

- If the user prefers 5 distinct agent files over 1 parameterized template,
  re-shape the agent layer (5 files + 5 scenario dirs) — flagged as the single
  reversible fork above; decide before the GREEN agent edit.
- README §Packs/§Agents: one-line note that maintenance Scan optionally fans out
  to a read-only worker. Deferred — cosmetic, not in the FR contract.
