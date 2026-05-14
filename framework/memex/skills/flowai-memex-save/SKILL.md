---
name: flowai-memex-save
description: Use when the user provides a source (URL, file path, or free text) to save into the project's memex — a long-term knowledge bank for AI agents. Stores the raw source, extracts entities into cross-linked pages, runs a backlink audit, and updates the index and activity log. Do NOT trigger on casual reads; only when the intent is to persist a source into the memex.
argument-hint: <path|url|text>
---

# Memex Save

Save a new source into the memex (long-term knowledge bank for AI agents) and integrate it. One source typically touches 5–15 memex pages.

## When to invoke

Invoked when the user wants to capture a source into the memex (e.g., "save this article to my memex", "add this URL to the memex", `/flowai-memex-save <path-or-url-or-text>`). The argument is the source to read.

## Memex Resolution

Resolve the active memex root in this order — first match wins:

1. `--memex <path>` flag in arguments → use that path.
2. Walk up from the current working directory. The first ancestor that contains BOTH `AGENTS.md` and a `pages/` subdirectory is the active memex root.
3. If nothing matches, fall back to `./` in the current working directory and scaffold a memex there (see "Scaffold a new memex" below).

After resolution, read `<memex-root>/AGENTS.md` for the schema. All conventions (filenames, frontmatter, link format, log format) come from there. If the memex contains a `.obsidian/` directory, use dual-link format `[[slug|Name]] ([Name](slug.md))` everywhere; otherwise plain `[[slug]]` is enough.

> The pages directory is `pages/` — it holds the cross-linked page graph. The umbrella concept (sources + pages + log + schema) is the **memex**. The `[[wikilink]]` syntax inside pages is the industry-standard cross-link notation; do not confuse it with directory naming.

## Scaffold a new memex

If no memex was found and the user did not pass `--memex`, scaffold one in the current working directory:

1. Create `./pages/`, `./pages/answers/`, `./raw/articles/`, `./raw/attachments/`.
2. Copy the schema asset to `./AGENTS.md`. The asset ships with this skill at `assets/memex-AGENTS.md` in the framework. If the user already has `AGENTS.md` in this directory, do NOT overwrite — append a "## Memex Schema" section that links to it instead, then create a separate `MEMEX.md` with the schema. Ask the user once which they prefer if both options are unclear.
3. Create `./pages/index.md` with the empty-catalog template:
   ```markdown
   # Memex Index

   Last updated: <today>

   <!-- Add entries after each save. Format:
   ## <Domain>
   - [[page-slug]] — one-line description (YYYY-MM-DD)
   -->
   ```
4. Create `./log.md` with the header:
   ```markdown
   # Memex Activity Log

   <!-- Append-only. Never edit existing entries. Format:
   ## [YYYY-MM-DD] <op> | <title>
   <one-line description>
   -->
   ```
5. Print: `Scaffolded new memex at <memex-root>. Schema is in AGENTS.md.`

Continue with the save steps below in the same invocation.

## Save Steps

### 1. Acquire the source

- **URL** (`http://`, `https://`): use WebFetch with the prompt: `Extract the complete article content. Return: title, author(s) if listed, date if listed, and full article text preserving all factual claims, data points, code examples. Format as clean markdown.`
- **File path** (existing file): read directly via Read.
- **Free text**: the user passes the body inline. Derive a title from the first heading or first sentence; if neither works, ask the user for a title.

If a URL is paywalled or returns thin content, report the failure and suggest pasting the text manually. Do NOT fabricate content.

### 2. Classify and slug

Classify as one of: `article | paper | transcript | conversation | note`. Auto-detect from the URL or content (arxiv → paper, github → repo-style article, twitter/x → conversation, etc.).

Generate the slug:
- Lowercase the title, replace spaces with hyphens, strip non-`[a-z0-9-]` characters.
- Truncate to 60 characters.
- Prefix with today's date: `YYYY-MM-DD-<slug>.md`.
- If the file already exists, append `-2`, `-3`, etc.

### 3. Save to `raw/articles/`

Write to `<memex-root>/raw/articles/YYYY-MM-DD-<slug>.md` with frontmatter:
```yaml
---
date: YYYY-MM-DD
source-url: <URL or original file path or "MANUAL">
source-type: <classification>
title: <extracted or inferred title>
---
```
Followed by the full source content.

`raw/` is **immutable** — once written, never modify these files in later operations.

### 4. Extract entities

Read your own raw save. Identify mentioned entities:
- **People** — named individuals who appear with a role.
- **Concepts** — ideas, technologies, events, frameworks, theories worth their own page.
- **Existing memex pages** that this source touches.

For each entity decide: CREATE (no page yet) or UPDATE (page exists in `<memex-root>/pages/`). Skip minor mentions — they will be referenced inline within other pages, not turned into pages of their own.

### 5. Write or update entity pages

For each new entity, write `<memex-root>/pages/<slug>.md` using the matching template from `AGENTS.md` (concept / person / source-summary). Fill the frontmatter, write a synthesized body (do NOT copy-paste raw content — explain in your own words), and add `[[wikilinks]]` to related entities.

For each existing entity, read the page first, then integrate new information using Edit:
- Preserve all existing wikilinks.
- Add new wikilinks to other entities the new source mentions.
- Add the new source to the page's "Sources" section.
- Update `date` in frontmatter to today.

### 6. Write the source-summary page

Always write a `source-summary` page at `<memex-root>/pages/<source-slug>.md` covering the source itself:
- One-paragraph summary.
- "Key Points" — 3–7 bullet points.
- "Entities Mentioned" — `[[wikilinks]]` to every entity page touched in step 5.

This gives every raw source a discoverable memex entry point.

### 7. Backlink audit (CRITICAL — do not skip)

For each NEWLY CREATED page (from step 5–6), grep all existing memex pages for mentions of its title or key terms:

```bash
grep -rln "<new page title>" <memex-root>/pages/
```

For every match that mentions the title in prose but does NOT contain `[[<new-slug>]]`, add a wikilink at the first natural mention. This is the most commonly skipped step — without it, the memex does not compound.

### 8. Update `pages/index.md`

Open `<memex-root>/pages/index.md`. For each created or updated page, ensure it has a row under the appropriate domain heading:
```markdown
## <Domain>
- [[page-slug]] — one-line description (YYYY-MM-DD)
```
Update "Last updated" to today. Keep entries under 80 characters. Group by domain — derive from `tags` frontmatter.

### 9. Append `log.md`

Append one entry to `<memex-root>/log.md`:
```
## [YYYY-MM-DD] save | <source title>
Stored <type> from <source>. Created N pages, updated M. Touched: <slug-1>, <slug-2>, ...
```

### 10. Report to user

Print a concise summary:
- Source slug saved to `raw/articles/`.
- Pages created (with paths) and updated (with paths).
- Index domain headings touched.
- Number of backlinks added during audit.
- Any contradictions flagged with `[!WARNING]` callouts.

## Contradiction Handling

When a new source contradicts existing memex content, do NOT silently overwrite. Add an Obsidian-style callout near the contradicting claim:

```markdown
> [!WARNING] Contradiction with [[other-page]]
> Source A claims X, but [[other-page]] states Y. Needs human resolution.
```

Touch BOTH pages with the warning, and mention the contradiction in the log entry. The audit skill (`flowai-memex-audit`) surfaces all `[!WARNING]` markers in its report.

## Error Handling

- **WebFetch failure** (paywall, auth wall, network): retry once. If still failing, report and stop. Do not fabricate the source content.
- **Source already saved** (matching slug exists in `raw/articles/`): tell the user and stop. Suggest they pass a different source or remove the existing file first.
- **Source too large** (>50 KB raw): warn the user that entity extraction may be incomplete; proceed.
- **`raw/articles/` does not exist** in the resolved memex: create it. The memex is malformed but recoverable.
- **`pages/index.md` missing**: recreate it from the empty template before step 8.

## Constraints

- Never edit files in `raw/` after the initial save in step 3.
- Never use plain markdown links for internal references — `[[wikilinks]]` only.
- Never invent facts. Every claim in a memex page must trace back to a `raw/` source via the `Sources` section.
- Use `Read`, `Write`, `Edit`, `Glob`, `Grep`, `Bash` (for `grep` only — no `git` operations unless the user asks). `WebFetch` only for URL sources.
