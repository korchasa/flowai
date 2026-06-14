---
date: "2026-06-14"
status: done
implements: [FR-MODEL-SELECT]
tags: [beta, skill, llm, leaderboards, data-acquisition, scripts, benchmarks]
related_tasks: [2026/06/select-llm-model-skill.md]
---
# `select-llm-model` — Reliable Per-Source Data-Acquisition Scripts

## Goal

Make the recommender's data acquisition **guaranteed and stable**. Today Phase 2
tells the agent to `curl -fsSL <leaderboard-url>` and parse the HTML. Most of
those pages are Next.js RSC-streaming SPAs: a raw fetch returns megabytes of
markup with no parseable score table, so the source silently degrades to a Gap
and the ranking thins out to near-nothing (observed live this session against
Artificial Analysis). Replace per-source HTML scraping with a deterministic
fetch+parse path per source so each source either yields clean normalized rows
or fails loudly — never returns garbage and never silently vanishes.

## Overview

### Context

User: "доработай скил подбора моделей. Сделай скрипты для кажждого источника,
чтобы получать данные гарантировано и стабильно" — add a script per source for
guaranteed, stable retrieval.

**Probed acquisition surface (Data-First, 2026-06-14).** The 10 sources split
into three reliability tiers — this split is the central finding:

- **Tier 1 — repo-backed, rock-solid, no key.** Leaderboard data lives as raw
  YAML/JSON in a public GitHub repo; a `curl` of the raw file returns a clean,
  schema-stable table. Verified live:
  - Aider Polyglot → `raw.githubusercontent.com/Aider-AI/aider/main/aider/website/_data/polyglot_leaderboard.yml` (clean YAML, `model` + `pass_rate_2`).
  - SWE-bench Verified → `api.github.com/repos/SWE-bench/experiments/contents/evaluation/verified` (per-submission dirs, each with results JSON).
  - Terminal-Bench → `laude-institute/terminal-bench` repo (`dashboard/` data).
  - τ²-bench → `sierra-research/tau2-bench` repo (README/results table).
- **Tier 2 — official API, stable with a free key (env var).** Artificial
  Analysis exposes `artificialanalysis.ai/api/...` (Intelligence Index, $/Mtok,
  tok/s, plus GPQA/LiveCodeBench sub-evals). The public leaderboard HTML is a
  3.5 MB SPA with no clean embedded table; the API is the stable path but needs
  `AA_API_KEY`.
- **Tier 3 — SPA-only, best-effort, will drift.** LMArena, LLM-Stats, ARC-AGI,
  HLE render via Next.js app-router RSC streaming (`self.__next`), no clean
  `__NEXT_DATA__` script tag. No fully stable keyless endpoint confirmed. Some
  have alternate backings (LMArena → HuggingFace dataset; ARC-AGI → possible
  JSON API) to investigate, but "guaranteed" cannot be promised for raw scrape.

**Honesty constraint.** "Guaranteed and stable" is deliverable for Tier 1,
deliverable-with-key for Tier 2, and only best-effort for Tier 3. The plan must
NOT promise stability it cannot deliver: a Tier-3 script that cannot parse must
exit non-zero so the skill records an explicit Gap — never emit a fabricated or
half-parsed row.

**Benchmark-determinism constraint (carried from prior task).** The acceptance
mock hook intercepts only `Bash` commands, matched by the first bare word ==
tool name. Today scenarios mock `curl`. Any new acquisition design MUST preserve
a mockable seam: the network call must remain a `curl` invocation the bench can
intercept; parse logic must be separable and unit-testable WITHOUT live network.

### Current State

- `framework/beta/skills/select-llm-model/SKILL.md` — Phase 0 fetch-method
  (shell curl/wget), Phase 2 per-source recipe table of bare `curl -fsSL
  <leaderboard-url>` + prose "extract the rows". No script files; all parse
  logic is LLM-executed prose. No code-level (deno test) coverage of parsing.
- `acceptance-tests/` — 6 scenarios (3 execution + 3 trigger). Execution
  scenarios mock `curl` with a static synthetic leaderboard payload and judge
  ranked-shortlist / citation / fail-fast behavior.
- Precedent for skill-local scripts exists (`framework/*/skills/*/scripts/`);
  framework rule: such scripts MUST be standalone-runnable (`jsr:` specifiers,
  no import map).
- Lint/fmt/test ignore lists (`deno.json` ×2 + `scripts/task-check.ts
  --ignore`) currently exclude `acceptance-tests/`; new production scripts +
  their fixtures touch this drift-prone surface.
- FR-MODEL-SELECT already exists ([x]); this is an implementation-hardening of
  the same FR, not a new contract. SRS back-pointer + index row already present.

### Constraints

- **Planning only now** — `/flowai:plan` does not implement. This file is the
  contract; scripts + tests + SKILL.md edits + benchmark updates are authored in
  the develop/ship phase under TDD.
- **Code-TDD for scripts** (TypeScript): each parser script gets a failing
  `*_test.ts` against a captured sample fixture BEFORE implementation (RED →
  GREEN → REFACTOR → `deno task check`).
- **Acceptance-TDD for the skill**: any SKILL.md behavior change needs a
  benchmark scenario covering it; mock `curl` (static one-response rule — no
  conditional mock logic).
- **Standalone-runnable scripts** (`jsr:` specifiers, no import map).
- **Fail-fast, never fabricate** — a source that cannot be parsed becomes a Gap.
- **Mockable seam preserved** — network = `curl` (bench-interceptable); parse =
  pure function (unit-testable offline).
- **Honest tiering** — do not claim SPA scrapers are stable; mark Tier-3 sources
  best-effort and make them fail loudly.
- **`deno`-dependency trade-off (critique #2)** — Variant B makes reliable
  parsing require a `deno` runtime in the *user's* environment, where the
  current skill needed only `curl`. Accepted because flowai's audience runs
  Deno-based IDEs and the skill ships in the Deno-centric `beta` pack; non-Deno
  environments degrade to all-Gap (fail-fast), never to fabricated output. A
  runtime-agnostic (`jq`-only) parser path is a Follow-up, not in scope.

## Definition of Done

> **Design pivot (mid-ship, user directive):** "Artificial Analysis should absorb
> the benches it already contains" + "add price data from OpenRouter". The AA API
> (`/api/v2/data/llms/models`, key-gated) already returns GPQA, HLE, LiveCodeBench,
> Terminal-Bench-hard, τ²-bench, coding/math indices + price + speed — so the
> per-bench scrapers (SWE-bench/Terminal-Bench/τ²/GPQA/HLE/LCB/LLM-Stats) collapse
> into ONE keyed API call. Final source set: **AA** (absorbs benches), **OpenRouter**
> (real deployment price), **Aider** (diff-edit, not in AA). LMArena + ARC-AGI have
> no stable keyless endpoint → documented Gaps. Skill `scripts/` must be FLAT
> (FR-UNIVERSAL.REFS — no nested `lib/`/`fixtures/`), so helpers live in
> `scripts/types.ts` and fixtures are inlined into the `_test.ts` files (matching
> the analyze-context convention).

- [x] FR-MODEL-SELECT: each active source has a pure parser (`scripts/parse-<source>.ts`,
      raw bytes → normalized `{source,axis,model,score,higherIsBetter}` JSON via stdin)
      with deterministic unit tests; unparseable/empty input → non-zero exit (Gap).
      Built: `parse-artificial-analysis.ts` (absorbs benches + price + speed),
      `parse-openrouter.ts` (blended $/Mtok + context), `parse-aider.ts` (diff-edit).
  - Test: `framework/beta/skills/select-llm-model/scripts/parse-{artificial-analysis,openrouter,aider}_test.ts` (13 cases)
  - Evidence: `deno test -A framework/beta/skills/select-llm-model/scripts/` → 13 passed
- [x] FR-MODEL-SELECT: SKILL.md Phase 2 is the `curl <url> | deno run scripts/parse-<source>.ts`
      pipeline; AA gated on `AA_API_KEY` (unset → Gap, never SPA-scrape) with the free-key URL named.
  - Benchmark: `select-llm-model-recommends-for-coding-task` (mock `curl` = valid Aider YAML, fictional models)
  - Evidence: `deno task acceptance-tests -f select-llm-model-recommends-for-coding-task`
- [x] FR-MODEL-SELECT: a source whose parser exits non-zero (unparseable bytes,
      missing key, or `deno` absent — same Gap path) is an explicit Gap, never a
      fabricated row.
  - Benchmark: `select-llm-model-source-parse-failure-becomes-gap` (new)
  - Evidence: `deno task acceptance-tests -f select-llm-model-source-parse-failure-becomes-gap`
- [x] FR-MODEL-SELECT: flat `scripts/` (FR-UNIVERSAL.REFS) — `scripts/types.ts`
      normalized schema + `emit`/`readStdin`/narrowing helpers, relative + `jsr:`
      imports only; fixtures inlined into tests (no nested dirs). `deno task check` green.
  - Test: `deno task check` (scripts are production code & pass; check-skills FR-UNIVERSAL.REFS green)
  - Evidence: `deno task check` → EXIT 0
- [x] FR-MODEL-SELECT: docs synced — FR-MODEL-SELECT description + SDS §3.21
      updated for AA-absorbs-benches, OpenRouter price, parser-script acquisition,
      `deno` dependency, LMArena/ARC-AGI Gaps.
  - Test: `documents/requirements.md` + `documents/design.md`
  - Evidence: `deno task check` (SALP / doc-link / pack-ref validators pass)

### Phase 2 — Maximize benchmark coverage (folded in, user directive 2026-06-14)

> "нам нужно отработать все источники, покрыв максимум бенчмарков. Для каждого
> нужного источника построить скрипт получения данных." Variant C — generic
> source-adapter registry + a parser per *viable* source. Probed surface
> (Data-First, 2026-06-14): AA already absorbs LiveCodeBench/τ²/Terminal-Bench and
> returns ~15 eval fields (we emit 8); WebArena/steel.dev is a server-rendered
> table (new web-agent axis); BenchLM/LLM-Stats/Epoch are SPAs with no confirmed
> keyless endpoint; OSWorld/AgentBench are repo/system-attributed; Scale = SPA.
> Honesty rule still holds: an unconfirmed endpoint → documented Gap, never a
> fabricated parser.

- [x] FR-MODEL-SELECT: source registry `scripts/sources.ts`
      (`{id,name,axes[],urls[],tier,needsKey?}`; grouping is per-row via
      `ScoreRow.group`, not per-source) + `sources_test.ts` asserting file-level
      parity (every `SOURCES.id` ⟷ a `parse-<id>.ts`, and vice versa). No markdown parsing.
  - Test: `framework/beta/skills/select-llm-model/scripts/sources_test.ts` (5 cases)
  - Evidence: `deno test -A framework/beta/skills/select-llm-model/scripts/sources_test.ts`
- [x] FR-MODEL-SELECT: `parse-artificial-analysis.ts` expanded to emit ALL AA
      eval fields as axes (`mmlu_pro,scicode,aime_25,ifbench,lcr,math_index,…`,
      ~15 benchmarks) + price + speed; correlated "smart" fields share a `group`
      so Phase 3 does not triple-count them.
  - Test: `parse-artificial-analysis_test.ts` (asserts new axes + grouping)
  - Evidence: `deno test -A framework/beta/skills/select-llm-model/scripts/parse-artificial-analysis_test.ts`
- [x] FR-MODEL-SELECT: new agent-axis scraper with unit tests vs real captured
      structure, exit≠0 → Gap. **Data-First outcome (2026-06-14):** WebArena and
      OSWorld are BOTH steel.dev pages with identical server-rendered tables, so
      ONE generic adapter `parse-steel.ts` (axis chosen from page `<title>`:
      WebArena→web-agent, OSWorld→computer-use, GAIA→web-agent) covers both,
      validated live (49 webarena + 17 osworld rows). AgentBench (Google Sheet +
      image) and Epoch (no confirmed CSV/JSON endpoint) probed → no machine
      feed → documented Gaps, not fabricated parsers (honesty rule, explicitly
      permitted by this task). Scores kept system/submission-attributed.
  - Test: `parse-steel_test.ts` (6 cases incl. real-page bar-width-trap regression)
  - Evidence: `deno test -A framework/beta/skills/select-llm-model/scripts/parse-steel_test.ts`
- [x] FR-MODEL-SELECT: BenchLM + LLM-Stats probed for the two-step
      `_next/data/<buildId>` path → **no exposed buildId at probe time** (Next.js
      app-router SPAs), so no stable endpoint to build a parser against →
      documented Gaps in SKILL.md rather than a parser that can't be tested
      against real data. (Promotable later if a buildId surfaces — Follow-up.)
  - Test: SKILL.md "Known Gaps" names LLM-Stats + BenchLM
  - Evidence: `grep -qE 'LLM-Stats|BenchLM' framework/beta/skills/select-llm-model/SKILL.md`
- [x] FR-MODEL-SELECT: Scale SEAL/Showdown + SWE-bench Pro documented as Gaps in
      SKILL.md (no stable keyless endpoint).
  - Test: SKILL.md "Known Gaps" section names them
  - Evidence: `grep -q 'Scale' framework/beta/skills/select-llm-model/SKILL.md`
- [x] FR-MODEL-SELECT: SKILL.md Phase 2 lists every kept source (pipe+tier+axes) +
      new axes (web-agent/computer-use) + Phase 3 group-collapse + Gaps; existing
      acceptance scenarios still pass; SRS/SDS §3.21 updated for the expanded
      source set; `deno task check` green.
  - Benchmark: `select-llm-model-recommends-for-coding-task` + Evidence `deno task check`
  - Evidence: `deno task acceptance-tests -f select-llm-model-recommends-for-coding-task`

## Solution

### Architecture (Variant B — pure parser script per source)

Separate the **impure, mockable fetch** (`curl`, owned by SKILL.md) from the
**pure, unit-testable parse** (Deno script, stdin → normalized JSON). Phase 2 of
the skill becomes, per source:

```
curl -fsSL <stable-endpoint> | deno run scripts/parse-<source>.ts
```

(No `--allow-*` flag — reading `Deno.stdin` needs no permission; critique #7.)

The parser reads raw bytes from **stdin** (no network of its own — keeps the
`curl` the single mockable seam), validates + extracts, and writes a JSON array
of `{source, axis, model, score, higherIsBetter}` to stdout. `higherIsBetter`
(critique #8) is `false` for the price axis and `true` for everything else, so
Phase 3 inverts price before the within-set percentile conversion instead of
ranking cheap models last. On any failure (bad shape, zero
rows, missing field) it writes a one-line reason to stderr and `Deno.exit(1)`.
The skill treats a non-zero parser exit exactly like the existing Gap path.

The stable endpoint URL lives in the SKILL.md Phase-2 table (single source of
truth); the parser stays URL-agnostic so its tests feed a fixture file, not a
live URL.

**Test-scope honesty (critique #6).** Parser unit tests prove parse *logic*
against a frozen fixture snapshot — they do NOT detect a source changing its live
schema. "Stable" here means "deterministic + fails loudly on drift," not
"immune to upstream change": a live schema change surfaces as a runtime parser
exit-1 → Gap, never a silent wrong answer. SKILL.md + Follow-ups note that
fixtures need periodic re-capture.

### Files to create

Under `framework/beta/skills/select-llm-model/scripts/`:

- `lib/types.ts` — `interface ScoreRow { source; axis; model; score; higherIsBetter }`; helpers
  `readStdin(): Promise<string>`, `emit(rows: ScoreRow[]): void` (JSON to
  stdout; exits 1 if `rows` is empty).
- **Tier 1 (repo-backed, rock-solid):**
  - `parse-aider.ts` — `jsr:@std/yaml` parse of `polyglot_leaderboard.yml`;
    latest entry per `model` by `pass_rate_2`; axis `diff-edit`.
  - `parse-swebench.ts` — parse the consolidated SWE-bench Verified leaderboard
    JSON; axis `agentic-coding`. **RED-phase confirm:** re-verify the single
    consolidated endpoint the site reads; if only the per-submission
    `experiments` dir listing exists, the skill curls the listing JSON and the
    parser consumes that array (still pure stdin) — do NOT let the parser
    fan-out-fetch (would bypass the mock seam).
  - `parse-terminal-bench.ts` — parse `terminal-bench` dashboard data JSON; axis
    `agentic-coding`.
  - `parse-tau2.ts` — parse `tau2-bench` results (repo JSON/markdown table);
    axis `tool-use`.
- **Tier 2 (official API, needs key):**
  - `parse-artificial-analysis.ts` — parse AA API JSON; emits THREE axes
    (`intelligence`, `price`, `speed`) + sub-eval rows (`reasoning` from GPQA,
    `coding` from LiveCodeBench) where present. SKILL.md curls with
    `-H "Authorization: Bearer $AA_API_KEY"`; unset key → skill records Gap,
    parser never runs.
- **Tier 3 (SPA-only, best-effort → loud Gap):**
  - `parse-lmarena.ts`, `parse-llm-stats.ts`, `parse-arc-agi.ts`, `parse-hle.ts`
    — attempt the best known stable extraction (embedded JSON if any); on
    RSC-streamed HTML with no parseable table → `Deno.exit(1)` so the source
    becomes a Gap. Each is documented best-effort in the SKILL.md tier column.
- For every parser: a sibling `parse-<source>_test.ts` and a captured input
  fixture under `scripts/fixtures/<source>.<ext>` (Tier-1/2: a real captured
  sample → asserts correct rows; Tier-3: an RSC-HTML sample → asserts non-zero
  exit).

### Files to modify

- `SKILL.md` — Phase 0: add `deno` to the runtime probe (absent → script-backed
  sources are Gaps, fail-fast, **no silent inline-parse fallback**). Phase 2:
  replace the bare-`curl` recipe table with the
  `curl <stable-url> | deno run scripts/parse-<source>.ts` table + a **Tier**
  column + the `AA_API_KEY` gate. The AA row MUST name the free-key signup URL
  (critique #3) so a keyless user can fix the Gap rather than silently lose the
  headline intelligence/price/speed source. Phases 3–4 unchanged except noting
  the input is now normalized JSON rows and price is inverted via
  `higherIsBetter` before percentile.
- `acceptance-tests/recommends-for-coding-task/mod.ts` — re-scope to a
  single-source pipeline (static-mock constraint: one `curl` mock = one parser
  format). Mock payload = valid parser-format input (e.g. Aider YAML) carrying
  fictional models; checklist asserts the agent ran `deno run scripts/parse-*`
  and ranked the parser output.
- `acceptance-tests/cites-sources/mod.ts` — update mock payload to parser
  format; assertions (citation + timestamp + Gaps) unchanged.
- `deno.json` (fmt.exclude + lint.exclude) and `scripts/task-check.ts`
  (`--ignore`) — add `framework/*/skills/*/scripts/fixtures/` to ALL THREE.
- `documents/requirements.md` (FR-MODEL-SELECT description), `documents/design.md`
  (§3.21 pipeline) — doc sync in the develop/commit phase.

### Error handling

- Parser bad input / zero rows / missing field → stderr reason + `Deno.exit(1)`.
- Skill: non-zero parser exit OR `curl` failure OR missing `AA_API_KEY` OR `deno`
  absent → that source is an explicit Gap (reason recorded), ranking proceeds on
  surviving sources; all-Gap → no ranking, report + stop (existing Phase-4 rule).
- No new fallback behavior: degradation is the existing Gap/partial-data model,
  not a silent substitute.

### Verification

- `deno test -A framework/beta/skills/select-llm-model/scripts/` — parser units.
- `deno task acceptance-tests -f select-llm-model-recommends-for-coding-task`
- `deno task acceptance-tests -f select-llm-model-source-parse-failure-becomes-gap`
- `deno task check` — fmt/lint/test (scripts as production code, fixtures
  excluded) + SRS/SDS/index/SALP validators.
- Full sweep (user-run CHECK): `deno task acceptance-tests -f select-llm-model`.

### Phase 2 Solution (Variant C — registry + per-source scrapers)

Phase 1 (above) shipped AA/OpenRouter/Aider parsers + the mock-matcher fix.
Phase 2 maximizes benchmark coverage on top of that base.

- **Registry** `scripts/sources.ts`: `SourceDef = {id,name,axes[],group?,urls[],
  tier,needsKey?}`; `sources_test.ts` asserts file-level parity (each `id` ⟷
  `parse-<id>.ts`). The SKILL.md Phase 2 table is kept consistent by hand.
- **AA expansion** — extend `EVAL_AXES` in `parse-artificial-analysis.ts` to ALL
  AA eval fields (~15). Correlated "smart" fields (`intelligence_index`,
  `mmlu_pro`, `gpqa`) carry a shared `group` so Phase 3 collapses the group to
  one contribution (no triple-counting).
- **New scrapers** (each pure stdin→`ScoreRow[]`, exit≠0 → Gap; inline real
  fixtures captured in RED):
  - `parse-webarena.ts` — regex parse of the server-rendered `leaderboard.steel.dev`
    table (deno-dom only if regex is fragile). RED: confirm which benchmark the
    table actually reports before mapping the axis.
  - `parse-osworld.ts` — gh-pages JSON (RED: locate the data file); drop rows not
    attributable to a model.
  - `parse-agentbench.ts` — THUDM/AgentBench repo `data/` (RED: locate file).
  - `parse-epoch.ts` — Epoch data endpoint (RED: locate CSV/JSON).
  - `parse-benchlm.ts`, `parse-llm-stats.ts` — best-effort two-step
    `_next/data/<buildId>` (Tier-3); acceptance = unit tests only.
- **Documented Gaps:** Scale SEAL/Showdown, SWE-bench Pro (+ carried LMArena,
  ARC-AGI). **Honesty rule:** any source whose endpoint can't be confirmed in RED
  becomes a Gap, not a fabricated parser — this does not fail the task.
- **SKILL.md** — Phase 0 two-step note; Phase 2 full source table (pipe+tier+
  axes); Phase 3 axis-group collapsing; Gaps section. **Docs** — SRS FR
  description + SDS §3.21 source list/tiers.
- **Deps:** `jsr:@std/*`; `jsr:@b-fuze/deno-dom` only if WebArena regex fails.

## Follow-ups

- **Tier-3 stable backings (deferred investigation):** LMArena → HuggingFace
  dataset; ARC-AGI → candidate JSON API; LLM-Stats → embedded JSON probe. If a
  stable endpoint is confirmed, promote the source Tier-3 → Tier-1 by pointing
  its parser at the backing and capturing a real fixture.
- **Promotion to `core`:** the parser-script + fixture pattern is the freshness/
  reliability story this skill needs before leaving beta.
- **Runtime-agnostic parsers (critique #2):** offer a `jq`-only extraction path
  for environments without `deno`, so the skill keeps working on curl-only
  setups instead of all-Gap.
- **Optional Tier-1-first phasing (critique #5):** the ship is large (~10
  parsers). If staging is preferred, land Tier-1 (Aider/SWE-bench/Terminal-Bench/
  τ²-bench — highest reliability ROI) first, then Tier-2 (AA API) and Tier-3 in a
  follow-up. Single-ship is the default unless the user requests staging.
