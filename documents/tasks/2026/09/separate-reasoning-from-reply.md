---
date: 2026-09-27
status: done
implements:
  - FR-ACCEPT.ACP
tags: [acceptance, acp, trace, instrument]
related_tasks:
  - reopen-reader-context-clause
---

# Keep the reasoning summary out of the reply the judge grades

## Goal

Stop the acceptance runner from inventing defects. A judge that reads an English
reasoning headline as the first words of a Russian answer fails the reply for
something the transport did, and the failure is then investigated as a product
defect. Two of the three codex-arm failures of the 2026-09-20 chat sweep were
this, and they cost a round of analysis each.

## Overview

### Context

ACP delivers a turn as a stream of `session/update` notifications. The answer
arrives as `agent_message_chunk`, the model's reasoning summary as
`agent_thought_chunk`. Neither carries a separator, and codex emits both on every
turn.

`#onSessionUpdate` in `scripts/acceptance-tests/lib/acp/client.ts` pushed both
kinds into one per-session buffer, which became `assistantText`, which became
both the persona's view of the conversation and the `< …` reply line in the
trace the judge grades. The seam is visible in the evidence of
`agents-rules-chat-jargon` run 1:

```
**Confirming absence of SRS and SDS documents**Выгрузку нельзя включить, пока не выполнены две проверки:
```

The reply itself is clean Russian. The judge failed `russian_prose`.

The user's decision on 2026-09-27, out of three options offered, was to keep the
reasoning and mark it as its own block — not to withhold it from the trace and
not to subtract the false failures by hand.

### Current State

- One buffer for both chunk kinds; `ParsedAgentOutput` has no reasoning field.
- `AcpAgent` writes the reply as `< <text>` and has nothing to write reasoning
  to, so reasoning reaches the judge only as part of that line.
- The stub ACP agent (`acp/stub_agent.ts`) never emits a thought chunk, so no
  test could observe the glue.
- FR-READABILITY.LANGUAGE and FR-READABILITY.READER-CONTEXT both cite codex-arm
  failures that this defect produced.

### Constraints

- Reasoning must stay in the trace. On a killed turn it is often the only record
  of what the agent was doing, and the timeout path already depends on reading
  partial buffers.
- The marker must not sit on the `< ` reply line: a judge grades what follows
  `< ` as the agent's prose.
- No mocks of our own code. The test drives the real stub ACP server.
- Do not touch any checklist, fixture or shipped template. The cache key already
  covers `scripts/acceptance-tests/lib/**`, so stale verdicts invalidate on their
  own.

## Definition of Done

- [x] FR-ACCEPT.ACP: A reasoning summary never reaches the reply, and arrives as
      its own field.
  - Test: `scripts/acceptance-tests/lib/acp/client_test.ts::a reasoning summary stays out of the reply and arrives as its own field`
  - Evidence: `deno test -A --filter "reasoning summary stays out of the reply" scripts/acceptance-tests/lib/acp/client_test.ts`
- [x] FR-ACCEPT.ACP: The in-flight buffers the timeout path reads are split the
      same way, so a killed turn keeps both without mixing them.
  - Test: `scripts/acceptance-tests/lib/acp/client_test.ts::the in-flight buffer a timeout reads carries the reply without the reasoning`
  - Evidence: `deno test -A --filter "in-flight buffer a timeout reads" scripts/acceptance-tests/lib/acp/client_test.ts`
- [x] FR-ACCEPT.ACP: The trace marks reasoning as reasoning, apart from the reply
      line, and adds no block when a turn produced none.
  - Test: `scripts/acceptance-tests/lib/acp/acp_agent_test.ts::composePartialTrace marks in-flight reasoning as reasoning, apart from the reply`
  - Evidence: `deno test -A --filter "composePartialTrace" scripts/acceptance-tests/lib/acp/acp_agent_test.ts`
- [x] FR-ACCEPT.ACP: The stub ACP server can reproduce the two-notification
      shape, so the defect stays testable offline.
  - Evidence: `python3 -c "t=open('scripts/acceptance-tests/lib/acp/stub_agent.ts',encoding='utf-8').read(); assert 'THINK_MARKER' in t and 'agent_thought_chunk' in t, 'stub cannot emit reasoning'; assert 'THINK_REASONING' in t and 'THINK_REPLY' in t, 'no named fixtures for the test to assert on'; print('ok')"`
- [x] FR-ACCEPT.ACP: The design record describes the split, and both readability
      clauses stop citing the transport defect as an open one.
  - Evidence: `python3 -c "d=open('documents/design.md',encoding='utf-8').read(); r=open('documents/requirements.md',encoding='utf-8').read(); assert 'Reasoning kept out of the reply' in d, 'SDS does not describe the split'; assert 'agent-reasoning' in d and 'agent-reasoning' in r, 'marker not named'; assert 'was fixed on 2026-09-28' in r, 'clause still reads as open'; print('ok')"`
- [x] FR-ACCEPT.ACP: Repository checks stay green, including the gate-excluded
      runner test that stubs the judge by cast.
  - Test: `deno task check`
  - Evidence: `deno check scripts/acceptance-tests/lib/runner_test.ts && deno run -A scripts/check-traceability.ts`

### Verification record

- All six evidence commands pass on the committed tree. The two client tests and
  the five `composePartialTrace` tests run green; the stub assertion, the
  documentation assertion, the type-check of the gate-excluded `runner_test.ts`
  and `check-traceability` all exit 0.
- The RED phase reproduced the real seam before the fix, both at type level
  (TS2339 on `reasoningText` and `getBufferedReasoning`) and behaviourally under
  `--no-check`: the reply came back as
  `Confirming absence of SRS and SDS documentsВыгрузку нельзя включить, пока не
  выполнены две проверки.`, byte for byte the shape `judge-evidence.md` recorded
  for `agents-rules-chat-jargon` run 1.
- Full check: 867 script tests and 187 framework tests passed, 0 failed, exit 0.
  `deno fmt --check scripts framework deno.json` passes after one formatting pass
  over the three files this task edited.
- `grep -c '^[sync-plugins-local]'` over the check log returns 19: the run
  re-pointed the local plugin marketplace at this checkout. This is the main
  checkout, so the marketplace still points where it did before, but a muted
  `flowai` pack is enabled again. `env -u AUTO_INSTALL_PLUGINS` does not suppress
  this — the repository's own `.env` sets the flag and the process environment
  cannot unset a file value.
- The verdict cache needs no manual clearing: the cache key covers
  `scripts/acceptance-tests/lib/**` excluding `*_test.ts`, and this task edited
  three files under that path.

## Solution

1. Give the stub ACP server a `[[THINK]]` marker that emits an
   `agent_thought_chunk` headline and then an `agent_message_chunk` reply, with
   both strings exported so a test can assert on them.
2. Write the failing tests first: the reply equals the reply alone, the reasoning
   arrives as `reasoningText`, and the same holds for the in-flight buffers.
3. Add `reasoningText` to `ParsedAgentOutput`, documenting why it is separate.
4. Split the client's buffer in two, route each chunk kind to its own, reset both
   at turn start, carry reasoning into the success verdict and the failure
   verdict, and add `getBufferedReasoning` beside `getBufferedText`.
5. Add `REASONING_MARKER` and a fourth parameter to `composePartialTrace`; give
   `AcpAgent` a reasoning block on the completed-turn path too. Keep the
   persona's message list on the reply alone.
6. Update the SDS transport section and both readability clauses, then run the
   validators and the full check.
