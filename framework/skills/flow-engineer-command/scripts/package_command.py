#!/usr/bin/env python3
"""
Command Packager - Creates a distributable .skill file of a command folder

Usage:
    python utils/package_command.py <path/to/command-folder> [output-directory]

Example:
    python utils/package_command.py skills/public/flow-my-command
    python utils/package_command.py skills/public/flow-my-command ./dist
"""

import sys
import zipfile
from pathlib import Path
from validate_command import validate_command


def package_command(command_path, output_dir=None):
    """
    Package a command folder into a .skill file.

    Args:
        command_path: Path to the command folder
        output_dir: Optional output directory for the .skill file (defaults to current directory)

    Returns:
        Path to the created .skill file, or None if error
    """
    command_path = Path(command_path).resolve()

    # Validate command folder exists
    if not command_path.exists():
        print(f"❌ Error: Command folder not found: {command_path}")
        return None

    if not command_path.is_dir():
        print(f"❌ Error: Path is not a directory: {command_path}")
        return None

    # Validate SKILL.md exists
    skill_md = command_path / "SKILL.md"
    if not skill_md.exists():
        print(f"❌ Error: SKILL.md not found in {command_path}")
        return None

    # Run validation before packaging
    print("🔍 Validating command...")
    valid, message = validate_command(command_path)
    if not valid:
        print(f"❌ Validation failed: {message}")
        print("   Please fix the validation errors before packaging.")
        return None
    print(f"✅ {message}\n")

    # Determine output location
    command_name = command_path.name
    if output_dir:
        output_path = Path(output_dir).resolve()
        output_path.mkdir(parents=True, exist_ok=True)
    else:
        output_path = Path.cwd()

    command_filename = output_path / f"{command_name}.skill"

    # Create the .skill file (zip format)
    try:
        with zipfile.ZipFile(command_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # Walk through the command directory
            for file_path in command_path.rglob('*'):
                if file_path.is_file():
                    # Calculate the relative path within the zip
                    arcname = file_path.relative_to(command_path.parent)
                    zipf.write(file_path, arcname)
                    print(f"  Added: {arcname}")

        print(f"\n✅ Successfully packaged command to: {command_filename}")
        return command_filename

    except Exception as e:
        print(f"❌ Error creating .skill file: {e}")
        return None


def main():
    if len(sys.argv) < 2:
        print("Usage: python utils/package_command.py <path/to/command-folder> [output-directory]")
        print("\nExample:")
        print("  python utils/package_command.py skills/public/flow-my-command")
        print("  python utils/package_command.py skills/public/flow-my-command ./dist")
        sys.exit(1)

    command_path = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else None

    print(f"📦 Packaging command: {command_path}")
    if output_dir:
        print(f"   Output directory: {output_dir}")
    print()

    result = package_command(command_path, output_dir)

    if result:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
