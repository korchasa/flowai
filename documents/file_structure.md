# File Structure Map

## Root Directory
- `.cursor/` - Cursor IDE configuration, rules, and commands.
- `documents/` - Project documentation (SRS, SDS, etc.).
- `README.md` - Project entry point and overview.
- `.gitignore` - Git ignore rules.

## .cursor Directory
- `commands/` - Executable task workflows (12 commands).
  - `task-*.md` - Standard task definitions (check, commit, plan, investigate, etc.).
  - `alpha-task-*.md` - Experimental task definitions.
- `rules/` - Context rules and guides (20 rules total).
  - `rules-code-style-*/` - Language-specific coding standards (4 variants).
  - `rules-*/` - Core behavioral frameworks (Autonomous, TDD, Zen, PoC).
  - `howto-*/` - Practical workflow guides (10 guides).
  - `docs-schema-*/` - Documentation templates (2 schemas).
  - `rule-design-style-guide/` - Design principles and guidelines.
  - `rules-run-commands/` - Command execution rules.
  - `main-example/` - Core project rules and guidelines.

## File Organization Patterns
- **Commands:** Named `task-<action>.md` or `alpha-task-<action>.md`. Stored in `.cursor/commands/`.
- **Rules:** Named `rules-<topic>/`, `howto-<topic>/`, or `rule-<topic>/`. Each directory contains `RULE.md` with YAML frontmatter.
- **Scripts:** Named `run.ts` for Deno-based maintenance utilities. Root level.
- **Docs:** Named according to SRS/SDS schema. Stored in `documents/`.

