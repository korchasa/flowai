# Build CLAUDE.md

## Overview
Generate optimized `CLAUDE.md` in project root from `.cursor/rules/*.mdc` files following Claude Code best practices.

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

## Steps
1. **Validate input**
   - Check `.cursor/rules/` exists and contains `.mdc` files
   - If empty or missing, output error and stop

2. **Collect and categorize files**
   - Read all `.mdc` files from `.cursor/rules/`
   - Categorize by prefix:
     - `main.mdc` → Main section (first)
     - `rules-*.mdc` → Rules section
     - `howto-*.mdc` → How-To Guides section
     - `docs-*.mdc` → Documentation Standards section
     - `run-commands.mdc` → Commands section
     - Others → Additional Rules section
   - Sort alphabetically within each category

3. **Process files**
   - Remove frontmatter (between `---` and `---`) from each file
   - Extract clean content
   - Preserve markdown structure and formatting

4. **Build CLAUDE.md structure**
   ```
   # Project Instructions

   [content from main.mdc if exists]

   ## Rules
   [content from rules-*.mdc files]

   ## How-To Guides
   [content from howto-*.mdc files]

   ## Documentation Standards
   [content from docs-*.mdc files]

   ## Commands
   [content from run-commands.mdc if exists]

   ## Additional Rules
   [content from other .mdc files]
   ```
   - Add section headers only if category has files
   - Add `### [filename without extension]` as subsection header for each file
   - Separate files within section with blank line

5. **Write CLAUDE.md**
   - Save to project root: `./CLAUDE.md`
   - Overwrite if exists
   - Ensure UTF-8 encoding, LF line breaks

6. **Report completion**
   - List processed files by category
   - Show total file count
   - Confirm CLAUDE.md location

## Implementation Notes
- **Manual process**: Execute all steps manually using file reading/writing tools; no scripts allowed
- Use consistent heading levels: # for title, ## for categories, ### for files
- Preserve all markdown formatting from source files
- Maintain blank lines between sections for readability
- Strip only frontmatter YAML blocks; keep all other content
- If `main.mdc` missing, skip Main section (no error)
- Categories with zero files are omitted from output

## Checklist
- [ ] No scripts created or used (manual execution only)
- [ ] `.cursor/rules/` directory validated
- [ ] All `.mdc` files collected and categorized
- [ ] Frontmatter removed from all files
- [ ] CLAUDE.md generated with proper structure
- [ ] Section headers added for populated categories
- [ ] File written to project root
- [ ] Completion report displayed
