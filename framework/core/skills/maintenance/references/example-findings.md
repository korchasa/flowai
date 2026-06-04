# Example findings per category

Reference for the Resolution Phase summary in [SKILL.md](../SKILL.md). One representative finding per category; the actual scan emits as many as it finds. Each line follows the shape `- [N] [Severity] <site>: <problem>. (Fix: <fix>)`. Severity is chosen per [severity-rubric.md](./severity-rubric.md); the tie-breaker is "when in doubt, pick the lower one".

```
Structural Integrity
- [1] [Medium] src/oldfile.ts: in root, should be in src/utils/. (Fix: move)

Code Hygiene
- [2] [Medium] utils.ts: unused export `myFunc`. (Fix: delete)
- [3] [High] AGENTS.md "events MUST be single-iteration": no matching test descriptor (lightweight invariant pairing). (Fix: add test)

Complexity & Hotspots
- [4] [High] src/runtime.ts: 612 LOC; bucket "thin wrapper / facade" (AGENTS.md: "declarative bindings only"), threshold 300 (> 2×). (Fix: split lifecycle into runtime/lifecycle.ts)
- [5] [High] src/adapter.ts (180 LOC): 4 concerns — parsing + protocol detection + lifecycle + formatting. (Fix: split per concern)

Documentation Health
- [6] [Medium] FR-AUTH marked [x] in SRS, no source-code reference. (Fix: add `[FR-AUTH](...)` link or revert to [ ])

Architectural Integrity
- [7] [High] runtime/index.ts ↔ runtime/process.ts: cycle via barrel re-export (TDZ trap). (Fix: drop barrel; import process.ts directly)
- [8] [High] core/process.ts:14 imports adapters/foo.ts: layer leakage; layering rule "core inward-only" violated. (Fix: invert via DI seam)

Conceptual Duplication
- [9] [High] runtime/argv.ts:permissionMap vs runtime/jsonrpc.ts:permissionFields: same decision table coded twice. (Fix: extract to runtime/permission_table.ts)
- [10] [Medium] runtime/ndjson.ts:extractItem (typed) vs runtime/jsonrpc.ts:extractItem (Record<string, any>): asymmetric typing. (Fix: collapse to typed shape)

API Contract Review
- [11] [High] RuntimeSession.send (declared streaming) vs adapters/foo.ts:send (per-message subprocess): capability-vs-impl mismatch. (Fix: downgrade flag or implement long-lived process)
- [12] [High] Usage.total_cost_usd: required `number`, set to 0 when adapter doesn't emit cost (sentinel/missing conflation). (Fix: `number | undefined`)
- [13] [Low] PermissionMode.dontAsk, PermissionMode.auto: dead enum values, zero callers and zero rejections. (Fix: remove)
- [14] [Critical] RuntimeSession.events: `AsyncIterable<T>` throws on second iteration; type-level invariant violated at runtime. (Fix: tighten to `AsyncIterableIterator<T>`)

Cross-Implementation Symmetry
- [15] [High] adapters/{a,b,c}.ts: c silently omits cancel() while a,b expose it; no `capabilities.cancel: false` tag. (Fix: explicit tag, or implement)
- [16] [High] adapters/a.ts throws TypedTimeout, adapters/b.ts emits synthetic timeout event: error-class divergence. (Fix: unify on TypedTimeout)

Defensive-Programming Smell
- [17] [Critical] adapters/foo.ts:142 `try { onEvent(e) } catch { /* ignore */ }`: silent consumer-callback swallow. (Fix: log + rethrow, or typed error event)
- [18] [Critical] exporters/transcript.ts:exportOpenCodeTranscript: catch-all returns `transcript_path: undefined`, indistinguishable from "not supported". (Fix: typed `Result<TranscriptPath, ExportError>`)

Invariant ↔ Test Pairing
- [19] [High] AGENTS.md "events MUST be single-iteration": no matching test descriptor in *_test.ts. (Fix: add test "events: throws on second iteration")
- [20] [High] tests/contract/*.ts: contract verified only against StubSession; real-binary path gated behind workflow_dispatch + E2E=1. (Fix: add unconditional smoke against real binary)

Public-Surface Quality
- [21] [Medium] mod.ts re-exports register/unregister/killAll AND ProcessRegistry methods of same name: synonym + free-fn-and-method duplication. (Fix: keep methods only; deprecate free functions)
- [22] [High] reservedFlags: ["exec", "resume", "--dangerously-skip-permissions"]: positionals exec/resume cannot enter via extraArgs. (Fix: split into reservedSubcommands + reservedFlags, or drop positionals)

Total: 22 findings — Critical: 3, High: 12, Medium: 6, Low: 1 (per category: Structural Integrity: 1, Code Hygiene: 2, Complexity & Hotspots: 2, Documentation Health: 1, Architectural Integrity: 2, Conceptual Duplication: 2, API Contract Review: 4, Cross-Implementation Symmetry: 2, Defensive-Programming Smell: 2, Invariant ↔ Test Pairing: 2, Public-Surface Quality: 2).
```
