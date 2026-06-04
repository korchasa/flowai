# SALP — Semantic Anchor / Link Protocol

Canonical cross-reference grammar for flowai. Adopted by [REF:fr:doc-anchors | FR-DOC-ANCHORS]. Supersedes the GFM-link mandate (`FR-DOC-LINKS`) and the wikilink format used inside the memex pack.

## Grammar (BNF)

```
anchor      ::= "[ANC:" namespace ":" id "]"
reference   ::= "[REF:" namespace ":" id [ " | " display ] "]"
namespace   ::= [a-z][a-z0-9-]*           ; lower-kebab
id          ::= [a-z0-9][a-z0-9-]*        ; lower-kebab
display     ::= 1*( any-char-except-"]" ) ; trimmed
```

Salp-short (`[ANC:id]` / `[REF:id]` without namespace) is REJECTED.

## Namespace Grammar (open set)

`<ns>` matches `[a-z][a-z0-9-]*`. The validator does NOT enforce membership in any closed list — any grammar-conformant value is accepted. `scripts/lib/salp.ts` ships `EXAMPLE_NAMESPACES` as a documentation hint only.

Examples currently in use:

- `fr` — Functional Requirement IDs (SRS sections under `documents/requirements.md`).
- `sds` — System Design Specification sections (`documents/design.md`). Id form: `3-1-1` for §3.1.1.
- `task` — Task files under `documents/tasks/<YYYY>/<MM>/<slug>.md`. Id = slug.
- `nfr` — non-functional requirements.
- `code` — `[ANC:code:…]` annotations in source files.
- `mx-concept`, `mx-person`, `mx-source`, `mx-answer` — Memex page types (`framework/memex/pages/<type>/<slug>.md`).

New consumers may introduce new namespaces without changing the validator.

## Rationale

The 2026-05-13/14/15 anchor-systems experiment (`flowai-experiments/anchor-systems/`, 240 trials, gpt-5.4-mini, six formats) showed SALP winning on every variant except `boundary` (where all formats reached 100%):
- mapping: 0% → 80%
- linting: 20% → 100%
- multi-hop traversal: 13% → 40%

The namespace is what produces the multi-hop gain — wikilinks lose at 26.7% precisely because `[[oauth]]` cannot disambiguate between `mx-concept:oauth` and `mx-source:oauth`.

## Anti-Patterns

- **Salp-short** — `[ANC:cmd-exec]`. REJECTED at parse time. Loses the disambiguation value the experiment quantified.
- **Dual-link** — `[REF:fr:cmd-exec | FR-CMD-EXEC] (FR-CMD-EXEC)` or wikilink+GFM dual emission. Doubles token cost and creates two grammars the agent has to pattern-match against.
- **GFM coexistence** — `[FR-CMD-EXEC](requirements.md#fr-cmd-exec-command-execution)` surviving alongside SALP. Migration is exhaustive (no opportunistic coexistence window).
- **Backslash escapes in display** — `[REF:fr:x | weird \] text]` is not supported; if a display string contains `]`, restructure the surrounding prose.

## Tooling

- Parser: `scripts/lib/salp.ts`.
- Validator: `scripts/check-salp.ts` (wired into `deno task check`).
- Migration script: `scripts/migrate-to-salp.ts --write <files>`.
- Anchor map: `scripts/lib/salp-anchor-map.ts`.

## Migration Phases (this repo)

1. **Phase 1 — Infra**: parser + validator + migration script + SRS section. No target-surface changes.
2. **Phase 2 — Repo-internal docs/code**: run `migrate-to-salp.ts --write` over `documents/`, `README.md`, `AGENTS.md`, `scripts/**.ts` comments. Rewrite `check-traceability.ts` to validate SALP code-to-doc refs. Flip `FR-DOC-LINKS` and `FR-DOC-IDS` to `superseded`.
3. **Phase 3 — Public API**: rewrite `framework/core/assets/AGENTS.template.md` with the SALP mandate + downstream-migration sub-section. Update `engineer-*` skills and `framework/atoms/*.md` examples. Refresh `plan` acceptance scenarios.
4. **Phase 4 — Memex**: rewrite `framework/memex/assets/AGENTS.md` schema; update `save` / `ask` / `audit` skills + `audit.ts` + status hook on SALP grammar. Refresh memex acceptance scenarios.
