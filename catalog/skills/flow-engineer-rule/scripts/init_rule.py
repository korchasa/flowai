#!/usr/bin/env python3
"""
Rule Initializer - Creates a new rule from template for the target IDE.

Usage:
    init_rule.py <rule-name> --ide <cursor|claude|antigravity|codex|opencode> --path <path> [--always-apply] [--globs PATTERN]

Examples:
    init_rule.py typescript-standards --ide cursor --path .cursor/rules --globs "**/*.ts"
    init_rule.py coding-standards --ide cursor --path .cursor/rules --always-apply
    init_rule.py typescript-standards --ide claude --path .claude/rules --globs "src/**/*.ts"
    init_rule.py project-rules --ide antigravity --path .agent/rules
    init_rule.py project-rules --ide opencode --path .opencode
    init_rule.py project-rules --ide codex --path .
    init_rule.py project-rules --ide opencode --path .
"""

import sys
import argparse
from pathlib import Path


CURSOR_TEMPLATE_CONDITIONAL = """---
description: {description}
globs: "{globs}"
alwaysApply: false
---

# {title}

[TODO: Add rule content here. Include concrete code examples.]

"""

CURSOR_TEMPLATE_ALWAYS = """---
description: {description}
alwaysApply: true
---

# {title}

[TODO: Add rule content here. Include concrete code examples.]

"""

CLAUDE_TEMPLATE_CONDITIONAL = """---
description: {description}
paths: {globs}
---

# {title}

[TODO: Add rule content here. Include concrete code examples.]

"""

CLAUDE_TEMPLATE_ALWAYS = """# {title}

[TODO: Add rule content here. Include concrete code examples.]

"""

PLAIN_TEMPLATE = """# {title}

[TODO: Add rule content here. Include concrete code examples.]
"""

OPENCODE_AGENTS_TEMPLATE = """# {title}

[TODO: Add rule content here. Include concrete code examples.]
"""


def title_case(name):
    """Convert kebab-case to Title Case."""
    return " ".join(word.capitalize() for word in name.split("-"))


def init_rule(rule_name, ide, path, always_apply=False, globs=None):
    """
    Initialize a new rule file for the specified IDE.

    Returns:
        Path to created rule file, or None if error
    """
    path = Path(path).resolve()
    title = title_case(rule_name)
    description = f"[TODO: Describe what this rule enforces]"

    if ide == "cursor":
        # Directory-based: .cursor/rules/<name>/RULE.md
        rule_dir = path / rule_name
        if rule_dir.exists():
            print(f"Error: Rule directory already exists: {rule_dir}")
            return None

        rule_dir.mkdir(parents=True, exist_ok=False)

        if always_apply:
            content = CURSOR_TEMPLATE_ALWAYS.format(
                description=description, title=title
            )
        else:
            content = CURSOR_TEMPLATE_CONDITIONAL.format(
                description=description, title=title, globs=globs or "**/*"
            )

        rule_file = rule_dir / "RULE.md"
        rule_file.write_text(content)
        print(f"Created {rule_file}")
        return rule_file

    elif ide == "claude":
        path.mkdir(parents=True, exist_ok=True)

        if always_apply and not globs:
            content = CLAUDE_TEMPLATE_ALWAYS.format(title=title)
        else:
            content = CLAUDE_TEMPLATE_CONDITIONAL.format(
                description=description, title=title, globs=globs or "**/*"
            )

        rule_file = path / f"{rule_name}.md"
        if rule_file.exists():
            print(f"Error: Rule file already exists: {rule_file}")
            return None

        rule_file.write_text(content)
        print(f"Created {rule_file}")
        return rule_file

    elif ide in ("antigravity", "codex"):
        path.mkdir(parents=True, exist_ok=True)
        content = PLAIN_TEMPLATE.format(title=title)

        rule_file = path / f"{rule_name}.md"
        if rule_file.exists():
            print(f"Error: Rule file already exists: {rule_file}")
            return None

        rule_file.write_text(content)
        print(f"Created {rule_file}")
        return rule_file

    elif ide == "opencode":
        path.mkdir(parents=True, exist_ok=True)
        content = OPENCODE_AGENTS_TEMPLATE.format(title=title)

        rule_file = path / "AGENTS.md"
        if rule_file.exists():
            print(f"Error: AGENTS.md already exists: {rule_file}")
            return None

        rule_file.write_text(content)
        print(f"Created {rule_file}")
        return rule_file

    else:
        print(f"Error: Unknown IDE '{ide}'")
        return None


def main():
    parser = argparse.ArgumentParser(description="Initialize a new rule")
    parser.add_argument("rule_name", help="Rule name in kebab-case")
    parser.add_argument(
        "--ide",
        required=True,
        choices=["cursor", "claude", "antigravity", "codex", "opencode"],
        help="Target IDE",
    )
    parser.add_argument("--path", required=True, help="Directory to create rule in")
    parser.add_argument(
        "--always-apply",
        action="store_true",
        help="Rule always applies (no file pattern)",
    )
    parser.add_argument("--globs", help="File glob pattern for conditional rules")

    args = parser.parse_args()

    print(f"Initializing rule: {args.rule_name}")
    print(f"   IDE: {args.ide}")
    print(f"   Location: {args.path}")
    if args.always_apply:
        print("   Scope: always apply")
    elif args.globs:
        print(f"   Scope: {args.globs}")
    print()

    result = init_rule(
        args.rule_name,
        args.ide,
        args.path,
        always_apply=args.always_apply,
        globs=args.globs,
    )

    if result:
        print(f"\nRule initialized. Edit the file to complete TODO items.")
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
