---
date: 2026-08-21
status: to do
implements:
  - FR-ACCEPT.RULES
related_tasks:
  - 2026/08/agents-rules-nest-three-red.md
---

# Teach the shipped diagnosis skill to read the raw session and interview the agent

## Goal

`diagnose-benchmark-failure` is the skill flowai ships for exactly one job:
find out why a benchmark failed before anyone edits a SKILL.md. It reads the
judge's rendering and stops there. Two evidence sources that repeatedly decided
real diagnoses in this repo are absent from it — the raw agent transcript, and
the failed agent itself. Users of the framework get the weaker procedure.

## Overview

### Context

Both gaps were paid for in this repo, twice each.

The raw transcript: on 2026-08-10 two `parallel_delegation` scenarios were
diagnosed for two rounds as "the harness exposes no subagent tool", on the
strength of the agent's own claim quoted in `judge-evidence.md`. The raw
sessions showed `Task` invoked in the runs that passed and absent in the runs
that failed — the capability was there and the agent's assertion was false. A
tool-call count separates "cannot" from "did not" in one command; the judge's
prose never will.

The interview: on 2026-08-21 `agents-rules-stop-analysis` took four fixes.
Three rounds of sharpening a prohibition moved the score from 0/3 to 0/3.
Resuming each failed sandbox session and asking it neutrally why it chose what
it chose pointed all three runs at the same sentence in one round — a carve-out
added as a guard that had become the escape hatch. The next fix was green.

Both lessons are already recorded for this repo (`AGENTS.md` §Diagnosing
Failures, and the dev skill `root-cause-and-fix`). Neither reached the product.

### Current State

`framework/engineering/skills/diagnose-benchmark-failure/SKILL.md`, 239 lines.
Rule 1 names three evidence sources — `judge-evidence.md`, the sandbox
`SKILL.md`, the scenario `mod.ts` — and the word `jsonl` does not appear in the
file. Step 2 extracts tool calls from `judge-evidence.md`'s rendered
`## Tool: <name>` lines, which is the judge's rendering, not the trace.

One execution scenario exists (`md-prior-bullets`) plus the three trigger
scenarios. The execution scenario stages a failed run under `benchmarks/runs/`
and the scenario source under `.../benchmarks/<scenario>/mod.ts`; the repo has
since moved both to `acceptance-tests/`. Step 1 of the skill already says
`acceptance-tests/runs/latest/`, while step 3 still greps for
`*/benchmarks/<scenario>/mod.ts` — the file contradicts itself.

### Constraints

- Acceptance Test TDD: the scenario is written and run RED before the SKILL.md
  is touched.
- The interview step cannot be executed inside a sandbox (it needs a resumable
  session and live auth), so what is tested is that the report NAMES it as the
  next evidence step when the proposed fix is a wording change. This is stated
  in the scenario file rather than left implicit.
- Both new capabilities share one execution path over one fixture, so they get
  ONE scenario, per the near-duplicate rule in AGENTS.md.
- Report-only: the skill must still edit nothing.

## Definition of Done

- [ ] FR-ACCEPT.RULES: a scenario stages a failed run whose `judge-evidence.md`
      asserts a capability was unavailable while the raw transcript shows the
      tool was invoked, and it fails on the current SKILL.md.
  - Test: `deno task acceptance-tests -f diagnose-benchmark-failure-raw-session -n 1`
  - Evidence: RED run scores below threshold with the transcript unread
- [ ] FR-HOWTO: the skill reads the raw `.jsonl` transcript as a required
      evidence source and prefers it over the judge's rendering on conflict.
  - Test: same scenario, checklist items `read_raw_session`,
    `rejects_judge_claim`, `classification_follows_transcript`
  - Evidence: 2/3 or better on `-n 3`
- [ ] FR-HOWTO: when the proposed fix is a wording change, the report names
      resuming the failed session and asking it why, with the command.
  - Test: same scenario, checklist item `names_interview_step`
  - Evidence: same run
- [ ] FR-HOWTO: the skill's own paths agree — `acceptance-tests/`, not
      `benchmarks/`.
  - Test: `grep -c "benchmarks/" framework/engineering/skills/diagnose-benchmark-failure/SKILL.md`
  - Evidence: 0 hits for the stale run-dir and scenario-source paths

## Solution

1. Author `framework/engineering/skills/diagnose-benchmark-failure/acceptance-tests/raw-session/`
   with a fixture staging a failed `parallel-delegation` run: judge prose
   claiming no subagent tool, a raw `.jsonl` showing `Task` invoked twice, the
   sandbox SKILL.md, and the scenario source.
2. Run it. It MUST fail — the current skill never opens the transcript.
3. Add the raw session to rule 1 and to the step list, with the `jq` histogram
   and the conflict rule (transcript beats rendering). Add the interview as the
   step after classification, gated on "the fix is a wording change", with the
   resume command. Fix the stale `benchmarks/` paths.
4. Re-run `-n 3`. Hand the full sweep for the primitive to the user.
