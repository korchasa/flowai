# Mermaid Rendering Hazards

What breaks a diagram, what fixes it, and what looks dangerous but is not.

This file used to restate Mermaid's syntax — node shapes, arrow forms, the
eight diagram types. That is knowledge the model already has, and it does not
prevent the failure that actually happens: a diagram that reads correctly and
refuses to render. Every line below was measured against the official Mermaid
parser (`@mermaid-js/mermaid-cli`) on 2026-08-30 and 2026-08-31 over 43 probe
files and 12 agent-written diagrams. Each "fatal" case was confirmed to fail
and each remedy confirmed to pass.

## Fatal — quote the label text

Any of `(` `)` `[` `]` `{` `}` inside label text ends the label early. This is
by far the most common break, because real labels carry parentheses.

| Breaks | Renders |
| --- | --- |
| `A[Build (CI)]` | `A["Build (CI)"]` |
| `A[Read array[0]]` | `A["Read array[0]"]` |
| `A[Parse {json} body]` | `A["Parse {json} body"]` |
| `A -->\|retry (3x)\| B` | `A -->\|"retry (3x)"\| B` |
| `subgraph Build (CI)` | `subgraph "Build (CI)"` |

The edge-label and subgraph-title cases are the ones that survive review: the
node labels get quoted and these two do not.

A subgraph may carry an identifier as well, and then the title goes in brackets:
`subgraph CI ["Build (CI)"]`. Both forms render; the quotes are what matters.

## Fatal — quoting does not help

**A literal `"` inside a label.** The first inner quote closes the label.
Write the entity instead:

```
A["He said #quot;hi#quot; loudly"]
```

**A reserved word as a node IDENTIFIER.** `end`, `graph`, `subgraph`, `class`,
`style`, `click`, `linkStyle`, `classDef`. Quoting the identifier does not save
it — `start --> "end"` still fails. Rename the node; the same word is fine as
label text:

```
start --> finish            %% or: start --> endNode["end"]
```

**A `;` inside a sequence-diagram message.** The semicolon ends the statement,
and quoting the message does not change that. Use `#semi;`, or reword:

```
Deployer->>Gateway: drain connections#semi; wait for idle
Deployer->>Gateway: drain connections, then wait for idle
```

**An unescaped `|` inside an edge label.** `A -->|yes|no| B` reads as a label
`yes` followed by junk. Write `#124;` for a literal pipe.

## Harmless — do not escape these

Measured to render exactly as written. Escaping them is cargo cult and makes
the source harder to read:

- `#` `&` `%` `<` `>` `?` `/` `-` in any label — `A[Coverage < 80%]`,
  `A[Notify #eng-alerts]`, `A[Roll back & page]`, `A[Tag v<major>.<minor>]`
- `:` inside a sequence message — only `;` is fatal there
- Parentheses in state, ER, Gantt and class diagrams — the flowchart label
  rule does not extend to them: `Idle --> Busy: start (async)` renders
- Emoji and non-Latin text — `A[Deploy 🚀 to prod]`, `A[Сборка проекта]`
- Line breaks. **Both** a raw newline inside a label and `<br/>` parse, quoted
  or not. A broken line is not what breaks the diagram.
- `o` and `x` at the start of an edge — `A---oB` renders

## Picking the diagram type

- **Flowchart** — algorithms, workflows, decision trees
- **Sequence** — API interactions, user flows, system communication
- **Class** — object structure, or a schema as an alternative to ER
- **State** — state machines, object lifecycles
- **ER** — database schemas, entity relationships
- **Gantt** — schedules and timelines
- **User journey** — experience mapping
- **Pie** — a single distribution

## The full syntax

Mermaid's own reference is the source of truth for syntax:
<https://mermaid.js.org/intro/syntax-reference.html>. Reach for it when you
need a shape or a directive you do not already know. For the ordinary
flowchart and sequence diagram, write it from memory and let the checker catch
what memory gets wrong — that is the division of labour this file assumes.
