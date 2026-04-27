# Memex Schema

Memex (long-term knowledge bank for AI agents) at this directory. Three operations: save, ask, audit.

## Directory Layout

- `raw/articles/` — immutable source drops.
- `pages/` — LLM-owned pages (cross-linked graph).
- `pages/index.md` — catalog.
- `pages/answers/` — filed answers.
- `log.md` — append-only operation log.

## Entity Types

`type: concept | person | source-summary | answer`. Concept pages must include `## Counter-Arguments and Gaps`.

## Naming

Filenames `lowercase-kebab-case.md`. Internal links: `[[slug]]` only.
