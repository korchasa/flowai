---
date: "2026-06-14"
status: done
implements: [FR-MODEL-SELECT]
tags: [beta, skill, llm, cli, subcommands, openrouter, benchmarks]
related_tasks: [2026/06/select-llm-model-source-scripts.md]
---
# `select-llm-model` — Subcommand CLI Tools (`benchmarks` + `openrouter`)

## Goal

Replace the "one parser per source dumps everything to stdout" model with **two
agent-driven CLI tools with subcommands**, so the agent queries data targeted
(by category / benchmark / model / provider) instead of swallowing a firehose.
Also add OpenRouter **per-provider** breakdown (input/output price, reliability)
and a model-level **speed** metric.

## Overview

### Context

User redesign across this session: scripts must be subcommand tools the agent
drives, not bulk dumpers. Exactly **two** executables: `benchmarks` and
`openrouter`. Agent learns the closed set of **categories** from SKILL.md (so
`--category` can be required); **benchmark** names it need not know (omit →
all benchmarks of the category). OpenRouter per-provider data requested:
input/output price + reliability (latency/throughput dropped — both `null` in
the documented API; AA model-level `speed` kept as the only throughput proxy).

### Current State

- `framework/beta/skills/select-llm-model/scripts/` (flat, FR-UNIVERSAL.REFS):
  `types.ts` (ScoreRow + helpers), `sources.ts` registry + `sources_test.ts`
  parity, `parse-artificial-analysis.ts` (15 evals + price + speed, grouped),
  `parse-openrouter.ts` (blended price + context), `parse-aider.ts` (diff-edit),
  `parse-steel.ts` (web-agent/computer-use/swe-bench), each with `_test.ts`.
- Each `parse-*.ts` is a standalone `curl | deno run` filter (stdin→JSON).
- SKILL.md Phase 2 = per-source `curl … | deno run scripts/parse-*.ts` pipes.
- Acceptance scenarios mock `curl` (single static block payload).

### Constraints

- **Two executables only**: `benchmarks.ts`, `openrouter.ts`. Existing
  `parse-*.ts` become INTERNAL importable parsers reused by the CLIs (keep their
  unit tests). Flat `scripts/` (no nested dirs).
- **Standalone-runnable** (`jsr:` deps, no import map).
- **Fail-fast / Gap**: non-zero exit on unparseable/empty/missing-key/unknown
  model; SKILL.md Gap path unchanged. Never fabricate.
- **latency/throughput honesty**: not in documented API → NOT emitted (verified
  null on 4 models; frontend stats endpoints 404).
- **Mock seam**: fetching subcommands self-fetch by default AND accept
  `--input <file|->`; acceptance tests pipe `curl … | deno run … --input -` so
  the existing `curl` mock hook still fires (Variant A, user-selected).
- **Category set is closed + lives in SKILL.md** (agent knows it → `--category`
  required). Benchmark names optional.

## Definition of Done

- [x] FR-MODEL-SELECT: `catalog.ts` — closed category→[{benchmark,source,axis}]
      map bridging user-facing benchmark names (gpqa, livecodebench, …) to each
      parser's internal axis; `catalog_test.ts` asserts every benchmark's
      `(source,axis)` is actually emitted by its parser against an inline fixture
      (no orphan benchmark names).
  - Test: `framework/beta/skills/select-llm-model/scripts/catalog_test.ts`
  - Evidence: `deno test -A framework/beta/skills/select-llm-model/scripts/catalog_test.ts`
- [x] FR-MODEL-SELECT: `benchmarks.ts` CLI — subcommands `scores`
      (`--category` required; `--benchmark`/`--model`/`--top`/`--key` optional)
      and `model` (`--name` required; `--category`/`--benchmark`/`--key`
      optional). Fetches only the source(s) backing the requested
      category/benchmark; relabels rows to benchmark names; self-fetch +
      `--input` seam; `--format json|table`; unknown category → exit≠0.
  - Test: `framework/beta/skills/select-llm-model/scripts/benchmarks_test.ts`
  - Evidence: `deno test -A framework/beta/skills/select-llm-model/scripts/benchmarks_test.ts`
- [x] FR-MODEL-SELECT: `openrouter.ts` CLI — subcommands `models`
      (`--match`/`--top`), `price` (`--match`/`--sort blended|input|output`/`--top`),
      `providers` (`--model` required; `--sort price|uptime`; output input/output/
      cache_read?/uptime_30m/uptime_1d/context/quantization/status — NO
      latency/throughput), `speed` (`--match`/`--top`/`--key`; AA median tok/s).
      New `/endpoints` parser for `providers`; reuses `parse-openrouter.ts`.
  - Test: `framework/beta/skills/select-llm-model/scripts/openrouter_test.ts`
  - Evidence: `deno test -A framework/beta/skills/select-llm-model/scripts/openrouter_test.ts`
- [x] FR-MODEL-SELECT: SKILL.md rewritten — Phase 2 lists the closed category set
      + the subcommand calls (`deno run scripts/benchmarks.ts scores --category …`,
      `… openrouter.ts price …`); Phase 4 adds per-provider deployment enrichment
      for the shortlist (`openrouter.ts providers --model <slug>`); Phase 3 group
      collapse retained. Existing per-source pipe table removed.
  - Benchmark: `select-llm-model-recommends-for-coding-task` (mock `curl` =
    benchmarks-scores JSON; agent pipes `curl … | deno run scripts/benchmarks.ts
    scores --category diff-edit --input -`)
  - Evidence: `deno task acceptance-tests -f select-llm-model-recommends-for-coding-task`
- [x] FR-MODEL-SELECT: docs synced — SRS FR description + SDS §3.21 describe the
      two-CLI subcommand surface, category set, per-provider enrichment, dropped
      latency/throughput; `deno task check` green.
  - Test: `documents/requirements.md` + `documents/design.md`
  - Evidence: `deno task check` → EXIT 0

## Solution

### Architecture

Two thin CLI front-ends over the existing pure parsers:

```
deno run -A scripts/benchmarks.ts scores --category coding [--benchmark livecodebench] [--model …] [--top N]
deno run -A scripts/openrouter.ts  providers --model openai/gpt-4o
```

- **`catalog.ts`** — single source of truth for the closed category set and the
  benchmark→(source,axis) bridge. The CLIs resolve `--category`/`--benchmark` →
  the set of (source,axis) pairs to fetch, fetch each source once, run its
  parser, keep rows whose `axis` matches, relabel `axis`→benchmark name in output.
- **Fetch seam (final):** the SKILL.md mandates the ONE canonical form
  `curl <url> | deno run scripts/<tool>.ts <subcmd> … --stdin`. `--stdin` reads
  the piped bytes; `--input <file>` reads a file. Tools CAN self-fetch (spawn
  `curl`) when the pipe is omitted, but the SKILL.md does NOT advertise that —
  acceptance proved the self-fetch path bypasses the `curl` mock and lets the
  agent dismiss fixture data as "stubs", so the skill forbids it. Tests +
  acceptance use the `curl … | … --stdin` pipe.
- **`openrouter.ts providers`** needs a NEW parser over `/api/v1/models/<slug>/
  endpoints` (`parseEndpoints`, folded INTO `openrouter.ts` rather than a separate
  `parse-*.ts` file, to keep `sources_test.ts` parity intact): per `endpoints[]` →
  `{provider_name, pricing.prompt→input, pricing.completion→output,
  pricing.input_cache_read→cache_read?, uptime_last_30m, uptime_last_1d,
  context_length, quantization, status}`. latency/throughput NOT read.
- **`speed`** reads AA's `median_output_tokens_per_second` (already parsed by
  `parse-artificial-analysis.ts` as axis `speed`); openrouter CLI fetches AA and
  filters that axis.

### Files

- Create: `catalog.ts`, `benchmarks.ts`, `openrouter.ts` (endpoints parser
  `parseEndpoints` folded in) + sibling `_test.ts` for each; `round()` helper in
  `types.ts`.
- Modify: `SKILL.md` (Phase 2/3/4), `sources.ts` (stays config; parity test
  tolerates the 2 new CLI files + the new endpoints parser), `documents/
  requirements.md`, `documents/design.md`.
- Acceptance: `recommends-for-coding-task/mod.ts` + `cites-sources/mod.ts` mock
  payload becomes benchmarks-`scores` JSON; checklist asserts the agent ran a
  `benchmarks.ts scores --category …` pipe.

### Verification

- `deno test -A framework/beta/skills/select-llm-model/scripts/` — all units.
- `deno task acceptance-tests -f select-llm-model-recommends-for-coding-task`.
- `deno task check` — fmt/lint/test + SRS/SDS/SALP validators.
- Full acceptance sweep (`-f select-llm-model`) — user-run CHECK.

## Follow-ups

- Runtime-agnostic (`jq`-only) path for non-Deno environments.
- latency/throughput if OpenRouter exposes a stable endpoint (currently 404).
