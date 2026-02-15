#!/usr/bin/env python3
"""
Skill Initializer - Creates a new skill from template

Usage:
    init_skill.py <skill-name> --path <path>

Examples:
    init_skill.py my-review-skill --path .cursor/skills
    init_skill.py code-analyzer --path ~/.cursor/skills
"""

import sys
from pathlib import Path


SKILL_TEMPLATE = """---
name: {skill_name}
description: [TODO: Complete and informative explanation of what the skill does and when to use it. Include WHEN to use this skill - specific scenarios, file types, or tasks that trigger it.]
---

# {skill_title}

## Overview

[TODO: 1-2 sentences explaining what this skill enables]

## Instructions

[TODO: Clear, step-by-step guidance for the agent. Choose structure that fits:

**1. Workflow-Based** (sequential processes)
- Structure: ## Overview -> ## Step 1 -> ## Step 2...

**2. Task-Based** (tool collections)
- Structure: ## Overview -> ## Task Category 1 -> ## Task Category 2...

**3. Reference/Guidelines** (standards or specifications)
- Structure: ## Overview -> ## Guidelines -> ## Specifications...

Delete this guidance section when done.]

## Resources

This skill includes example resource directories:

### scripts/
Executable code for automation. Customize or delete `scripts/example.py`.

### references/
Documentation loaded into context as needed. Customize or delete `references/reference.md`.

### assets/
Files used in output (templates, images, fonts). Customize or delete `assets/example_asset.txt`.

**Delete unneeded directories.** Not every skill requires all three.
"""

EXAMPLE_SCRIPT = '''#!/usr/bin/env python3
"""
Example helper script for {skill_name}

Replace with actual implementation or delete if not needed.
"""

def main():
    print("This is an example script for {skill_name}")
    # TODO: Add actual script logic here

if __name__ == "__main__":
    main()
'''

EXAMPLE_REFERENCE = """# Reference Documentation for {skill_title}

Replace with actual reference content or delete if not needed.

## When Reference Docs Are Useful

- Comprehensive API documentation
- Detailed workflow guides
- Complex multi-step processes
- Information too lengthy for main SKILL.md
- Content only needed for specific use cases
"""

EXAMPLE_ASSET = """# Example Asset File

Replace with actual asset files (templates, images, fonts, etc.) or delete if not needed.

Asset files are NOT loaded into context — they are used within the output the agent produces.
"""


def title_case_name(name):
    """Convert hyphenated name to Title Case."""
    return " ".join(word.capitalize() for word in name.split("-"))


def init_skill(skill_name, path):
    """
    Initialize a new skill directory with template SKILL.md.

    Args:
        skill_name: Name of the skill
        path: Path where the skill directory should be created

    Returns:
        Path to created skill directory, or None if error
    """
    skill_dir = Path(path).resolve() / skill_name

    if skill_dir.exists():
        print(f"Error: Skill directory already exists: {skill_dir}")
        return None

    try:
        skill_dir.mkdir(parents=True, exist_ok=False)
        print(f"Created skill directory: {skill_dir}")
    except Exception as e:
        print(f"Error creating directory: {e}")
        return None

    # Create SKILL.md
    skill_title = title_case_name(skill_name)
    content = SKILL_TEMPLATE.format(skill_name=skill_name, skill_title=skill_title)

    try:
        (skill_dir / "SKILL.md").write_text(content)
        print("Created SKILL.md")
    except Exception as e:
        print(f"Error creating SKILL.md: {e}")
        return None

    # Create resource directories with examples
    try:
        scripts_dir = skill_dir / "scripts"
        scripts_dir.mkdir(exist_ok=True)
        example_script = scripts_dir / "example.py"
        example_script.write_text(EXAMPLE_SCRIPT.format(skill_name=skill_name))
        example_script.chmod(0o755)
        print("Created scripts/example.py")

        references_dir = skill_dir / "references"
        references_dir.mkdir(exist_ok=True)
        (references_dir / "reference.md").write_text(
            EXAMPLE_REFERENCE.format(skill_title=skill_title)
        )
        print("Created references/reference.md")

        assets_dir = skill_dir / "assets"
        assets_dir.mkdir(exist_ok=True)
        (assets_dir / "example_asset.txt").write_text(EXAMPLE_ASSET)
        print("Created assets/example_asset.txt")
    except Exception as e:
        print(f"Error creating resource directories: {e}")
        return None

    print(f"\nSkill '{skill_name}' initialized at {skill_dir}")
    print("\nNext steps:")
    print("1. Edit SKILL.md — complete TODO items, update description")
    print("2. Customize or delete example files in scripts/, references/, assets/")
    print("3. Run validate_skill.py to check structure")

    return skill_dir


def main():
    if len(sys.argv) < 4 or sys.argv[2] != "--path":
        print("Usage: init_skill.py <skill-name> --path <path>")
        print("\nSkill name requirements:")
        print("  - Hyphen-case (e.g., 'code-review')")
        print("  - Lowercase letters, digits, hyphens only")
        print("  - Max 64 characters")
        print("\nExamples:")
        print("  init_skill.py code-review --path .cursor/skills")
        print("  init_skill.py pr-analyzer --path ~/.cursor/skills")
        sys.exit(1)

    skill_name = sys.argv[1]
    path = sys.argv[3]

    print(f"Initializing skill: {skill_name}")
    print(f"   Location: {path}\n")

    result = init_skill(skill_name, path)
    sys.exit(0 if result else 1)


if __name__ == "__main__":
    main()
