# Memex Schema

Memex (long-term knowledge bank for AI agents) at this directory. Three operations: save, ask, audit.

## Directory Layout

- `raw/articles/` — immutable source drops.
- `pages/` — LLM-owned pages (cross-linked graph).
- `pages/index.md` — catalog. Read first.
- `pages/answers/` — filed answers.
- `log.md` — append-only operation log.

## Entity Types

`type: concept | person | source-summary | answer` in YAML frontmatter.

Concept pages must include a `## Counter-Arguments and Gaps` section.

## Naming

- Filenames: lowercase-kebab-case.md.
- Internal links: `[[slug]]` only.

## Log Format

```
## [YYYY-MM-DD] <op> | <title>
<one-line description>
```

## Ask Protocol

1. Read pages/index.md first.
2. Open relevant pages, follow ONE level of [[wikilinks]].
3. Synthesize answer with [[wikilinks]] as citations.
4. If memex does not cover the topic, say so honestly. Never fabricate.
5. File answer to `pages/answers/<slug>.md` with `type: answer` frontmatter.
6. Offer promotion to top-level concept page (y/n).
7. Append log.md.
