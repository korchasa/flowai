---
date: 2026-09-30
status: done
implements:
  - FR-ACCEPT.ACP
tags: [acceptance, codex, models]
---
# Move the acceptance codex arm from gpt-5.6-terra to gpt-6-luna

## Goal

Acceptance scenarios should measure the framework on the model users now run.
The user asked to replace `gpt-5.6-terra` with `gpt-6-luna` everywhere terra
was the working model.

## Overview

### Context

A first probe ran 8 scenarios that have cached terra verdicts on `gpt-6-luna`,
one run each, `--no-cache`, in a scratch worktree. 7 of 8 passed. The eighth,
`select-llm-model-source-parse-failure-becomes-gap`, did the right work and
failed only on the deterministic `skill_invoked` item.

### Current State

- `acceptance-tests/config.json` named `gpt-5.6-terra` as the codex default.
- The codex bridge was pinned at `@agentclientprotocol/codex-acp@1.1.7`, which
  bundles `@openai/codex` 0.145.0. The server refuses every `gpt-6-*` model for
  a ChatGPT account on that client ("not supported when using Codex with a
  ChatGPT account"). Bridge 2.0.1 depends on `@openai/codex` ^0.159.1 and runs
  luna.
- Bridge 2.0.1 reports a one-file `cat`/`sed` as a parsed `read` action:
  `kind: "read"`, `title: "Read file '<path>'"`, `locations`, and no
  `rawInput.command`. `detectSkillInvocation` only looked at
  `rawInput.command`, so a codex skill load became invisible.

### Constraints

- The registry fingerprint is part of the verdict cache key, so the bridge bump
  invalidates every cached codex verdict. That is intended.
- The same registry drives the SWE-rebench benchmark. Its frozen pool
  `scripts/benchmark/pools/codex-terra-medium.json` was selected against the
  terra baseline, so the benchmark default model (`scripts/benchmark.ts`) is
  NOT changed here — switching it needs a new baseline campaign and pool, and
  that is a separate decision.
- Historical measurements that name terra (task files, research, SRS status
  lines, capture comments, test fixtures, benchmark cells) stay as they are.
- The claude Read tool (`Read <path>`) must still not count as invocation.

## Definition of Done

- [x] FR-ACCEPT.ACP: the codex default arm is `gpt-6-luna`.
  - Test: `acceptance-tests/config.json`
  - Evidence: `jq -e '.ides.codex.default_agent_model == "gpt-6-luna" and (.ides.codex.agent_models | index("gpt-5.6-terra") == null)' acceptance-tests/config.json`
- [x] FR-ACCEPT.ACP: the codex bridge is pinned at 2.0.1 and installed.
  - Test: `scripts/acceptance-tests/lib/acp/registry.ts`
  - Evidence: `grep -c 'version: "2.0.1"' scripts/acceptance-tests/lib/acp/registry.ts && test -d .acp-bridges/agentclientprotocol__codex-acp@2.0.1`
- [x] FR-ACCEPT.ACP: a codex-acp 2.x parsed read of `skills/<name>/SKILL.md` counts as invocation; a longer name and a non-SKILL file do not.
  - Test: `scripts/acceptance-tests/lib/skill_invocation_test.ts::detectSkillInvocation: codex-acp 2.x reports a SKILL.md read as a parsed read action`
  - Evidence: `deno test -A scripts/acceptance-tests/lib/skill_invocation_test.ts` — 15 passed; the new test failed before the fix
- [x] FR-ACCEPT.ACP: a live luna run scores `skill_invoked` from the trace.
  - Test: `Benchmark: select-llm-model-source-parse-failure-becomes-gap`
  - Evidence: `deno task acceptance-tests -f select-llm-model-source-parse-failure-becomes-gap -n 1 --no-cache` — run `2026-09-30T19-40-23`, `skill_invoked` passed deterministically. The scenario itself failed `reports_gaps`: the agent stopped on the missing `AA_API_KEY` without running the parser; terra failed the same step (`ran_parser_pipe`, 75).
- [x] Docs name the new pin and the new detector shape.
  - Evidence: `grep -c 'codex-acp@2.0.1' documents/design.md documents/requirements.md` and `grep -c "Read file '<path>'" documents/design.md`
- [x] `deno task check` is green.
  - Evidence: `deno task check` — EXIT 0

## Solution

1. Bump the codex bridge pin in `scripts/acceptance-tests/lib/acp/registry.ts`
   to 2.0.1 and record why in its doc comment; run `deno task acp-bridges`.
2. Add a failing test for the parsed-read shape, then teach
   `detectSkillInvocation` to check `locations` of a `kind: "read"` call whose
   title starts with the codex-specific `Read file '`.
3. Replace `gpt-5.6-terra` with `gpt-6-luna` in `acceptance-tests/config.json`.
4. Update the SDS (transport pin, deterministic scoring), the SRS benchmark IDE
   clause (current pin) and the `AGENTS.md` note that named terra as the
   default arm.
5. Re-run the scenario that failed on detection, then `deno task check`.
