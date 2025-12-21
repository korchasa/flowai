---
description: Generate optimized AGENTS.md from .cursor/rules/*/RULE.md files following best practices
---

# Build AGENTS.md

## Overview
Generate optimized `AGENTS.md` in project root from `.cursor/rules/*/RULE.md` files following best practices.

## Important Restrictions
- **NO SCRIPTS**: Do not create, use, or suggest any scripts for this task
- **Manual execution only**: All steps must be performed manually using available tools
- **No automation**: Do not automate file reading, processing, or writing operations
- **Direct tool usage**: Use file reading and writing tools directly to perform each step

## CLAUDE.md Best Practices
- **Concise**: File prepended to every prompt; minimize token usage
- **Declarative bullets**: Short bullet points, not narrative paragraphs
- **Specific**: "Use 2-space indentation" > "Format code properly"
- **No redundancy**: If folder named `components`, don't explain it contains components
- **Only essentials**: Include only what Claude needs to work effectively
- **Standard sections**: Tech Stack, Project Structure, Commands, Code Style, Repository Etiquette
- **Structured hierarchy**: Use headings (##, ###) for clear organization
- **Imperative mood**: "Do X", "Use Y", "Follow Z"

## Todo List
1. **Validate input**
   - Check `.cursor/rules/*/RULE.md` files exists
   - If empty or missing, output error and stop

2. **Collect and categorize files**
   - Read all files by mask `.cursor/rules/*/RULE.md`
   - Categorize by prefix:
     - `main/RULE.md` → Main section (first)
     - `rules-*/RULE.md` or `rule-*/RULE.md` → Rules section
     - `howto-*/RULE.md` → How-To Guides section
     - `docs-*/RULE.md` → Documentation Standards section
     - Others → Additional Rules section
   - Sort alphabetically within each category

3. **Process files**
   - Remove frontmatter (between `---` and `---`) from each file
   - Extract clean content
   - Preserve markdown structure and formatting

4. **Build AGENTS.md structure**
   ```
   [content from main/RULE.md if exists]
   [content from docs-*/RULE.md files]
   [content from rules-run-commands/RULE.md file]
   [content from rules-*/RULE.md files]
   [content from howto-*/RULE.md files]
   [content from other RULE.md files]
   ```
   - Separate sections with `---` (horizontal rule)
   - Separate files within section with blank line

5. **Write AGENTS.md**
   - Save to project root: `./AGENTS.md`
   - Overwrite if exists
   - Ensure UTF-8 encoding, LF line breaks

6. **Report completion**
   - List processed files by category
   - Show total file count
   - Confirm AGENTS.md location

## Implementation Notes
- **Manual process**: Execute all steps manually using file reading/writing tools; no scripts allowed
- Use consistent heading levels: # for title, ## for categories, ### for files
- Preserve all markdown formatting from source files
- Maintain blank lines between sections for readability
- Strip only frontmatter YAML blocks; keep all other content
- If `main/RULE.md` missing, skip Main section (no error)
- Categories with zero files are omitted from output

## Checklist
- [ ] No scripts created or used (manual execution only)
- [ ] All `.cursor/rules/*/RULE.md` files validated
- [ ] Frontmatter removed from all files
- [ ] AGENTS.md generated with proper structure
- [ ] Section headers added for populated categories
- [ ] File written to project root
- [ ] Completion report displayed
