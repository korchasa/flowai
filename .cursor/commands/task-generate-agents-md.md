# Generate AGENTS.md

## Overview
This command scans all rule files in `.cursor/rules/`, selects those marked as always applicable (`alwaysApply: true`), and consolidates them into a single `AGENTS.md` file in the project root. The rules are ordered from most global/critical to specific/detailed.

## Trigger
- `/generate-agents-md`

## Todo List
1. **Scan Directory**
   - Read all files in `.cursor/rules/`.

2. **Filter Files**
   - Identify files containing `alwaysApply: true` in their YAML frontmatter.

3. **Sort Files**
   - Arrange the filtered files in the following priority order (Global -> Specific):
     1. `main.mdc` (Project Core & Persona)
     2. `docs-schema-rds-sds.mdc` (Documentation Standards)
     3. `rule-design-style-guide.mdc` (Design System)
     4. `rules-agents.mdc` (Agent Rules)
     5. `rules-autonomous.mdc` (Autonomous Behavior)
     6. `rules-code-style-fullstack.mdc` (General Code Style)
     7. `rules-code-style-ts-deno.mdc` (Language Specifics)
     8. `rules-poc.mdc` (PoC Mode Constraints)
     9. `rules-tdd.mdc` (Testing Process)
     10. `rules-zen.mdc` (Philosophy)
     11. `run-commands.mdc` (CLI Usage)
   - Any other files with `alwaysApply: true` should be appended alphabetically after the above list.

4. **Extract Content**
   - For each file, strip the YAML frontmatter (the content between the first two `---` blocks).
   - Keep the rest of the markdown content.

5. **Compose `AGENTS.md`**
   - Create/Overwrite `AGENTS.md` in the project root.
   - Add a header: `<!-- GENERATED FILE. DO NOT EDIT MANUALLY. RUN /update-agents-md TO UPDATE. -->`
   - Append the content of each file in the sorted order.
   - Ensure there is a blank line or separator between sections.

## Checklist
- [ ] Directory `.cursor/rules/` scanned
- [ ] Files filtered by `alwaysApply: true`
- [ ] Files sorted according to priority list
- [ ] Content extracted (frontmatter removed)
- [ ] `AGENTS.md` created/overwritten in project root
- [ ] Auto-generation warning header added
- [ ] Content appended with correct separators

## Output
- `AGENTS.md` file in the project root.
