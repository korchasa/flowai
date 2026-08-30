#!/usr/bin/env python3
"""Check a Mermaid diagram for the constructs that stop it rendering.

Usage:
    python3 scripts/validate.py path/to/diagram.md
    python3 scripts/validate.py path/to/diagram.mmd

Reads ```mermaid fences out of a Markdown file, or treats a .mmd file as one
diagram. Prints JSON on stdout, human diagnostics on stderr. Exit 0 = clean,
1 = problems found, 2 = usage error.

WHAT THIS CHECKS, AND WHAT IT DOES NOT

Every rule below was measured against the official Mermaid parser on
2026-08-30 across 43 probe files: each "fatal" case was confirmed to fail and
each remedy confirmed to pass. The checker is deliberately a hazard list, not
a parser — it needs no network, no Node, and no install, and it runs in
milliseconds. It will not catch a novel syntax error outside the list. Both
halves of that trade were paid for: the previous validator shelled out to
`npx @mermaid-js/mermaid-cli`, and in one measured run of three the cold
download blew a 120-second timeout, so the agent shipped a broken diagram.

Fatal, and the remedy is double quotes around the label text:
    A[Build (CI)]            -> A["Build (CI)"]
    A[Read array[0]]         -> A["Read array[0]"]
    A[Parse {json}]          -> A["Parse {json}"]
    A -->|retry (3x)| B      -> A -->|"retry (3x)"| B
    subgraph Build (CI)      -> subgraph "Build (CI)"

Fatal, and quoting does NOT help:
    a literal " inside a label  -> write #quot;
    end / graph / class / subgraph / style / click as a node IDENTIFIER
        start --> end        -> start --> finish     ("end" is fine as a LABEL)
    a ; inside a sequence-diagram message
        A->>B: drain; wait   -> A->>B: drain, wait

Harmless, measured, and deliberately NOT flagged — escaping these is cargo
cult: # & % < > ? / - : emoji, Cyrillic, a raw newline inside a label, <br/>.
"""

from __future__ import annotations

import json
import os
import re
import sys
from typing import Iterator, NamedTuple

BRACKETS = set("()[]{}")

# Shape delimiters, longest opener first so `[[` is not read as `[`.
SHAPES: list[tuple[str, str]] = [
    ("[/", "/]"),
    ("[\\", "\\]"),
    ("[[", "]]"),
    ("[(", ")]"),
    ("([", "])"),
    ("((", "))"),
    ("{{", "}}"),
    ("[", "]"),
    ("(", ")"),
    ("{", "}"),
]

# Reserved words that fail as a node identifier even when quoted.
RESERVED_IDS = {"end", "graph", "subgraph", "class", "style", "click", "linkstyle", "classdef"}

FLOW_KINDS = ("graph", "flowchart")
ARROW = r"(?:-{2,3}>|-{3,}|={2,}>|-\.->|-\.-|--[ox]|~~~)"

SEQ_MESSAGE = re.compile(
    r"^\s*[\w\"']+\s*(?:->>|--?>>|->|-->|-[xX]|--[xX]|-\)|--\))[+-]?\s*[\w\"']+\s*:(?P<msg>.*)$"
)

# `#semi;` and `#59;` are the escapes Mermaid itself accepts — measured 2026-08-31
# on two agent-written diagrams the parser rendered. Strip every entity before
# testing for a bare `;`, or the escape reads as the hazard it cures.
ENTITY = re.compile(r"[#&]#?\w+;")


class Problem(NamedTuple):
    line: int
    text: str
    reason: str
    remedy: str


class Block(NamedTuple):
    """One mermaid diagram plus the file line its first line sits on."""

    kind: str
    lines: list[str]
    first_line: int


def read_blocks(path: str, source: str) -> list[Block]:
    """Split a Markdown file into its mermaid fences, or wrap a .mmd whole."""
    lines = source.splitlines()
    if not path.endswith(".md"):
        return [Block(diagram_kind(lines), lines, 1)]

    blocks: list[Block] = []
    inside = False
    start = 0
    buf: list[str] = []
    for i, line in enumerate(lines, start=1):
        stripped = line.strip()
        if not inside and re.match(r"^`{3,}\s*mermaid\b", stripped):
            inside, start, buf = True, i + 1, []
        elif inside and re.match(r"^`{3,}\s*$", stripped):
            blocks.append(Block(diagram_kind(buf), buf, start))
            inside = False
        elif inside:
            buf.append(line)
    if inside:
        blocks.append(Block(diagram_kind(buf), buf, start))
    return blocks


def diagram_kind(lines: list[str]) -> str:
    for line in lines:
        head = line.strip()
        if head and not head.startswith("%%"):
            return head.split()[0].lower().rstrip(";")
    return ""


def labels(line: str) -> Iterator[tuple[int, str, bool]]:
    """Yield (column, label_text, quoted) for every shape label on the line.

    A label starts at a shape opener that follows an identifier character, so
    the `(` of a plain word in prose is never mistaken for one.
    """
    i = 0
    n = len(line)
    while i < n:
        opener = closer = ""
        for o, c in SHAPES:
            if line.startswith(o, i):
                opener, closer = o, c
                break
        if not opener or i == 0 or not (line[i - 1].isalnum() or line[i - 1] == "_"):
            i += 1
            continue
        body_start = i + len(opener)
        if body_start < n and line[body_start] == '"':
            close_q = line.find('"', body_start + 1)
            if close_q == -1:
                yield (body_start, line[body_start + 1:], True)
                return
            text = line[body_start + 1:close_q]
            # A quoted label must be followed by its shape closer. Anything else
            # means the quote we stopped at was an inner one and the real label
            # runs past it — `A["He said "hi" loudly"]`, which mmdc refuses.
            rest = line[close_q + 1:].lstrip()
            if not rest.startswith(closer):
                text += '"' + line[close_q + 1:].split(closer)[0]
            yield (body_start, text, True)
            i = close_q + 1
            continue
        end = line.find(closer, body_start)
        body = line[body_start:end] if end != -1 else line[body_start:]
        yield (body_start, body, False)
        i = (end + len(closer)) if end != -1 else n


def edge_labels(line: str) -> Iterator[tuple[int, str, bool]]:
    """Yield (column, text, quoted) for every `|...|` edge label."""
    for m in re.finditer(r"\|([^|]*)\|", line):
        body = m.group(1)
        quoted = len(body) >= 2 and body.startswith('"') and body.endswith('"')
        yield (m.start(1), body[1:-1] if quoted else body, quoted)


def stray_pipes(line: str) -> bool:
    """True when an edge carries an odd number of pipes — one is inside the text.

    `A -->|yes|no| B` reads as a label `yes` followed by junk, and mmdc refuses
    the line. Three pipes on one edge is the signature.
    """
    return line.count("|") % 2 == 1


def check_flow_line(idx: int, line: str) -> list[Problem]:
    found: list[Problem] = []
    stripped = line.strip()

    if stripped.lower().startswith("subgraph "):
        title = stripped[len("subgraph "):].strip()
        # `subgraph id ["Title"]` and `subgraph "Title"` are both fine.
        if not title.startswith('"') and "[" not in title and BRACKETS & set(title):
            found.append(
                Problem(idx, stripped, "subgraph title carries an unquoted bracket",
                        f'subgraph "{title}"')
            )

    for _col, text, quoted in labels(line):
        if quoted:
            if '"' in text:
                found.append(
                    Problem(idx, stripped, "literal double quote inside a quoted label",
                            'replace each inner " with #quot;')
                )
        elif BRACKETS & set(text):
            found.append(
                Problem(idx, stripped, "node label carries an unquoted bracket",
                        f'wrap the label in double quotes: ["{text}"]')
            )

    for _col, text, quoted in edge_labels(line):
        if quoted:
            if '"' in text:
                found.append(
                    Problem(idx, stripped, "literal double quote inside a quoted edge label",
                            'replace each inner " with #quot;')
                )
        elif BRACKETS & set(text):
            found.append(
                Problem(idx, stripped, "edge label carries an unquoted bracket",
                        f'quote the edge label: |"{text}"|')
            )

    if re.search(ARROW, line) and stray_pipes(line):
        found.append(
            Problem(idx, stripped, "an unescaped '|' inside the edge label",
                    "write #124; for a literal pipe, or drop it from the label")
        )

    for m in re.finditer(rf"(^|\s){ARROW}\s*\"?([A-Za-z_][\w]*)\"?", line):
        word = m.group(2)
        if word.lower() in RESERVED_IDS:
            found.append(
                Problem(idx, stripped, f"'{word}' is reserved and cannot be a node id",
                        f'rename the node (quoting it does not help): {word}Node["{word}"]')
            )
    for m in re.finditer(rf"^\s*\"?([A-Za-z_][\w]*)\"?\s*{ARROW}", line):
        word = m.group(1)
        if word.lower() in RESERVED_IDS:
            found.append(
                Problem(idx, stripped, f"'{word}' is reserved and cannot be a node id",
                        f'rename the node (quoting it does not help): {word}Node["{word}"]')
            )
    return found


def check_sequence_line(idx: int, line: str) -> list[Problem]:
    m = SEQ_MESSAGE.match(line)
    if not m:
        return []
    if ";" in ENTITY.sub("", m.group("msg")):
        return [
            Problem(idx, line.strip(), "';' ends the statement inside a sequence message",
                    "write #semi; instead, or use a comma — quoting does not help")
        ]
    return []


def check_block(block: Block) -> list[Problem]:
    found: list[Problem] = []
    for offset, line in enumerate(block.lines):
        idx = block.first_line + offset
        if not line.strip() or line.strip().startswith("%%"):
            continue
        if block.kind in FLOW_KINDS:
            found.extend(check_flow_line(idx, line))
        elif block.kind == "sequencediagram":
            found.extend(check_sequence_line(idx, line))
    return found


def validate(path: str) -> dict:
    if not os.path.isfile(path):
        return {"valid": False, "file": path, "errors": [f"File not found: {path}"]}
    source = open(path, encoding="utf-8").read()
    blocks = read_blocks(path, source)
    if not blocks:
        return {"valid": False, "file": path, "errors": ["No mermaid diagram found in file"]}
    errors = [
        f"line {p.line}: {p.reason}\n    {p.text}\n    fix: {p.remedy}"
        for block in blocks
        for p in check_block(block)
    ]
    return {"valid": not errors, "file": path, "errors": errors}


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("usage: validate.py <file.md|file.mmd>", file=sys.stderr)
        return 2
    result = validate(argv[1])
    print(json.dumps({"ok": result["valid"], "result": result}))
    if result["valid"]:
        print(f"{result['file']}: no rendering hazards found.", file=sys.stderr)
        return 0
    print(f"{result['file']}: {len(result['errors'])} problem(s).", file=sys.stderr)
    for e in result["errors"]:
        print("  " + e, file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
