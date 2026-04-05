# Design Agent Memory

## Anti-patterns

- Do not add unnecessary config volumes/mounts when the tool reads from workspace (flowai reads .flowai.yaml from project root).
- Do not add conditional sub-questions to Step 4 unless the spec explicitly requires them -- keep the interview flow simple.

## Effective strategies

- Parallel exploration (prior art + architecture + integration) completes in one tool call round.
- Following existing patterns (Claude Code / OpenCode table rows) makes variants obvious and reduces risk.
- Checking the spec's scope boundaries early prevents wasted effort on excluded items.

## Environment quirks

- `.flowai/runs/` is gitignored -- must use `git add -f` for artifacts.
- Memory files also need `git add -f` if under `.flowai/`.
- Benchmark files under `framework/*/skills/*/benchmarks/` are excluded from lint (deno.json lint.exclude).

## Baseline metrics

- Turns: ~6 (read protocols + spec + exploration + write)
- Files read: 10
- Variants: 3 (A selected)
