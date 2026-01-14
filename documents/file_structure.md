# File Structure Map

## Root Directory
- `.cursor/` - Cursor IDE configuration, rules, and commands.
- `documents/` - Project documentation (SRS, SDS, etc.).
- `scripts/` - Deno task scripts.
- `AGENTS.md` - Persistent project-wide agent rules.
- `README.md` - Project entry point and overview.
- `.gitignore` - Git ignore rules.
- `deno.json` - Deno task configuration.

## .cursor Directory
- `commands/` - Executable task workflows (16 commands).
  - `*.md` - Standard task definitions (check, commit, plan, investigate, etc.).
- `rules/` - Context rules and guides (27 rule directories total).
  - `rules-code-style-*/` - Language-specific coding standards (5 variants).
  - `rules-*/` - Core behavioral frameworks (Autonomous, TDD, Zen, PoC).
  - `rules-design-style-guide/` - Design principles and guidelines.
  - `howto-*/` - Practical workflow guides (12 guides).
  - `docs-schema-*/` - Documentation templates (3 schemas).
  - `rules-run-commands/` - Command execution rules.
  - `skill-creator/` - Skill authoring guide with templates and scripts.

## File Organization Patterns
- **Commands:** Named `<action>.md` (or `engineer-command.md`). Stored in `.cursor/commands/`.
- **Rules:** Named `rules-<topic>/` or `howto-<topic>/`. Each directory contains `RULE.md` with YAML frontmatter.
- **Scripts:** Deno task scripts in `./scripts/` with tasks configured in `deno.json`.
- **Docs:** Named according to SRS/SDS schema. Stored in `documents/`.

