# File Structure Map

## Root Directory
- `.cursor/` - Cursor IDE configuration, rules, and commands.
- `documents/` - Project documentation (SRS, SDS, etc.).
- `run.ts` - Deno-based project maintenance script.
- `README.md` - Project entry point and overview.
- `.gitignore` - Git ignore rules.

## .cursor Directory
- `commands/` - Executable task workflows (14 commands).
  - `task-*.md` - Standard task definitions (analyze-error, commit, plan, review, etc.).
  - `alpha-task-*.md` - Experimental task definitions.
- `rules/` - Context rules and guides (19 rules total).
  - `rules-code-style-*.mdc` - Language-specific coding standards.
  - `rules-*.mdc` - Core behavioral frameworks (autonomous, tdd, zen, gods, poc).
  - `howto-*.mdc` - Practical workflow guides (9 guides).
  - `docs-schema-*.mdc` - Documentation templates.
  - `rule-design-style-guide.mdc` - Design principles.
  - `run-commands.mdc` - Command execution rules.

## File Organization Patterns
- **Commands:** Named `task-<action>.md` or `alpha-task-<action>.md`. Stored in `.cursor/commands/`.
- **Rules:** Named `rules-<topic>.mdc`, `howto-<topic>.mdc`, or `rule-<topic>.mdc`. Stored in `.cursor/rules/`.
- **Scripts:** Named `run.ts` for Deno-based maintenance utilities. Root level.
- **Docs:** Named according to SRS/SDS schema. Stored in `documents/`.

