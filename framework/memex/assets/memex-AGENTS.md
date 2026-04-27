# Memex Schema

This file defines how this memex (long-term knowledge bank for AI agents) is structured. Both Claude Code and Codex auto-load `AGENTS.md` when working inside this directory — read it before any memex operation.

## Directory Layout

- `raw/` — immutable source drops. Never edit files here after save.
  - `articles/` — text source documents (articles, papers, transcripts, notes).
  - `attachments/` — images and binaries.
- `pages/` — LLM-owned pages (the cross-linked page graph at the heart of the memex).
  - `index.md` — catalog of all memex pages. Read this FIRST before opening anything else.
  - `answers/` — filed answers from the `ask` skill. Promote to `pages/` when durable.
  - `<slug>.md` — entity / concept / source-summary pages.
- `log.md` — append-only operation log. Never edit existing entries.
- `AGENTS.md` — this file (schema).

## Operations

Three skills, invoked by the agent on the user's request:

- `flowai-skill-memex-save <path|url|text>` — read source → store in `raw/articles/` → extract entities → create or update memex pages → backlink audit → update `pages/index.md` → append `log.md`. One source typically touches 5–15 memex pages.
- `flowai-skill-memex-ask <question>` — read `pages/index.md` → open relevant pages → follow one level of `[[wikilinks]]` → synthesize answer with citations → file to `pages/answers/<slug>.md` → optionally promote to `pages/<slug>.md`.
- `flowai-skill-memex-audit` — run deterministic structural checks → propose fixes → optionally apply.

## Entity Types

### concept

```yaml
---
date: YYYY-MM-DD
type: concept
status: active
tags: [domain]
---
# Concept Name

<one-paragraph summary>

## Details
...

## See Also
- [[related-concept]]

## Counter-Arguments and Gaps
...

## Sources
- [[source-summary-slug]]
```

### person

```yaml
---
date: YYYY-MM-DD
type: person
status: active
tags: [domain, person]
---
# Person Name

Role / affiliation.

## Key Contributions
...

## See Also
- [[related-concept]]

## Sources
- [[source-summary-slug]]
```

### source-summary

```yaml
---
date: YYYY-MM-DD
type: source-summary
source-url: <URL or file path>
tags: [domain]
---
# Source Title

<one-paragraph summary>

## Key Points
- ...

## Entities Mentioned
- [[person-or-concept]]
```

### answer

```yaml
---
date: YYYY-MM-DD
type: answer
question: "<original question>"
status: filed
tags: [domain]
---
# <Question as title>

<synthesized answer with [[wikilink]] citations>

## Sources
- [[page-1]]
- [[page-2]]
```

## Naming Conventions

- All filenames: `lowercase-kebab-case.md`. Max 60 characters before `.md`.
- Raw sources: `YYYY-MM-DD-<slug>.md` (date prefix for chronological order).
- Memex pages: `<slug>.md` (no date prefix — living documents).
- Internal links: `[[filename-without-extension]]` always — this is the industry-standard `[[wikilink]]` syntax for cross-linked notes; never use standard markdown links for internal references.
- If the memex contains a `.obsidian/` directory, use dual-link format on every cross-reference: `[[slug|Display Name]] ([Display Name](slug.md))`. Both Obsidian and the agent navigate. If `.obsidian/` is absent, plain `[[slug]]` is enough.

## Index Format (`pages/index.md`)

```markdown
# Memex Index

Last updated: YYYY-MM-DD

## <Domain>
- [[page-slug]] — one-line description (YYYY-MM-DD)
- [[other-page]] — one-line description (YYYY-MM-DD)

## <Other Domain>
- ...
```

Read first on every operation. Update after every save. Keep entries under 80 characters.

## Log Format (`log.md`)

Append one entry per operation. Never edit existing entries. Format is grep-friendly:

```
## [YYYY-MM-DD] save | <title>
<one-line description>

## [YYYY-MM-DD] ask | <question slug>
Answered with N citations. Filed to answers/<slug>.md.

## [YYYY-MM-DD] audit | <issues> found, <fixed> auto-fixed
<summary>
```

Operations: `save | ask | audit | promote`.

## Cross-Reference Rules

- Every page must link to at least one other page when content warrants it.
- After creating or updating a page, run a backlink audit: `grep -rln "<new title>" pages/`. For each match that does NOT yet contain `[[<new-slug>]]`, add a wikilink at the first natural mention.
- Flag contradictions inline:
  ```
  > [!WARNING] Contradiction with [[other-page]]
  > Source A claims X, but [[other-page]] states Y. Needs resolution.
  ```

## Save Protocol

1. Acquire the source — URL via WebFetch, file via Read, free-text from the user.
2. Classify as `article | paper | transcript | conversation | note`.
3. Store in `raw/articles/YYYY-MM-DD-<slug>.md` with frontmatter (`date`, `source-url`, `source-type`, `title`).
4. Extract key entities (people, concepts, events). For each:
   - Page exists → update with new info, preserve existing wikilinks, add new ones.
   - No page → create using the appropriate entity template.
5. Write a `source-summary` page for the source itself.
6. Backlink audit (CRITICAL — see Cross-Reference Rules above).
7. Update `pages/index.md` with new / updated entries.
8. Append `log.md`.

A single save typically touches 5–15 pages. This is normal.

## Ask Protocol

1. Read `pages/index.md` first.
2. Open relevant pages by title / description match.
3. Follow one level of `[[wikilinks]]` for additional context.
4. Synthesize the answer in prose with `[[wikilinks]]` as citations.
5. If the memex does not have the answer, say so honestly. Suggest what to save. Never fabricate.
6. File the answer to `pages/answers/<question-slug>.md` (always, no prompt).
7. Ask: "Promote to a top-level concept page? (y/n)". If yes, move to `pages/<slug>.md` and update frontmatter `status: promoted`.
8. Append `log.md`.

## Audit Protocol

1. Run the deterministic check (`flowai-memex-audit.ts` script) over `pages/`.
2. For each reported issue, decide:
   - Dead link → create stub page with appropriate template.
   - Orphan page → suggest where to add inbound links.
   - Missing `## Counter-Arguments and Gaps` section in concept page → add empty section.
   - Index drift → recompute `pages/index.md` from on-disk files.
3. Suggest 3–5 questions the memex cannot yet answer well — candidates for `flowai-skill-memex-ask`.
4. Append a `## [YYYY-MM-DD] audit | …` entry to `log.md`.
