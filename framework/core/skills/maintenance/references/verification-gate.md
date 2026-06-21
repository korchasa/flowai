# Verification Gate — Per-Shape Checklist

Reference for Step 17.5 of the maintenance skill. The Verify Findings gate
ground-truths every finding (especially subagent-supplied ones) before the
summary. Use one targeted check per finding from the shape table below.

## Why this gate exists

Subagent-style scans (`Explore`, `Task`, `Agent`) are summarization passes,
not measurements. They routinely produce sharp-looking findings that turn
out to be off in specific, recurring ways:

- **Numeric metrics estimated, not counted.** "~90 lines" reported for a
  function that is actually 42; "largest function ~40 lines" reported
  without a measurement.
- **Cross-implementation conflation.** With 3+ sibling rows (e.g. the
  `ACP_AGENTS` IDE registry) in context, subagents apply one sibling's
  attributes to another. "The cursor row authenticates via API key" —
  actually `cursor` is `authMode: "native"`; only the `codex` row is
  `"api-key"`. "Every row spawns via an `npx` wrapper" — only `claude` does;
  cursor/codex/opencode launch their native binary directly.
- **Missed inline documentation.** "Undocumented env override" — when the
  `claude` row carries an explicit `// Allow spawning claude inside a claude
  session` comment right above its `CLAUDECODE: ""` env. "authMode is an
  unexplained string" — when it is spelled out in JSDoc on the interface.
- **Round-number debt and complexity estimates** never measured against
  the actual file.

The gate's cost is bounded — one targeted read per finding, typically
<20 reads per audit — vs. the cost of presenting phantom findings (user
round-trip to correct, or worse, applying fixes for non-bugs).

## Per-shape verification checklist

For each finding in the collected list, identify its shape and perform
the matching check before keeping it.

### Shape A — Numeric metric

Examples: "file has 612 lines", "function spans ~90 lines", "12 exports",
"this TODO is 6 months old".

Check:
- Read the actual file/range. Recount.
- Round-number metrics ("~90", "~50", "~500") are presumed estimated.
  Re-measure rather than trust.
- If the metric drops below the rule's threshold after recount → drop the
  finding.

### Shape B — Symbol behavior

Examples: "X returns null", "X swallows errors", "X is a stub", "X never
validates input".

Check:
- Read the function body in full.
- If the body delegates to a helper, follow the call and read the helper
  before keeping the finding.
- If the behavior is correct but undocumented, the finding may downgrade
  to a documentation note rather than a bug.

### Shape C — "Undocumented" / "no comment" / "no JSDoc"

Highest false-positive rate. Check:
- Re-read the 10 lines surrounding the symbol.
- Read the JSDoc immediately above the symbol.
- Check sibling files for a shared contract / interface definition that
  documents the symbol there.
- Documentation does not always live on the declaration line; an
  interface or type alias upstream may carry the contract.

### Shape D — Cross-implementation claim

Examples: "Cursor does X like Codex", "all three adapters drop capability
Y", "every parser ignores escape sequences".

Check:
- Read each implementation individually.
- Do not generalize from one sibling to the others.
- If the claim splits (one sibling differs), restate the finding to name
  the exact divergence rather than a blanket pattern.

### Shape E — Architectural / dependency claim

Examples: "module A depends on module B which depends on A (cycle)",
"layer X leaks into layer Y", "barrel re-exports internal symbols".

Check:
- Read the actual import lines, not a paraphrase.
- For cycles, trace the full path (A → C → B → A); a shallow grep can
  miss intermediates.
- For layer leakage, check the declared layering in AGENTS.md / SDS
  before flagging.

## Output format

For each falsified finding, emit a one-liner in the summary so the user
can see the gate ran:

```
[verified false] <site>: <original claim> — actually <observed reality>
```

For refined findings (claim partially true), keep the finding but correct
it:

```
[verified — refined] <site>: <corrected claim>. (Fix: <fix>)
```
