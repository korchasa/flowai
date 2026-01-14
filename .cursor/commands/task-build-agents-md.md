---
description: Generate optimized AGENTS.md from .cursor/rules/*/RULE.md files following best practices
---

# Build AGENTS.md

## Overview
Generate optimized `AGENTS.md` in project root from `.cursor/rules/*/RULE.md` files following best practices.

## Context
<context>
The project uses `.cursor/rules/*/RULE.md` files to define agent behavior and project standards. `AGENTS.md` serves as a consolidated rulebook for AI agents.
</context>

## Rules & Constraints
<rules>
1. **Manual Tool Usage**: Execute all steps using standard file manipulation tools.
2. **Direct Execution**: Perform reading and writing operations directly.
3. **No Scripts**: Avoid creating or running temporary scripts for this task.
4. **Planning**: The agent MUST use `todo_write` to track the execution steps.
</rules>

## Instructions
<step_by_step>
1. **Initialize**
   - Use `todo_write` to create a plan based on these steps.
2. **Validate input**
   - Check `.cursor/rules/*/RULE.md` files exists.
   - If empty or missing, output error and stop.
3. **Collect and categorize files**
   - Read all files by mask `.cursor/rules/*/RULE.md`.
   - Categorize by prefix:
     - `main/RULE.md` → Main section (first)
     - `rules-*/RULE.md` or `rule-*/RULE.md` → Rules section
     - `howto-*/RULE.md` → How-To Guides section
     - `docs-*/RULE.md` → Documentation Standards section
     - Others → Additional Rules section
   - Sort alphabetically within each category.
4. **Process files**
   - Remove frontmatter (between `---` and `---`) from each file.
   - Extract clean content.
   - Preserve markdown structure and formatting.
5. **Build AGENTS.md structure**
   Construct the file using the following order:
   1. Main content (`main/RULE.md`)
   2. Documentation Standards (`docs-*/RULE.md`)
   3. Command Rules (`rules-run-commands/RULE.md`)
   4. General Rules (`rules-*/RULE.md`)
   5. How-To Guides (`howto-*/RULE.md`)
   6. Other (`other/RULE.md`)
6. **Write AGENTS.md**
   - Save to project root: `./AGENTS.md`.
   - Overwrite if exists.
   - Ensure UTF-8 encoding, LF line breaks.
7. **Report completion**
   - List processed files by category.
   - Show total file count.
   - Confirm AGENTS.md location.
</step_by_step>

## Verification
<verification>
- [ ] No scripts created or used (manual execution only).
- [ ] All `.cursor/rules/*/RULE.md` files validated.
- [ ] Frontmatter removed from all files.
- [ ] AGENTS.md generated with proper structure.
- [ ] Section headers added for populated categories.
- [ ] File written to project root.
- [ ] Completion report displayed.
</verification>
