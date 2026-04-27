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
- Raw: `YYYY-MM-DD-<slug>.md`.
- Internal links: `[[slug]]` only — never standard markdown links.

## Log Format

```
## [YYYY-MM-DD] <op> | <title>
<one-line description>
```

Operations: save | ask | audit | promote.

## Cross-Reference Rules

- After creating a page, run `grep -rln "<title>" pages/` and add `[[wikilinks]]` to mentions.
- Flag contradictions inline:

```
> [!WARNING] Contradiction with [[other-page]]
> Source A says X but [[other-page]] says Y.
```
