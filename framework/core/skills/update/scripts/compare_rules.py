#!/usr/bin/env python3
"""List the named rules of an AGENTS template that a project AGENTS.md lacks.

Bundled with the flowai `update` skill. A "named rule" is a list item that
opens with a bold label — `- **Proactive Resolution**: ...` or
`4. **CHECK**: ...`; a "section" is a Markdown heading of level 1 to 3. Names
and headings are compared case-insensitively, ignoring punctuation and
backticks, and a rule counts as present when the project file carries a rule
with that name in ANY section, so a rule the project moved is not reported.
Lines inside fenced code blocks are skipped.

The point is an inventory the agent cannot summarise away: every missing rule
is printed on its own line with the template section it belongs to.

Usage:
    python3 compare_rules.py <template> <project AGENTS.md>

Exit codes: 0 — compared (whether or not anything is missing);
2 — wrong arguments or a file could not be read (the message names it).
"""

import re
import sys
from pathlib import Path

HEADING = re.compile(r"^(#{1,3})\s+(.+?)\s*#*\s*$")
RULE = re.compile(r"^\s*(?:[-*+]|\d+\.)\s+\*\*(.+?)\*\*")
FENCE = re.compile(r"^\s*(```|~~~)")


def key(text: str) -> str:
    """Comparison key: lowercase words, punctuation and backticks dropped."""
    return " ".join(re.sub(r"[^\w]+", " ", text.lower()).split())


def label(text: str) -> str:
    """Display form of a bold label: no backticks, no trailing `:` or `.`."""
    return text.replace("`", "").strip().rstrip(":.").strip()


def parse(text: str) -> list[tuple[str, list[str]]]:
    """Return [(section heading, [rule labels])] in document order.

    Rules before the first heading land in a section with an empty heading.
    """
    sections: list[tuple[str, list[str]]] = [("", [])]
    in_fence = False
    for line in text.splitlines():
        if FENCE.match(line):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        heading = HEADING.match(line)
        if heading:
            sections.append((label(heading.group(2)), []))
            continue
        rule = RULE.match(line)
        if rule:
            name = label(rule.group(1))
            if key(name):
                sections[-1][1].append(name)
    return [s for s in sections if s[0] or s[1]]


def read(path: str) -> str:
    try:
        return Path(path).read_text(encoding="utf-8")
    except OSError as err:
        print(f"error: cannot read {path}: {err.strerror}", file=sys.stderr)
        sys.exit(2)


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print(
            "usage: compare_rules.py <template> <project AGENTS.md>",
            file=sys.stderr,
        )
        return 2
    template_path, artifact_path = argv
    template = parse(read(template_path))
    artifact = parse(read(artifact_path))

    artifact_sections = {key(h) for h, _ in artifact if h}
    artifact_rules = {key(r) for _, rules in artifact for r in rules}
    count = lambda doc: sum(len(rules) for _, rules in doc)  # noqa: E731

    print(
        f"Template: {template_path} — {len([h for h, _ in template if h])} "
        f"sections, {count(template)} named rules"
    )
    print(
        f"Artifact: {artifact_path} — {len(artifact_sections)} sections, "
        f"{count(artifact)} named rules"
    )

    in_present: list[str] = []
    in_absent: list[str] = []
    missing_sections: list[str] = []
    for heading, rules in template:
        present = not heading or key(heading) in artifact_sections
        if heading and not present:
            missing_sections.append(f"- {heading} ({len(rules)} named rules)")
        for rule in rules:
            if key(rule) in artifact_rules:
                continue
            line = f"- [{heading or '(top)'}] {rule}"
            (in_present if present else in_absent).append(line)

    total = len(in_present) + len(in_absent)
    print()
    if total == 0:
        print("Missing named rules: none.")
    else:
        print(f"Missing named rules: {total}. Name each one in the proposal.")
        if in_present:
            print()
            print("In sections the artifact already has:")
            print("\n".join(in_present))
        if in_absent:
            print()
            print("In sections the artifact does not have:")
            print("\n".join(in_absent))
    print()
    if missing_sections:
        print(f"Missing sections: {len(missing_sections)}.")
        print("\n".join(missing_sections))
    else:
        print("Missing sections: none.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
