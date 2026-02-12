#!/usr/bin/env python3
"""
Rule validation script - validates rule files across IDE formats.

Usage:
    python validate_rule.py <path>

Supports:
    - Cursor: .cursor/rules/<name>/RULE.md or .cursor/rules/*.mdc
    - Claude Code: .claude/rules/*.md or CLAUDE.md
    - Antigravity: .agent/rules/*.md
    - OpenAI Codex: AGENTS.md
    - OpenCode: AGENTS.md, opencode.json "instructions"
"""

import sys
import re
import yaml
import json
from pathlib import Path


def detect_format(rule_path):
    """Detect rule format from path."""
    rule_path = Path(rule_path)
    name = rule_path.name
    parts = [p for p in rule_path.parts]

    # Check if it's an opencode.json file
    if name == "opencode.json":
        try:
            content = rule_path.read_text()
            data = json.loads(content)
            if "instructions" in data:
                return "opencode-json", rule_path
        except json.JSONDecodeError:
            pass
        return "unknown", rule_path

    # Check for .opencode/ directory in path
    if ".opencode" in parts:
        # AGENTS.md in .opencode/
        if rule_path.name == "AGENTS.md":
            return "opencode-agents", rule_path
        # Rules in .opencode/ (markdown files)
        if rule_path.suffix == ".md":
            return "opencode-rule", rule_path
        # Check parent for opencode.json
        if (
            rule_path.parent.name == "opencode"
            and rule_path.parent.parent.name == "opencode"
        ):
            parent_json = rule_path.parent.parent / "opencode.json"
            if parent_json.exists():
                try:
                    content = parent_json.read_text()
                    data = json.loads(content)
                    if "instructions" in data:
                        return "opencode-json", parent_json
                except json.JSONDecodeError:
                    pass
        return "unknown", rule_path

    # Check for Claude-compatible locations (OpenCode fallbacks)
    if ".claude" in parts and name == "AGENTS.md":
        return "claude-agents", rule_path
    if ".claude" in parts and name.endswith(".md"):
        return "claude-rule", rule_path

    if ".agents" in parts and name == "AGENTS.md":
        return "agents-agents", rule_path

    if rule_path.is_dir():
        # Directory-based rule (Cursor new format)
        rule_md = rule_path / "RULE.md"
        if rule_md.exists():
            return "cursor-dir", rule_md
        return None, None

    if name == "RULE.md":
        return "cursor-dir", rule_path

    if name.endswith(".mdc"):
        return "cursor-legacy", rule_path

    if name == "CLAUDE.md":
        return "claude-root", rule_path

    if ".claude" in parts and name.endswith(".md"):
        return "claude-rule", rule_path

    if ".agent" in parts and name.endswith(".md"):
        return "antigravity", rule_path

    if name in ("AGENTS.md", "AGENTS.override.md"):
        return "codex", rule_path

    return "unknown", rule_path


def extract_frontmatter(content):
    """Extract YAML frontmatter from content."""
    if not content.startswith("---"):
        return None, content

    match = re.match(r"^---\n(.*?)\n---\n?(.*)", content, re.DOTALL)
    if not match:
        return None, content

    try:
        fm = yaml.safe_load(match.group(1))
        if not isinstance(fm, dict):
            return None, content
        return fm, match.group(2)
    except yaml.YAMLError:
        return None, content


def validate_cursor_rule(content, is_legacy=False):
    """Validate Cursor rule format."""
    errors = []

    fm, body = extract_frontmatter(content)

    if fm is None:
        errors.append("No valid YAML frontmatter found")
        return errors

    # Check allowed fields
    allowed = {"description", "globs", "alwaysApply"}
    unexpected = set(fm.keys()) - allowed
    if unexpected:
        errors.append(
            f"Unexpected frontmatter key(s): {', '.join(sorted(unexpected))}. "
            f"Allowed: {', '.join(sorted(allowed))}"
        )

    # description is required
    if "description" not in fm:
        errors.append("Missing 'description' in frontmatter")
    elif not isinstance(fm["description"], str) or not fm["description"].strip():
        errors.append("'description' must be a non-empty string")

    # alwaysApply validation
    always_apply = fm.get("alwaysApply")
    if always_apply is not None and not isinstance(always_apply, bool):
        errors.append("'alwaysApply' must be a boolean")

    # globs validation
    globs = fm.get("globs")
    if globs is not None and not isinstance(globs, str):
        errors.append("'globs' must be a string")

    # If not alwaysApply, should have globs or description for discovery
    if not always_apply and not globs:
        if not fm.get("description"):
            errors.append(
                "Non-alwaysApply rule without globs must have a description for agent discovery"
            )

    # Line count check
    line_count = len(content.splitlines())
    if line_count > 500:
        errors.append(f"Rule is too long ({line_count} lines). Maximum is 500 lines.")

    # Body should not be empty
    if not body.strip():
        errors.append("Rule body is empty — add rule content after frontmatter")

    return errors


def validate_claude_rule(content):
    """Validate Claude Code rule format."""
    errors = []

    fm, body = extract_frontmatter(content)

    if fm is not None:
        allowed = {"description", "paths"}
        unexpected = set(fm.keys()) - allowed
        if unexpected:
            errors.append(
                f"Unexpected frontmatter key(s): {', '.join(sorted(unexpected))}. "
                f"Allowed: {', '.join(sorted(allowed))}"
            )

    if not body.strip():
        errors.append("Rule body is empty")

    line_count = len(content.splitlines())
    if line_count > 500:
        errors.append(f"Rule is too long ({line_count} lines). Maximum is 500 lines.")

    return errors


def validate_opencode_rule(content):
    """Validate OpenCode rule format (AGENTS.md)."""
    errors = []

    if not content.strip():
        errors.append("Rule file is empty")

    line_count = len(content.splitlines())
    if line_count > 500:
        errors.append(f"Rule is too long ({line_count} lines). Maximum is 500 lines.")

    return errors


def validate_opencode_json(data):
    """Validate opencode.json 'instructions' field."""
    errors = []

    if "instructions" not in data:
        errors.append("Missing 'instructions' field in opencode.json")

    elif not isinstance(data["instructions"], list):
        errors.append("'instructions' must be an array")

    else:
        for i, item in enumerate(data["instructions"]):
            if not isinstance(item, str) and not isinstance(item, dict):
                errors.append(
                    f"instructions[{i}] must be a string or object with 'path'/'glob'/'url'"
                )
            elif isinstance(item, dict):
                if not any(k in item for k in ("path", "glob", "url")):
                    errors.append(
                        f"instructions[{i}] dict must contain at least one of: path, glob, url"
                    )

    return errors


def validate_rule(path):
    """
    Validate a rule file or directory.

    Returns:
        (bool, str): (is_valid, message)
    """
    path = Path(path)

    fmt, rule_file = detect_format(path)

    if fmt is None or rule_file is None:
        return False, f"No rule file found at {path}"

    if not rule_file.exists():
        return False, f"Rule file not found: {rule_file}"

    content = rule_file.read_text()

    if fmt == "opencode-json":
        try:
            data = json.loads(content)
            errors = validate_opencode_json(data)
        except json.JSONDecodeError as e:
            return False, f"Invalid JSON: {e}"

    elif fmt in ("cursor-dir", "cursor-legacy"):
        errors = validate_cursor_rule(content, is_legacy=(fmt == "cursor-legacy"))
        if fmt == "cursor-legacy":
            errors.append(
                "Warning: .mdc format is deprecated. "
                "Prefer .cursor/rules/<name>/RULE.md directory format."
            )

    elif fmt in ("claude-root", "claude-rule"):
        errors = validate_claude_rule(content)

    elif fmt in ("opencode-agents", "claude-agents", "agents-agents"):
        errors = validate_opencode_rule(content)

    elif fmt in ("antigravity", "codex"):
        # Plain markdown rules
        errors = []
        if not content.strip():
            errors.append("Rule file is empty")

        line_count = len(content.splitlines())
        if line_count > 500:
            errors.append(
                f"Rule is too long ({line_count} lines). Maximum is 500 lines."
            )

    else:
        errors = ["Unknown format"]

    if errors:
        return False, "Validation issues:\n" + "\n".join(f"  - {e}" for e in errors)

    return True, f"Rule is valid! (format: {fmt})"


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python validate_rule.py <rule-path>")
        print("\nSupported paths:")
        print("  .cursor/rules/my-rule/          (Cursor directory)")
        print("  .cursor/rules/my-rule/RULE.md   (Cursor RULE.md)")
        print("  .cursor/rules/my-rule.mdc       (Cursor legacy)")
        print("  .claude/rules/my-rule.md        (Claude Code)")
        print("  CLAUDE.md                       (Claude Code root)")
        print("  .agent/rules/my-rule.md         (Antigravity)")
        print("  AGENTS.md                       (OpenAI Codex)")
        print("\nOpenCode paths:")
        print("  .opencode/AGENTS.md              (OpenCode rules)")
        print("  .opencode/                       (OpenCode rules directory)")
        print("  opencode.json                   (OpenCode config)")
        print("\nOpenCode fallbacks (Claude-compatible):")
        print("  .claude/AGENTS.md                (Claude Code)")
        print("  .claude/rules/*.md               (Claude Code)")
        print("  .agents/AGENTS.md                (Agent-compatible)")
        print("\nOpenCode paths:")
        print("  .opencode/AGENTS.md              (OpenCode rules)")
        print("  .opencode/                   (OpenCode rules directory)")
        print("  opencode.json                   (OpenCode config)")
        print("\nOpenCode fallbacks (Claude-compatible):")
        print("  .claude/AGENTS.md                (Claude Code)")
        print("  .claude/rules/*.md               (Claude Code)")
        print("  .agents/AGENTS.md                (Agent-compatible)")
        sys.exit(1)

    valid, message = validate_rule(sys.argv[1])
    print(message)
    sys.exit(0 if valid else 1)
