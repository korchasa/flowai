# Output Format Reference

## Header

Two lines only:
```
time: {{BUILD_TIME or extraction date}}
version: {{VERSION}}
```

## Structure

The file mirrors the actual API request body. No artificial section dividers (`===`, `---`, `PART N`). Use `== field[index]: description ==` markers only to separate top-level API fields (`system`, `messages`, `tools`).

```
time: ...
version: ...

{
  "model": "...",
  "max_tokens": ...,
  "thinking": { ... },
  "stream": true,
  "system": [ ... schema hint ... ],
  "messages": [ ... schema hint ... ],
  "tools": [ ... ]
}


== system[0]: attribution header (no cache) ==

<exact text>


== system[1]: prefix (cache_control: ...) ==

<exact text>


== system[2]: prompt body (cache_control: ...) ==
== All sections below joined with \n\n into one text block ==

<exact prompt text — sections flow continuously, separated by blank lines as they appear in the real prompt>

{{PLACEHOLDER}} for runtime values
{{If condition:}} for optional sections
{{[CONDITION] ...}} for user-type gated variants (e.g. ANT-ONLY)


== messages[0]: prepended user context ==

{ "role": "user", "content": "<exact content>" }


== tools ==

Brief summary of included tools. Full tool descriptions are part of the prompt but too verbose to duplicate here.
```

## Conventions

| Syntax | Meaning |
|--------|---------|
| `{{UPPER_CASE}}` | Runtime placeholder — value interpolated at request time |
| `{{If condition:}}` | Optional section — included only when condition is true |
| `{{[CONDITION] ...}}` | User-type or feature-gated variant block |
| `== field[N]: desc ==` | API request field separator (system, messages, tools) |

## Rules

1. **Exact text** — never paraphrase prompt content. Copy verbatim from source/binary.
2. **No artificial structure** — no `===` banners, no `PART N`, no `---` dividers between sections. The prompt flows as one continuous text.
3. **Minimal annotations** — only annotate where the text is conditional or dynamic. Static text stands alone.
4. **System prompt sections** flow into each other separated by `\n\n`, matching the real join behavior (`blocks.join('\n\n')`).
5. **One file** — entire template in a single `.txt` for easy diffing between versions.
6. **No narrative commentary** — the output contains only the template text and placeholder annotations. Do not include explanations like "The nd() function at line X does Y" or "This section is assembled by...". If implementation notes are needed, write them in a separate `_notes.md` file alongside the template.
