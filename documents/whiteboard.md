# Maintenance Report (2026-02-02)

## 1. Hygiene & Quality

- [ ] `scripts/test-assert.ts` seems redundant if `@std/assert` is already in `deno.json`. (Fix: Migrate to `@std/assert` and delete `scripts/test-assert.ts`)
- [ ] Unused exports: `buildTestCommand` in `scripts/task-test.ts`, `buildCheckCommands` in `scripts/task-check.ts` are only used within their respective tasks but exported. (Fix: Remove `export` if not needed for external testing)
- [ ] Test Quality: `scripts/benchmarks/lib/config.test.ts` and `types.test.ts` have very few tests (2-3) compared to the complexity of the modules.

## 2. Technical Debt

- [ ] `scripts/benchmarks/lib/trace.ts` has a hardcoded judge model name in `logEvaluation` (line 1037) which might drift from `evaluateChecklist`.

## 3. Consistency

- [ ] Terminology: Docs use "Skill" and "Command" interchangeably in some places, but `requirements.md` tries to distinguish them. Code uses `BenchmarkScenario` which sometimes refers to a skill test.
- [ ] Drift: `design.md` mentions `af-check-and-fix` as a skill, but it's not present in the root `catalog/skills/` (though mentioned in `README.md`).

## 4. Documentation Coverage

- [ ] `scripts/benchmarks/lib/runner.ts` - `runScenario` and `RunnerOptions` missing JSDoc.
- [ ] `scripts/benchmarks/lib/spawned_agent.ts` - `SpawnedAgent` class has some comments but missing formal JSDoc for methods like `run`, `start`, `monitorProcess`.
- [ ] `scripts/utils.ts` - `CommandSpec`, `runCommand`, etc. missing JSDoc.
- [ ] Most exported functions in `scripts/` lack "Why/How" documentation, focusing only on "What".
