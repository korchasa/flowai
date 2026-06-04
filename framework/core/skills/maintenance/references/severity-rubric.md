# Severity rubric for maintenance findings

Reference for the Scan Phase in [SKILL.md](../SKILL.md). Every finding the audit emits MUST carry exactly one of four tiers:

- `[Critical]` — runtime fatality, silent data corruption, or security exposure.
- `[High]` — observable contract violation, widespread compile/lint break, or documented invariant broken.
- `[Medium]` — code-quality regression, dead surface, doc drift, or threshold exceeded by 1.5×–2×.
- `[Low]` — single-touch nit, isolated TODO, cosmetic doc gap.

## Anti-inflation tie-breaker

**When in doubt between two tiers, pick the lower one.** A wrong-too-low call is corrected by the user in the Resolution Phase; a wrong-too-high call inflates the Critical share and devalues the signal for the next sweep. The Verify Findings gate (SKILL.md Step 17.5) quotes the rubric anchor that justifies the chosen tier; if you cannot point at the anchor, drop one tier.

## Cross-category meta-rules (apply BEFORE per-category mapping)

These rules override the per-category default when they fire:

1. **Runtime fatality, silent data corruption, or security exposure → `[Critical]`** regardless of which category surfaces the finding.
2. **Stub-only coverage of a documented architectural invariant → `[High]`** (Cat 15).
3. **Single isolated TODO without urgency markers → `[Low]`** (Cat 4). A cluster of 5+ TODOs in one file OR a single `XXX`/`HACK`/`FIXME` marker → `[Medium]`.
4. **Numeric threshold exceeded by ≤ 1.5× → `[Medium]`**; > 2× → `[High]`; running-out-of-budget proven by a quote from the code path → `[Critical]`.

## Per-category mapping

Each row maps a finding shape to its default tier. Anchors are stable so the Verify Findings gate can quote them (e.g. `severity-rubric.md#cat-14-silent-swallow`).

### Cat 1 — Structural Integrity {#cat-1-structural-integrity}

- File in the wrong directory, callers updated → `[Medium]`.
- File in the wrong directory, callers still broken → `[High]`.
- Config file missing at the expected location (build can still run via defaults) → `[Medium]`.
- Config file missing AND build/lint cannot run → `[High]`.
- Dead/empty directory → `[Low]`.

### Cat 2 — Code Hygiene {#cat-2-code-hygiene}

- Unused export reachable via public surface → `[Medium]`.
- Unused private symbol → `[Low]`.
- Unused import → `[Low]`.
- Test with no assertion or trivial `expect(true)` → `[High]` (false safety).
- Commented-out test block → `[Medium]`.

### Cat 3 — Complexity & Hotspots {#cat-3-complexity-hotspots}

- File over the bucket threshold by ≤ 1.5× → `[Medium]`.
- File over the bucket threshold by > 2× → `[High]`.
- Function > 50 lines → `[Medium]`.
- God-object / mixed-concerns file → `[High]`.

### Cat 4 — Technical Debt {#cat-4-technical-debt}

- Single isolated `TODO` → `[Low]`.
- Cluster of 5+ `TODO`s in one file → `[Medium]`.
- Any `XXX`/`HACK`/`FIXME` marker → `[Medium]`.
- `TODO: SECURITY` or any TODO referencing an active CVE → `[Critical]`.

### Cat 5 — Consistency (Docs vs Code) {#cat-5-consistency-docs-vs-code}

- Terminology drift (synonym across docs/code) → `[Low]`.
- Documented behavior that the code never implemented → `[High]`.
- Documented behavior the code USED to implement and silently removed → `[High]`.

### Cat 6 — Documentation Coverage {#cat-6-documentation-coverage}

- Public symbol missing a docstring → `[Low]`.
- Complex function (cyclomatic > 5 or > 20 lines) missing rationale or edge-case notes → `[Medium]`.
- Module / file missing a top-of-file responsibility comment → `[Low]`.

### Cat 7 — Instruction Coherence {#cat-7-instruction-coherence}

- Vague rule with ambiguous interpretation → `[Low]`.
- Two rules in different files contradicting each other → `[High]`.
- Nested instruction file silently overriding a root rule without justification → `[High]`.
- Duplicate rule across files that may diverge → `[Medium]`.

### Cat 8 — Tooling Relevance {#cat-8-tooling-relevance}

- Hook calls a tool not present in the project → `[Medium]`.
- Skill targets a tech stack the project does not use → `[Medium]`.
- Hook actively fails on every run because of a stack mismatch → `[High]`.
- Stale skill/agent referencing a deleted command → `[Low]`.

### Cat 9 — Documentation Health (FR-DOC-LINT) {#cat-9-documentation-health}

- Broken GFM cross-link → `[Medium]`.
- Stale `[x]` FR — `**Acceptance:**` reference doesn't resolve → `[High]`.
- Orphan `[x]` FR — no code reference at all → `[Medium]`.
- SRS↔SDS direct contradiction → `[High]`.
- `index` row drift vs. SRS → `[Low]`.

### Cat 10 — Architectural Integrity {#cat-10-architectural-integrity}

- Cyclic import through a barrel (TDZ trap) → `[High]`.
- Layer leakage (core importing from adapters) → `[High]`.
- Reverse dependency (lower layer reaching upward) → `[Medium]`.
- Cross-module utility duplicated into multiple layers → `[Medium]`.

### Cat 11 — Conceptual Duplication {#cat-11-conceptual-duplication}

- Parallel implementations of one decision across files → `[High]`.
- Untyped path beside a typed sibling → `[Medium]`.
- Diverging schema clones (same entity, drifting fields) → `[High]`.

### Cat 12 — API Contract Review {#cat-12-api-contract-review}

- Capability flag set true while implementation lacks the capability → `[High]`.
- Sentinel value conflated with "missing" in a required field → `[High]`.
- Default behavior steers the user toward a bug → `[High]`.
- Dead enum value with zero callers AND zero rejections → `[Low]`.
- Type-level invariant the runtime violates → `[Critical]`.

### Cat 13 — Cross-Implementation Symmetry {#cat-13-cross-implementation-symmetry}

- One adapter silently omits a capability others expose → `[High]`.
- Error-class divergence between adapters → `[High]`.
- Reserved-set drift between adapters → `[Medium]`.
- Warning-latch parity drift (one adapter latches, another doesn't) → `[Medium]`.

### Cat 14 — Defensive-Programming Smell {#cat-14-defensive-smell}

- **Silent consumer-callback swallow** (`try { cb() } catch { /* ignore */ }`) → `[Critical]` (meta-rule 1).
- Wholesale failure swallow that returns a "happy" sentinel → `[Critical]`.
- `||` fallback where `??` is intended (zero/empty-string trap) → `[High]`.
- Error-as-decision coupling (catch-block branches on error message text) → `[Medium]`.

### Cat 15 — Invariant ↔ Test Pairing {#cat-15-invariant-test-pairing}

- Documented architectural invariant with no matching test descriptor → `[High]`.
- Contract verified only against a stub, real-binary path gated behind a workflow flag → `[High]`.
- Hand-curated allowlist/blocklist with no cross-reference test → `[Medium]`.

### Cat 16 — Public-Surface Quality {#cat-16-public-surface-quality}

- Synonym duplication on the public surface (two names for one thing) → `[Medium]`.
- Free-function and method duplicates of the same name → `[Medium]`.
- Barrel re-exports of internal-only symbols → `[Medium]`.
- Reserved-flag list mixing positionals and flags (prevents some args from being passed through) → `[High]`.

## Calibration example

Mirror of [example-findings.md](./example-findings.md) with the rubric applied so a maintainer can diff the two side-by-side:

```
Structural Integrity
- [1] [Medium] src/oldfile.ts: in root, should be in src/utils/. (Fix: move)

Code Hygiene
- [2] [Medium] utils.ts: unused export `myFunc`. (Fix: delete)
- [3] [High] AGENTS.md "events MUST be single-iteration": no matching test descriptor. (Fix: add test)

Complexity & Hotspots
- [4] [High] src/runtime.ts: 612 LOC; bucket "thin wrapper / facade", threshold 300 (> 2×). (Fix: split lifecycle into runtime/lifecycle.ts)
- [5] [High] src/adapter.ts (180 LOC): 4 concerns — parsing + protocol detection + lifecycle + formatting. (Fix: split per concern)

Documentation Health
- [6] [Medium] FR-AUTH marked [x] in SRS, no source-code reference. (Fix: add SALP marker or revert to [ ])

Architectural Integrity
- [7] [High] runtime/index.ts ↔ runtime/process.ts: cycle via barrel re-export (TDZ trap). (Fix: drop barrel)
- [8] [High] core/process.ts:14 imports adapters/foo.ts: layer leakage. (Fix: invert via DI seam)

Conceptual Duplication
- [9] [High] runtime/argv.ts:permissionMap vs runtime/jsonrpc.ts:permissionFields: same decision table coded twice. (Fix: extract to runtime/permission_table.ts)
- [10] [Medium] runtime/ndjson.ts:extractItem (typed) vs runtime/jsonrpc.ts:extractItem (Record<string, any>): asymmetric typing. (Fix: collapse to typed shape)

API Contract Review
- [11] [High] RuntimeSession.send (streaming) vs adapters/foo.ts:send (per-message subprocess): capability-vs-impl mismatch. (Fix: downgrade flag or implement long-lived process)
- [12] [High] Usage.total_cost_usd: required `number`, set to 0 when adapter doesn't emit cost. (Fix: `number | undefined`)
- [13] [Low] PermissionMode.dontAsk, PermissionMode.auto: dead enum values, zero callers and zero rejections. (Fix: remove)
- [14] [Critical] RuntimeSession.events: `AsyncIterable<T>` throws on second iteration; runtime invariant violated. (Fix: tighten to `AsyncIterableIterator<T>`)

Cross-Implementation Symmetry
- [15] [High] adapters/{a,b,c}.ts: c silently omits cancel() while a,b expose it. (Fix: explicit `capabilities.cancel: false` tag, or implement)
- [16] [High] adapters/a.ts throws TypedTimeout, adapters/b.ts emits synthetic timeout event. (Fix: unify on TypedTimeout)

Defensive-Programming Smell
- [17] [Critical] adapters/foo.ts:142 `try { onEvent(e) } catch { /* ignore */ }`: silent consumer-callback swallow. (Fix: log + rethrow, or typed error event)
- [18] [Critical] exporters/transcript.ts:exportOpenCodeTranscript: catch-all returns `transcript_path: undefined`, indistinguishable from "not supported". (Fix: typed `Result<TranscriptPath, ExportError>`)

Invariant ↔ Test Pairing
- [19] [High] AGENTS.md "events MUST be single-iteration": no matching test descriptor in *_test.ts. (Fix: add test "events: throws on second iteration")
- [20] [High] tests/contract/*.ts: contract verified only against StubSession; real-binary path gated behind workflow_dispatch + E2E=1. (Fix: add unconditional smoke against real binary)

Public-Surface Quality
- [21] [Medium] mod.ts re-exports register/unregister/killAll AND ProcessRegistry methods of same name. (Fix: keep methods only; deprecate free functions)
- [22] [High] reservedFlags: ["exec", "resume", "--dangerously-skip-permissions"]: positionals exec/resume cannot enter via extraArgs. (Fix: split into reservedSubcommands + reservedFlags)

Total: 22 findings — Critical: 3, High: 12, Medium: 6, Low: 1 (per category: see above).
```

Critical share in this calibration: 3 / 22 ≈ 14 %, well below the 35 % anti-inflation ceiling.
