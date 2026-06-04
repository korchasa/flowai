---
date: 2026-06-04
status: to do
implements:
  - FR-ACCEPT.OPENCODE
tags: [acceptance-tests, adapters, opencode]
related_tasks: []
---

# OpenCode Adapter for Acceptance Test Runner

## Goal

Restore capability parity across the four IDEs declared as supported by the project (Cursor, Claude Code, OpenCode, OpenAI Codex) by implementing the missing `OpencodeAdapter` in the acceptance-test runner. Today, `"opencode"` sits in the `AgentAdapter.ide` union as a dead enum value — declared but never realised.

## Overview

### Context

`scripts/acceptance-tests/lib/adapters/types.ts:5` declares:

```ts
readonly ide: "cursor" | "claude" | "opencode" | "codex";
```

but only `ClaudeAdapter`, `CodexAdapter`, and `CursorAdapter` implement the interface. README §Packs, SDS §2, and `documents/ides-difference.md` all list OpenCode as a first-class target. The CLI distribution side already speaks OpenCode (`scripts/acceptance-tests/lib/cli-internals.ts` mirrors the flowai-cli OpenCode frontmatter transform); only the benchmark-runner side is missing.

External CLI of record: `opencode` (or `opencode-agent` — confirm during data-first probe). See `framework/ide-bridge/skills/ai-ide-runner/references/runtimes.md` for the runner expectations across IDEs.

### Current State

- `scripts/acceptance-tests/lib/adapters/{claude,codex,cursor}.ts` — implementations.
- `scripts/acceptance-tests/lib/adapters/types.ts` — interface + IDE union.
- `scripts/acceptance-tests/lib/adapters/mod.ts` — adapter registry.
- `scripts/acceptance-tests/lib/cli-internals.ts` — OpenCode frontmatter rules already present (`opencode_tools`, `IDE_FIELDS.opencode`).
- No `opencode.ts`, no `opencode_test.ts`.

### Constraints

- Standalone-runnable scripts; `jsr:` specifiers only.
- Must use the project's existing acceptance-test interface — no new contracts.
- Data-first: probe `opencode --help` / inspect a real session output BEFORE designing `parseOutput`. Do NOT assume Claude-style or Codex-style streaming.
- Cross-Implementation Symmetry: match the field+method shape of the existing three adapters.

## Definition of Done

- [ ] FR-ACCEPT.OPENCODE: `OpencodeAdapter` class implements `AgentAdapter` with `ide = "opencode"`.
  - Evidence: `grep -l "class OpencodeAdapter" scripts/acceptance-tests/lib/adapters/opencode.ts`
- [ ] FR-ACCEPT.OPENCODE: Adapter registered in `mod.ts`.
  - Evidence: `grep -n OpencodeAdapter scripts/acceptance-tests/lib/adapters/mod.ts`
- [ ] FR-ACCEPT.OPENCODE: Unit tests cover `buildArgs` (initial + resume), `parseOutput` (success + error), `getEnv`.
  - Test: `scripts/acceptance-tests/lib/adapters/opencode_test.ts`
  - Evidence: `deno test scripts/acceptance-tests/lib/adapters/opencode_test.ts` passes.
- [ ] FR-ACCEPT.OPENCODE: At least one existing scenario runs green against the adapter end-to-end.
  - Evidence: record `--ide opencode` session id in the task close-out.

## Solution

To be filled after data-first probe of the `opencode` CLI and a variant selection (e.g., NDJSON streaming vs single-JSON output, sandbox bypass flags, model defaults).
