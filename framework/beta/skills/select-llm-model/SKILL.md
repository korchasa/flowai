---
name: select-llm-model
description: Recommend which LLM model to use for a task. Use when asked "which model / best LLM for X", "pick a model for this task", or for a model shortlist ranked by live leaderboard evidence (coding, reasoning, agentic, tool-use, price, speed). Live-fetches public leaderboards and ranks models with per-axis rationale and citations.
---

# Select LLM Model

Task-driven LLM recommender. Input: a free-form task description. Output: a
ranked shortlist of models, each with per-axis rationale, a source citation,
and the fetch timestamp — plus an explicit list of data gaps.

Data is fetched **live at invocation time** from public leaderboards (no bundled
snapshot). Standings move continuously; a recommendation is only as fresh as the
fetch behind it, so every answer states when it fetched.

## Operating principles

- **Fail-fast, never fabricate.** If no fetch path works, STOP and say so. If a
  source fails or lacks a model, record it as a Gap — never invent a score.
- **Cite everything.** Each model's per-axis score names the source it came from
  and the fetch timestamp. No uncited rankings.
- **Disclose assumptions.** When the task is vague, state the axis weights you
  assumed before ranking.

## Phase 0 — Fetch method

Fetch over the shell so the method is portable across IDEs: use
`curl -fsSL <url>` for every source (fall back to `wget -qO- <url>`). Detect
tool absence from the first fetch attempt — if the shell reports BOTH `curl` and
`wget` as `command not found`, **STOP**: report "No shell fetch tool
(curl/wget) available — cannot retrieve live leaderboard data; not fabricating a
recommendation." Do not guess model standings from memory.

(If your IDE also exposes a built-in fetch tool you MAY use it, but the shell
path is the portable default and the one this skill is verified against.)

## Phase 1 — Derive capability axes from the task

Read the task description and assign a 0–3 weight to each capability axis. Use
the keyword cues below as a starting point, then adjust to the task's intent.

| Axis | Cues in the task |
|---|---|
| intelligence | "general", "hard problem", "reasoning-heavy", unspecified |
| coding | "code", "implement", "bug", "refactor", language names |
| agentic-coding | "agent", "autonomous", "multi-file", "repo-level", "SWE" |
| diff-edit | "edit existing code", "apply a patch", "diff", "in-place" |
| reasoning | "prove", "math", "logic", "PhD", "science" |
| knowledge | "obscure facts", "expert domain", "broad knowledge" |
| fluid-reasoning | "novel puzzle", "abstract pattern", "no prior examples" |
| tool-use | "call tools", "function calling", "API orchestration", "dialogue" |

Rules:

- **Vague task → balanced profile.** If no axis stands out, weight
  `intelligence` highest and the rest evenly, and DISCLOSE: "Task under-specified
  — ranked on a balanced general-purpose profile."
- **Price / speed are NOT capability weights.** Treat a stated budget
  ("under $X/Mtok", "cheap") or latency need ("fast", "low latency") as a
  post-rank **filter / tie-breaker** only. When the task says nothing about cost
  or latency, they do not enter the score — a zero weight must never dominate.

## Phase 2 — Select sources and fetch

Fetch ONLY the sources mapped to a non-zero axis (a pure-coding task skips the
reasoning/tool-use sources). The fetch column is the per-source method.

| Source | URL | Fetch | Extract | Axis |
|---|---|---|---|---|
| Artificial Analysis | https://artificialanalysis.ai/leaderboards/models | `curl -fsSL` | composite intelligence index, $/Mtok, tokens/s | intelligence, price, speed |
| LMArena | https://arena.ai/leaderboard/text | `curl -fsSL` | Elo per model | human-preference |
| LLM-Stats | https://llm-stats.com | `curl -fsSL` | composite score | cross-check |
| SWE-bench Verified | https://swebench.com | `curl -fsSL` | % resolved | agentic-coding |
| Terminal-Bench | https://tbench.ai | `curl -fsSL` | % solved | agentic-coding |
| Aider Polyglot | https://aider.chat/docs/leaderboards | `curl -fsSL` | % completed | diff-edit |
| GPQA Diamond | https://artificialanalysis.ai/evaluations/gpqa-diamond | `curl -fsSL` | % | reasoning |
| HLE | https://agi.safe.ai | `curl -fsSL` | % | knowledge |
| ARC-AGI | https://arcprize.org | `curl -fsSL` | % | fluid-reasoning |
| τ²-bench | https://sierra.ai/tau2-bench | `curl -fsSL` | pass@1 | tool-use |

For each fetched page, extract the model→score rows. **A source whose fetch
fails, returns no usable rows, or lacks an expected field becomes a Gap** —
record `<source>: <reason>` and move on. Never silently drop it and never
substitute a remembered value. (Many of these pages are JS-rendered; if the raw
HTML carries no parseable table, that source is a Gap — disclose it.)

## Phase 3 — Normalize and rank

Raw source scales are incomparable (Elo ≈ 1000–1400, benchmark percentages
0–100, price in $/Mtok). Before combining:

1. Per axis, convert each model's raw score to a **rank or percentile within the
   fetched set** for that axis.
2. Weighted-sum the per-axis percentiles using the Phase-1 weights.
3. Apply price/speed filters or tie-breakers only if the task stated them.
4. A model missing from an axis is marked **"no data"** for that axis and
   excluded from that axis's average — do NOT treat missing as zero (that would
   distort the weighted sum).

## Phase 4 — Output

Report, in this order:

1. **Assumed axis weights** (and the vague-task disclosure if it applied).
2. **Ranked shortlist** (top 3–5). For each model: overall rank, then one line
   per contributing axis giving the source, the model's standing on that axis,
   and that this came from the live fetch.
3. **Fetch timestamp** — when the data was retrieved (UTC).
4. **Gaps** — every source that failed or lacked a model, with the reason.

If every source ended up a Gap (nothing fetched successfully), do NOT produce a
ranking — report the gaps and stop. Partial data is fine: rank on what you have
and disclose the rest.

## Scope

Recommender only. It does not benchmark models itself, does not bundle a dataset,
and does not promise freshness beyond the fetch it just performed.
