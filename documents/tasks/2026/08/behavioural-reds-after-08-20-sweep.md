---
date: 2026-08-22
status: done
implements:
  - FR-ACCEPT.ACP
  - FR-ACCEPT-ISOLATION
  - FR-UNIVERSAL.NO-HOST-EXEC
related_tasks:
  - 2026/08/maintenance-nest-and-fixture-clobber.md
  - 2026/08/agents-rules-nest-three-red.md
---

# Ten behavioural scenarios, four kinds of cause

## Goal

The 2026-08-20 full sweep ran 314 scenarios and 34 came back red. Fourteen were
closed in earlier sessions. Of the twenty left, ten are behavioural (the rest are
trigger scenarios). Find the cause of each of the ten, fix the layer it lives in,
and prove it with a check that runs in milliseconds where one is possible.

## Overview

### Context

Worked with the `root-cause-and-fix` dev skill. Every verdict below rests on the
raw sandbox session, not on the judge's rendering, and three of them on an
interview with the agent that failed — the sandboxes outlive the run, so the
session can be resumed and asked why.

The ten split four ways.

**The harness lost the evidence (3).**

- `deep-research-plan` — the turn loop writes the assistant's text into the trace
  only after `client.prompt()` resolves, and renders `[tool-calls]` only in its
  `finally`. A global timeout abandons that promise, so a turn-1 timeout hands
  the judge the prompt header and stray stderr. The judge failed four items for
  "no evidence" while the raw session held a five-direction plan, an `mktemp`'d
  output dir and two dispatched research agents.
- `deep-research-plan` again — the injected `exit_code_zero` item was critical on
  any non-zero exit, so a behavioural scenario that times out could not pass
  however good its work. Every item in this checklist is about the plan, which
  the agent finished in its first two minutes.
- `engineer-prompts-for-reasoning-basic` — the bench empties `.claude/skills/` in
  the bench-home, but Claude Code's BUNDLED skills live outside `$HOME` and stay
  reachable. The query names a reasoning model, the bundled `claude-api` skill
  triggers on any mention of a Claude model, and its payload — one 953 KB
  attachment — ended the session with "Prompt is too long" before the framework
  skill produced anything.

**A product defect that broke the command for every user (1).**

- `engineer-command-create` — `engineer-command/SKILL.md` documented OpenCode's
  template syntax with a literal bang-backtick example. Claude Code EXECUTES
  that while expanding a slash command: `WIo` in the CLI bundle blanks ordinary
  code spans but deliberately spares any span preceded by `!`, then runs every
  match of `/(?<=^|\s)!`([^`]+)`/gm`. The run died before its first turn with
  `Shell command permission check failed for pattern "!` + "`shell command`" + `"` —
  the error quotes the file's own line. Neither a code span nor a fence escapes
  it; only breaking the whitespace before the bang does.

**The fixture broke a rule that was not the one under test (2).**

The sandbox receives the rendered `AGENTS.template.md`, which mandates SALP REFs
in code for any `[x]` FR and makes the SRS the source of truth for every FR.

- `review-doc-drift-is-warning` — FR-RENDER is `[x]` and `cli.ts` carried no REF.
  The agent graded the planted doc drift a warning exactly as the scenario asks,
  found that second, real violation, and returned Request Changes.
- `review-and-commit-flips-task-status` — the task's frontmatter says
  `implements: FR-RATE-LIMIT` and no SRS existed. The Review phase stopped and
  listed the four documents to write, so Phase 2 never ran and nothing was
  committed. Re-measured after the SRS and SDS were added: still 0/3 and still
  right — the fixture shipped no `deno.json`, so `@std/assert` resolved to
  nothing and `deno fmt --check` rejected a 98-character line in the fixture's
  own source. Two rules were broken, one behind the other.

**A rule was in the file and did not fire (4).** Each agent named the sentence.

- `review-parallel-delegation` — "Only an empty listing AND no subagent tool in
  your toolset → run inline" is permissive, so the agent ran the checks inline
  and wrote `Parallel delegation unavailable` without running the listing at
  all. Its own words: "Я не смотрел ни на что… У меня в toolset есть инструмент
  `Agent`… запись в Degradation Notes была фактически ложной".
- `review-parallel-delegation` — a clean hygiene scan and a scan that never ran
  look identical on a report that only lists findings.
- `setup-ai-ide-devcontainer-brownfield` — the rendered AGENTS.md rule about not
  re-asking inside an authorized plan beat the skill's own "MANDATORY: ask for
  explicit per-file confirmation". Its own words: "Я расценил фразу … как
  авторизацию и применил это правило, чтобы обойти MANDATORY из SKILL.md".
- `setup-ai-ide-devcontainer-brownfield` — `See references/…` is ignorable. The
  agent wrote `setup-container.sh` from its own reasoning and dropped the
  self-healing guard the template shows: "Я не открывал… Я этот указатель
  проигнорировал".
- `setup-ai-ide-devcontainer-feature-discovery` — "Skip this step only if user
  explicitly provided a complete feature list" was read as waiving BOTH the
  presentation and the wait, so the feature list appeared after the files were
  written.
- `setup-ai-ide-devcontainer-feature-discovery` — the agent scanned with plain
  `ls`, which hides dotfiles, and reported no `.envrc` in a project that has one.
  Most of the indicator catalog is dotfiles.
- `setup-ai-ide-devcontainer-feature-discovery` again — re-measured at 1/3, with
  both original items now passing and a third defect underneath: PostgreSQL and
  Redis were detected and then folded into Docker-in-Docker instead of getting
  their own lines. Interviewed, the agent said no phrase permitted it — it had
  stretched step 4's "covered by the primary stack's base image" to cover
  another FEATURE: "PostgreSQL и Redis не покрыты `typescript-node` образом — я
  просто неправомерно расширил область применения этого фильтра". The catalog's
  own presentation example already lists the two as separate lines.

**A checklist asked for what the skill forbids (1).**

- `setup-ai-ide-devcontainer-brownfield` — `valid_json` demanded strict JSON. The
  devcontainer format is JSONC, the skill's own Verify step asks for a JSONC
  parse, and every template under `references/` is a ```jsonc fence with
  comments in it. The agent was marked down for following the skill.

**The guard killed the bench, not the agent (1, found while re-measuring).**

- `review-doc-drift-is-warning` under `-n 3 -p 3` died with exit 144 and no
  verdict. The fork-loop guard resolves the agent's process group on its first
  tick, 500 ms after spawn, and `setpgrp_exec.py` had not yet reached
  `os.setsid()` — so two of the three watchdogs cached the BENCH's group
  (pgid=95123 for rootPids 95201 and 95208, which one group cannot both lead).
  Each then counted the sibling runs as its own descendants, crossed the
  threshold of 5, and SIGKILLed the bench parent. Invisible at `-p 1`, where
  the bench group is too small to cross the threshold.

**Non-determinism from the user emulator (1).**

- `ship-task-rejects-on-changes-requested` — the agent stopped correctly, then
  asked whether to record the blocker and whether to push. The emulator answered
  per persona ("wants it committed and pushed") and two commits plus a `git push`
  landed in a trace the checklist forbids them from. Re-measured after the
  persona closed the conversation at the verdict: those two items pass, and one
  run in three then stopped on the fixture's own noise instead — `deno lint`
  rejected the inline `jsr:@std/assert` specifier and `deno fmt --check`
  rejected the rendered CLAUDE.md, so the agent reported THAT and never reached
  the contract conflict.

**A checklist that outranked the skill's own exception (1).**

- `ship-pauses-for-variant-selection` — `variants_presented` demanded ≥2
  variants. The Plan Phase offers one "when the task has an obvious path … with
  no meaningful trade-offs", and a trim helper is that. The run presented
  `Variant A — full scope` and said why alternatives did not apply.
- Re-measured after the rescope: 2 of 3 passed, and the third showed a second,
  independent defect in the `plan` atom. The agent presented its one variant and
  went straight on, saying "/ship is the authorization". Interviewed, it named
  both sentences it had combined: the single-variant exception, which it read as
  "present a variant and move on", and the AGENTS.md forward-motion rule, which
  it applied INSTEAD of the selection rather than after it. Its own words: "обе
  фразы описывают другое … я обошёл, применив два несмежных правила".

### Current State

`b65952cb` was committed by a CONCURRENT session out of this working tree while
the work was in flight. It carries this session's `[ANC:fr:render]` heading and
explanatory comment, plus its own resolution of the SALP finding — rewording the
sandbox's `// [REF:fr:render]` into prose. That resolution deletes the very
marker the fixture needs, so the working tree restores the REF and the validator
was fixed instead. The commit is local-only and is left in history rather than
rewritten.

### Constraints

- Fix the layer the cause is in. Six of the ten are the harness or the fixture,
  and editing the scenarios there would quiet the tests without changing what
  the bench measures.
- Every harness fix carries a unit test in a file `deno task check` runs.
- Full sweeps stay with the user. Scenarios are re-measured one at a time.

## Definition of Done

- [x] FR-ACCEPT.ACP: a run the global timeout kills is scored on what the agent
      actually did.
  - Test: `scripts/acceptance-tests/lib/acp/acp_agent_test.ts` (3 new tests),
    `scripts/acceptance-tests/lib/runner_timeout_test.ts` (3 new tests)
  - Evidence: `deno test -A scripts/acceptance-tests/lib/acp/acp_agent_test.ts scripts/acceptance-tests/lib/runner_timeout_test.ts`
- [x] FR-ACCEPT-ISOLATION: the CLI's bundled skills cannot win the routing in a
      sandbox.
  - Test: `scripts/acceptance-tests/lib/acp/auth_test.ts::bench-home disables the CLI's bundled skills`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/acp/auth_test.ts`
- [x] FR-UNIVERSAL.NO-HOST-EXEC: no distributed body carries a bang-backtick
      shell interpolation the host CLI would execute.
  - Test: `scripts/check-skills_test.ts` (3 new tests)
  - Evidence: `deno run -A scripts/check-skills.ts` — reported the one
    violation before the fix, silent after
- [x] FR-ACCEPT.RULES: the ten scenarios pass.
  - Benchmark: one `deno task acceptance-tests -f <id> -n 3 -p 3` per scenario
  - Evidence: recorded under Results below — 10 of 10 at 3/3, except
    `deep-research-plan`, which is 3/3 with one warning per run (exit 124)

## Solution

1. `composePartialTrace` in `acp_agent.ts` + `AcpClient.getBufferedText` — the
   partial trace now carries the in-flight turn's assistant text and the live
   tool-call list.
2. `exitCodeCheckIsCritical` in `runner.ts` — a timeout with a live trace makes
   the injected exit-code item a warning. An empty trace still blocks.
3. `prepareAcpClaudeHome` exports `CLAUDE_CODE_DISABLE_BUNDLED_SKILLS=1`.
4. `validateShellInterpolation` in `check-skills.ts` + the reworded line in
   `engineer-command/SKILL.md`.
5. `adoptablePgid` in `process_watchdog.ts` — a PGID that is not the root's own
   is never adopted; the tick re-resolves, and after 60 samples the guard
   disables itself rather than scan a group it does not own.
6. `check-salp.ts` — `keepOnlyCommentLines` became a character-level scanner, so
   SALP tokens a scenario writes into a sandbox are read as neither anchors nor
   references of THIS repo. Fixed by a subagent; three tests added.
7. Fixtures: SALP anchor + code REF in the `doc-drift` scenario; SRS, SDS and
   code REFs in the `flips-task-status` fixture.
8. `framework/atoms/review.md` — the delegation check is blocking and must quote
   its listing; the hygiene outcome is reported even when clean.
9. `setup-ai-ide-devcontainer/SKILL.md` — dotfile-aware scan; presentation always
   runs and only the wait is waivable; the confirmation outranks forward-motion
   and says what compliance produces; reading the template is a step.
10. Scenarios: `valid_json` asks for JSONC; `variants_presented` checks that a
   choice was offered; the `ship-task` persona closes the conversation at the
   verdict.

## Results

- `engineer-command-create` — **3/3 PASSED** (threshold 2/3). Before the fix the
  run died before its first turn on the bang-backtick line the CLI executed.
- `engineer-prompts-for-reasoning-basic` — **3/3 PASSED**. Before the fix the
  bundled `claude-api` skill won the routing and ended the session on
  "Prompt is too long".
- `deep-research-plan` — **3/3 PASSED**, each run still exit 124 and now with
  one warning instead of a blocking error. The partial trace carried the plan
  the judge previously could not see.
- `review-doc-drift-is-warning` — **3/3 PASSED** after the PGID fix. The first
  attempt at `-p 3` never produced a verdict: the guard killed the bench.
- `review-parallel-delegation` — **3/3 PASSED**. The delegation check is now
  blocking and the hygiene outcome is reported even when the scan finds
  nothing.
- `review-and-commit-flips-task-status` — **3/3 PASSED** once the fixture also
  shipped a `deno.json` and formatted sources. Two rounds: SRS/SDS/REFs first,
  then the project checks the review runs.
- `ship-pauses-for-variant-selection` — 2/3 after the rescope, **3/3 PASSED**
  after the `plan` atom said that the single-variant exception cuts the number
  of options and not the wait, and that invoking the command is not the choice.
- `ship-task-rejects-on-changes-requested` — 2/3 after the persona fix,
  **3/3 PASSED** once the fixture mapped `@std/assert` and excluded the
  instruction files from `deno fmt`.
- `setup-ai-ide-devcontainer-brownfield` — **3/3 PASSED**. The confirmation now
  outranks forward-motion, reading the template is a step, and `valid_json`
  asks for the JSONC parse the skill itself prescribes.
- `setup-ai-ide-devcontainer-feature-discovery` — 1/3, then **3/3 PASSED** once
  step 4 said the base image is the only thing that removes a need and step 6
  said every fired mapping gets its own line.

All ten are green at `-n 3`. Three of them needed a second round: fixing the
first blocker exposed the next one underneath, and only re-measuring showed it.

