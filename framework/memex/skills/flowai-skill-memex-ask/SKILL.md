---
name: flowai-skill-memex-ask
description: Use when the user asks a question to be answered from the project's memex (long-term knowledge bank for AI agents) rather than training data or the live web. Reads the index, opens relevant pages, follows one wikilink hop, synthesises a cited answer, files it back. Do NOT trigger on source-code or live-session questions.
argument-hint: <question>
---

# Memex Ask

Answer a question using only what the memex contains. Cite via `[[wikilinks]]`. Be honest about gaps.

## When to invoke

Invoked when the user wants an answer drawn from the memex (e.g., "look this up in my memex", "ask the memex about X", `/flowai-skill-memex-ask <question>`). The argument is the natural-language question.

## Memex Resolution

Resolve the active memex root in this order — first match wins:

1. `--memex <path>` flag → use that path.
2. Walk up from the current working directory. The first ancestor that contains BOTH `AGENTS.md` and a `pages/` subdirectory is the active memex root.
3. If nothing matches, stop with: `No memex found. Run flowai-skill-memex-save <source> in this directory to scaffold one, or pass --memex <path>.`

After resolution, read `<memex-root>/AGENTS.md` for conventions. If the memex contains `.obsidian/`, use dual-link format `[[slug|Name]] ([Name](slug.md))`; otherwise plain `[[slug]]`.

## Ask Steps

### 1. Read the index

Open `<memex-root>/pages/index.md`. This is the catalog. Skim it to identify which pages are likely relevant to the question — match on title, one-line description, or domain heading.

If `index.md` is missing, fall back to `Glob` over `<memex-root>/pages/*.md` and read each candidate's frontmatter. Suggest the user runs `flowai-skill-memex-audit` after the answer to rebuild the index.

### 2. Open candidate pages

Read every page identified as relevant in step 1. Aim for the smallest set that covers the question — quality over quantity.

### 3. Follow one level of `[[wikilinks]]`

For each `[[link]]` in the candidate pages that looks relevant to the question, read the linked page too. ONE level deep — do not follow links from those pages further. This is the "1-hop expansion" — it surfaces connections without reading the entire memex.

### 4. Synthesize the answer

Write the answer in prose, with `[[wikilinks]]` as inline citations:

> Markdown was created by [[john-gruber]] in 2004 with contributions from [[aaron-swartz]]. It was designed as a plain-text formatting syntax that converts cleanly to HTML — see [[history-of-markdown]] for the full timeline.

Format guidance:
- Default: prose with inline `[[wikilink]]` citations.
- Question contains "table" or "compare": markdown table with `[[wikilinks]]` in cells.
- Question contains "timeline" or "history": chronological bullet list with dates.

Quality rules:
- **Honest gaps**: if the memex does not contain the answer, say so explicitly. Suggest what to save. NEVER fall back on training-data knowledge to fill the gap — the answer must come from the memex only.
- **Cite, do not summarize blindly**: every non-trivial claim should reference at least one memex page via `[[wikilink]]`.
- **Note confidence**: if pages disagree or carry `[!WARNING]` contradiction callouts, flag this in the answer rather than picking a side.

### 5. File the answer to `pages/answers/`

Always file the synthesized answer to `<memex-root>/pages/answers/<question-slug>.md`. No prompt — file every answer. Slug derivation: lowercase, hyphens, strip punctuation, max 60 chars (e.g., "Who created Markdown?" → `who-created-markdown.md`).

Frontmatter:
```yaml
---
date: YYYY-MM-DD
type: answer
question: "<original question text>"
status: filed
tags: [<derived from referenced pages>]
---
```

Body: the synthesized answer + a `## Sources` section listing every `[[wikilink]]` cited.

If an answer file with the same slug already exists, append `-2`, `-3`, etc. — never overwrite past answers.

### 6. Offer promotion

Ask the user once: `Promote this answer to a top-level concept page at pages/<slug>.md? (y/n)`

- If yes: move the file from `<memex-root>/pages/answers/` to `<memex-root>/pages/`, change frontmatter `type` from `answer` to `concept`, set `status: promoted`, and add an entry to `pages/index.md` under the appropriate domain.
- If no: leave it in `answers/` and continue.

### 7. Append `log.md`

```
## [YYYY-MM-DD] ask | <question slug>
Answered with N citations across M pages. Filed to answers/<slug>.md.
```

If the user promoted, append a second entry:
```
## [YYYY-MM-DD] promote | <slug>
Promoted answer to pages/<slug>.md.
```

### 8. Report to user

Print:
- The answer (already shown in chat by step 4 — repeat the path, not the body).
- `Filed to <memex-root>/pages/answers/<slug>.md`.
- `Promoted to pages/<slug>.md` if applicable.
- Any gaps you flagged.

## Honest-Gaps Rule

If after step 3 you have not found enough information to answer the question:
- Say so directly: `The memex does not yet cover <topic>. To fill this gap, run flowai-skill-memex-save with sources on <specific suggestions>.`
- File an answer anyway — with `status: gap` instead of `filed` — so the gap is recorded.
- Do NOT fall back on general knowledge. The whole point of the memex is that answers compound from saved sources, not from your prior knowledge.

## Constraints

- Read-only on `raw/` — never modify raw sources during an ask.
- Use `Read`, `Glob`, `Grep` for searching; `Write` only for the answer file (and the optional promotion move). `Edit` for `index.md` and `log.md`.
- Never use plain markdown links for internal references — `[[wikilinks]]` only (or dual-link if the memex uses Obsidian).
- Do not run `WebFetch` or `WebSearch` while answering — answers come from the memex, not the web. If the memex lacks coverage, suggest saving a source; do not silently fetch.
