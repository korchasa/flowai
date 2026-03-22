---
name: flow-skill-example
description: Example skill demonstrating variable renaming across a project.
---

# flow-skill-example: Rename Variable Across Project

A simple example skill that guides an agent through renaming a variable consistently across all files in a project.

## When to Use

Use this skill when you need to rename a variable, function, or identifier across multiple files in a project while preserving correctness.

## Workflow

1. **Identify all occurrences** — search the entire project for the variable name using grep or a similar tool. Note every file and line number.
2. **Plan the rename** — confirm the target name does not conflict with existing identifiers.
3. **Apply changes** — replace all occurrences in every file, preserving context (e.g., do not rename unrelated symbols with the same name).
4. **Verify** — run the project's linter/type-checker to confirm no errors were introduced.
5. **Report** — summarize which files were changed and how many occurrences were replaced.

## Rules

- Replace ALL occurrences; partial renames cause bugs.
- Do not rename occurrences in comments unless they refer to the variable by name.
- Preserve code style (casing, formatting).
