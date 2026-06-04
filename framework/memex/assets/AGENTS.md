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

- `save <path|url|text>` — read source → store in `raw/articles/` → extract entities → create or update memex pages → backlink audit → update `pages/index.md` → append `log.md`. One source typically touches 5–15 memex pages.
- `ask <question>` — read `pages/index.md` → open relevant pages → follow one level of SALP REFs → synthesize answer with citations → file to `pages/answers/<slug>.md` → optionally promote to `pages/<slug>.md`.
- `audit` — run deterministic structural checks → propose fixes → optionally apply.

## Anchor / Reference Grammar (SALP)

This memex uses the **SALP** grammar (Semantic Anchor / Link Protocol) for every cross-reference. SALP supersedes the older `[[wikilink]]` syntax — wikilinks are no longer parsed by the audit script and no longer recognised by the `save` / `ask` / `audit` skills.

- **Anchor** — `[ANC:mx-<type>:<slug>]` — declared once per page, immediately below the H1 title line. `<type>` matches the page's frontmatter `type:` field (`concept`, `person`, `source` for source-summary pages, `answer` for answers). `<slug>` MUST match the filename (without `.md`).

- **Reference** — `[REF:mx-<type>:<slug>]` (bare) or `[REF:mx-<type>:<slug> | <display>]` (with display text) — points at a page elsewhere in the memex. The optional `| display` text is what readers see.

- **Allowed namespaces** — `mx-concept`, `mx-person`, `mx-source`, `mx-answer`. The audit script's `MALFORMED_REF` issue surfaces any other namespace.

- **No dual-link** — even when `.obsidian/` is present, use SALP only. Obsidian renders unknown brackets as plain text, which is acceptable; the agent always navigates by SALP.

## Entity Types

### concept

```yaml
---
date: YYYY-MM-DD
type: concept
status: active
tags: [domain]
---
# Concept Name [ANC:mx-concept:concept-name]

<one-paragraph summary>

## Details
...

## See Also
- [REF:mx-concept:related-concept]

## Counter-Arguments and Gaps
...

## Sources
- [REF:mx-source:source-summary-slug]
```

### person

```yaml
---
date: YYYY-MM-DD
type: person
status: active
tags: [domain, person]
---
# Person Name [ANC:mx-person:person-name]

Role / affiliation.

## Key Contributions
...

## See Also
- [REF:mx-concept:related-concept]

## Sources
- [REF:mx-source:source-summary-slug]
```

### source-summary

```yaml
---
date: YYYY-MM-DD
type: source
source-url: <URL or file path>
tags: [domain]
---
# Source Title [ANC:mx-source:source-summary-slug]

<one-paragraph summary>

## Key Points
- ...

## Entities Mentioned
- [REF:mx-person:person-or-concept]
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
# <Question as title> [ANC:mx-answer:answer-slug]

<synthesized answer with [REF:mx-concept:page-1 | Page 1] / [REF:mx-person:page-2 | Page 2] citations>

## Sources
- [REF:mx-concept:page-1]
- [REF:mx-person:page-2]
```

## Naming Conventions

- All filenames: `lowercase-kebab-case.md`. Max 60 characters before `.md`.
- Raw sources: `YYYY-MM-DD-<slug>.md` (date prefix for chronological order).
- Memex pages: `<slug>.md` (no date prefix — living documents).
- Internal links: always SALP — `[REF:mx-<type>:<slug>]` or `[REF:mx-<type>:<slug> | <display>]`. Never use standard markdown links for internal references; never use `[[wikilinks]]` (no longer parsed).

## Index Format (`pages/index.md`)

```markdown
# Memex Index

Last updated: YYYY-MM-DD

## <Domain>
- [REF:mx-concept:page-slug | Page Slug] — one-line description (YYYY-MM-DD)
- [REF:mx-concept:other-page | Other Page] — one-line description (YYYY-MM-DD)

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
- After creating or updating a page, run a backlink audit: `grep -rln "<new title>" pages/`. For each match that does NOT yet contain `[REF:mx-<type>:<new-slug>]`, insert a SALP REF at the first natural mention.
- Flag contradictions inline:
  ```
  > [!WARNING] Contradiction with [REF:mx-concept:other-page]
  > Source A claims X, but [REF:mx-concept:other-page] states Y. Needs resolution.
  ```

## Save Protocol

1. Acquire the source — URL via WebFetch, file via Read, free-text from the user.
2. Classify as `article | paper | transcript | conversation | note`.
3. Store in `raw/articles/YYYY-MM-DD-<slug>.md` with frontmatter (`date`, `source-url`, `source-type`, `title`).
4. Extract key entities (people, concepts, events). For each:
   - Page exists → update with new info, preserve existing SALP REFs, add new ones.
   - No page → create using the appropriate entity template; declare the page's `[ANC:mx-<type>:<slug>]` directly below its H1 title.
5. Write a `source-summary` page (`type: source`) for the source itself.
6. Backlink audit (CRITICAL — see Cross-Reference Rules above).
7. Update `pages/index.md` with new / updated entries (SALP form rows).
8. Append `log.md`.

A single save typically touches 5–15 pages. This is normal.

## Ask Protocol

1. Read `pages/index.md` first.
2. Open relevant pages by title / description match.
3. Follow one level of SALP REFs (`[REF:mx-<type>:<slug>]`) for additional context.
4. Synthesize the answer in prose with `[REF:mx-<type>:<slug> | display]` as citations.
5. If the memex does not have the answer, say so honestly. Suggest what to save. Never fabricate.
6. File the answer to `pages/answers/<question-slug>.md` (always, no prompt). Declare the page's `[ANC:mx-answer:<slug>]` directly below its H1.
7. Ask: "Promote to a top-level concept page? (y/n)". If yes, move to `pages/<slug>.md` and update frontmatter `status: promoted` (and the anchor's namespace accordingly).
8. Append `log.md`.

## Audit Protocol

1. Run the deterministic check (`audit.ts` script) over `pages/`. It parses SALP REFs (`[REF:mx-<type>:<slug>]`) — wikilinks are not recognised.
2. For each reported issue, decide:
   - `DEAD_LINK` → create stub page with appropriate template (anchor included).
   - `ORPHAN` → suggest where to add inbound SALP REFs.
   - `MISSING_SECTION` (concept missing `## Counter-Arguments and Gaps`) → add empty section.
   - `INDEX_MISSING` / `INDEX_DEAD` → recompute `pages/index.md` from on-disk files in SALP form.
   - `MALFORMED_REF` → fix the SALP grammar (typically wrong namespace or empty slug).
3. Suggest 3–5 questions the memex cannot yet answer well — candidates for `ask`.
4. Append a `## [YYYY-MM-DD] audit | …` entry to `log.md`.
