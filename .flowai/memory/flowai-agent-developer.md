# Developer Agent Memory

## Anti-patterns
- Do not use `git add -A` -- stage only task-specific files
- Benchmark scenarios are definitions (not executable tests) -- they export class instances, not test functions
- Check for pre-existing changes before starting implementation (previous run may have left uncommitted edits)

## Effective strategies
- Read all source files in parallel before editing
- For skill changes: benchmark TDD means write the scenario file first, verify it compiles, then edit skill files
- Use Edit tool for surgical changes to existing files
- When files already contain changes from a prior run, verify correctness and run checks rather than re-implementing

## Environment quirks
- `deno task check` runs fmt + lint + test + skill compliance + agent check + sync check + pack refs + naming prefix
- Benchmark files use `@bench/types.ts` import map alias
- `.flowai/runs/` is gitignored -- must use `git add -f` for artifacts there
