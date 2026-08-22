# Memex Schema

Memex (long-term knowledge bank for AI agents) at this directory. Three operations: save, ask, audit.

## Directory Layout

- `raw/articles/` — immutable source drops.
- `pages/` — LLM-owned pages (cross-linked graph).
- `pages/index.md` — catalog. Read first.
- `pages/answers/` — filed answers.
- `log.md` — append-only operation log.

## Entity Types

`type: concept | person | source | answer` in YAML frontmatter (`source` is the
source-summary page kind).

Concept pages must include a `## Counter-Arguments and Gaps` section.

## Naming

- Filenames: lowercase-kebab-case.md.
- Cross-references use SALP only: `[REF:mx-<type>:<slug>]` (bare) or
  `[REF:mx-<type>:<slug> | <display>]` (with display text). Namespaces:
  `mx-concept`, `mx-person`, `mx-source`, `mx-answer`.
- Each page declares its own `[ANC:mx-<type>:<slug>]` anchor on the H1 title
  line, after the title text. `[[wikilinks]]` are not recognised.

## Log Format

```
## [YYYY-MM-DD] <op> | <title>
<one-line description>
```

## Ask Protocol

1. Read pages/index.md first.
2. Open relevant pages, follow ONE level of SALP REFs.
3. Synthesize answer with `[REF:mx-<type>:<slug> | <display>]` as citations.
4. If memex does not cover the topic, say so honestly. Never fabricate.
5. File answer to `pages/answers/<slug>.md` with `type: answer` frontmatter.
6. Offer promotion to top-level concept page (y/n).
7. Append log.md.
