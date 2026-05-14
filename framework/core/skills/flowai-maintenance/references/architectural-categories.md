# Architectural categories (10–16) — sub-check details

Reference for Categories 10–16 in [SKILL.md](../SKILL.md). Each category lists its sub-checks with the exact pattern, threshold, or grep target the agent uses to flag a finding.

## Category 10: Architectural Integrity

Read declared layering in `AGENTS.md` / `CLAUDE.md` / SDS; if absent, infer from directory structure (e.g., `core/` < `adapters/` < `app/`). Then run:

- **Cyclic imports through barrels**: Cycles routed through `index.ts` / `mod.ts` re-exports (TDZ trap). Flag the cycle AND the masking barrel.
- **Layer leakage**: A "core" / "neutral" / "domain" module imports from a per-runtime / per-adapter module, inverting inward-only direction. Cite the import line and the layering rule it violates.
- **Reverse dependencies**: Lower-layer module imports a higher-layer module (infrastructure → domain). Flag the import edge and the bucket each side belongs to.

Verdict: each finding cites the exact import edge (`file:line → target file`) plus the layering rule it violates; fix proposes a move, a DI seam, or a documented exception.

## Category 11: Conceptual Duplication

Logical (not textual) duplication across parallel surfaces; structural reading required.

- **Parallel implementations of one decision**: Same decision table coded twice across surfaces (CLI args vs JSON-RPC fields, REST vs gRPC, sync vs async). Look for identical case branches in 2+ files. Design-doc warnings of the form "do not cross-reference these tables" are themselves a symptom — flag both implementations and the warning.
- **Untyped path beside typed sibling**: Same operation has a typed implementation in one path and a `Record<string, any>` / `Record<string, unknown>` / `dict` / `interface{}` cast in a parallel path. Recommend collapsing both to the typed shape.
- **Diverging schema clones**: Same data shape (request/response, event, config) defined separately per channel/format with no shared source. Flag every pair that can drift silently.

Verdict: list both call sites (or both definitions); propose a single source of truth (shared function, shared type, generated definition).

## Category 12: API Contract Review

Audit exported types and interfaces for contracts the implementation cannot honor.

- **Capability-vs-implementation mismatch**: A type or interface advertises a capability (streaming, idempotency, cancellation) the implementation cannot honor without lying. Examples: faux-streaming over a per-message subprocess where `send()` returns before the subprocess starts; sync API on an inherently async backend; a "supported" capability flag where every call falls back to a synthetic event.
- **Sentinel-vs-missing conflation**: A field typed `T` (required) is set to a sentinel value (`0`, `""`, `-1`, `false`) when the source did not report it. Aggregators cannot distinguish "real zero" from "not reported". Recommend `T | undefined` or the language's nullable equivalent.
- **Default-toward-bug**: An optional dependency falls back to a process-wide singleton or shared global state when omitted, leaking scope across embedders. Flag `?? globalSingleton` / module-level cache patterns; recommend required injection or a scoped factory.
- **Dead enum values**: An exported enum / union member is not accepted by any consumer and not rejected by any validator. Grep references; flag values with zero callers AND zero rejection sites.
- **Type-level vs runtime invariant divergence**: Type permits an operation runtime forbids (e.g., `AsyncIterable<T>` on a single-shot stream that throws on second iteration). Recommend a tighter type (`AsyncIterableIterator<T>`, `Disposable`, `Once<T>` wrapper, explicit state machine).

Verdict: cite the type declaration AND the breaking implementation site; propose tighter type or stricter implementation.

## Category 13: Cross-Implementation Symmetry

When 2+ implementations conform to one interface (adapters, drivers, plugins, providers), verify they make the same promises.

- **Capability parity**: Across N implementations, every implementation exposes the same capability set OR each missing capability is explicitly tagged (e.g., `capabilities: { stream: false }`). Flag silent omissions.
- **Error-class parity**: The same logical failure produces the same error class/shape across implementations. Flag where A throws a `TypedError` and B returns a synthetic event, swallowed `null`, or generic `Error`.
- **Reserved-set parity**: For implementations that filter user input against a reserved list (flags, env vars, paths, keywords), the lists are kept in sync OR derived from a shared source. Flag hand-curated divergent arrays across siblings.
- **Warning-latch parity**: Where implementations latch a warning state (one-shot deprecation, capability-missing notice), each implementation latches consistently — same trigger, same suppression. Flag implementations that fire repeatedly while siblings suppress after first.

Verdict: list the divergent implementations side-by-side; propose either a shared source (constant, generator, base class) or an explicit per-implementation tag justifying the asymmetry.

## Category 14: Defensive-Programming Smell

Patterns that suppress signal in the name of robustness.

- **Silent consumer-callback swallows**: `try { onEvent(...) } catch { /* ignore */ }` (or empty/comment-only catch) around user-supplied / injected callbacks hides bugs in consumer code. Flag every empty/comment-only catch around invocations of callbacks the module did not author.
- **Wholesale failure swallowing**: A catch-all around a multi-step operation that returns `undefined` / `null` / `""` on any failure, indistinguishable from "feature not supported" or "no data". Flag every catch-all that conflates "failed" with "not applicable".
- **Fallback-on-zero**: `value || default` where `0`, `""`, or `false` is a valid value. Flag boolean-coerced fallbacks on numeric / string / boolean inputs; recommend `?? default` or an explicit nullish/undefined check.
- **Error-as-decision coupling**: Control flow uses thrown exceptions as a primary branching mechanism for known states. Flag `try {…} catch { /* expected, take other branch */ }` where a return value, sentinel, or `Result<T, E>` would suffice.

Verdict: cite the file:line; propose a typed error / nullable result, an explicit propagate-up, or a logger call where bugs were previously eaten.

## Category 15: Invariant ↔ Test Pairing

Cross-reference architectural invariants against the test suite. Deeper than Category 2's lightweight pairing — inventory all invariants systematically rather than spot-checking.

- **Architectural invariants without tests**: Extract every SHOULD / MUST / INVARIANT clause from `AGENTS.md`, `CLAUDE.md`, `documents/design.md`. Grep test descriptors (`it("…")`, `Deno.test("…")`, `def test_…`, `func Test…`, `describe(…)`) for matching coverage. Flag every invariant with zero matching test names.
- **Stub-only contract tests**: A uniform contract (interface, protocol, capability matrix) is verified across implementations only via stubs / mocks, while the real-binary / real-backend variant is gated behind manual triggers (`E2E=1`, `workflow_dispatch`, `--integration`, opt-in env vars). Recommend an unconditional smoke that exercises the real path on every CI run.
- **Hand-curated lists without invariant tests**: Reserved-flag arrays, capability matrices, version-gate maps, denylists with no test that proves "everything emitted by builder X appears in array Y" or "every member of enum Z has a handler". Flag the `list + builder` (or `enum + handler`) pair and the missing cross-reference test.

Verdict: cite the invariant source AND the missing test descriptor; propose a concrete test name and a one-line acceptance.

## Category 16: Public-Surface Quality

Audit the exported API surface for redundancy and leak.

- **Synonym duplication for one concept**: Multiple exported names (`addTask`, `enqueueTask`, `register`) for the same operation. Recommend a canonical name and deprecation of the synonyms.
- **Free-function-and-method duplicates**: The same name is exported as both a free function (taking the instance as an arg) and as a method on the instance class. Recommend keeping only one surface (typically the method).
- **Barrel re-exports of internal-only symbols**: A module-level `index.ts` / `mod.ts` re-exports symbols that have no external consumers and exist only for tests / internal cross-imports. Flag every re-export with zero external references; recommend moving the symbol to an `_internal.ts` (or equivalent) and removing the re-export.
- **Reserved-flag list mixing positionals and flags**: Reserved arrays containing both positional subcommands (e.g., `exec`, `resume`) AND `--`-prefixed flags. Positionals cannot enter via `extraArgs` and are dead members. Recommend their removal or splitting into `reservedSubcommands` + `reservedFlags`.
- **Overlapping public / private boundary**: Symbols exported from `mod.ts` while the module's docs (or a `@internal` JSDoc tag) mark them as internal. Recommend either privatizing the export or removing the `@internal` label.

Verdict: list the exported names AND their consumer counts; propose either a canonical surface or a privatization step.
