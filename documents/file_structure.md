# File Structure Map

## Root Directory

- `.cursor/` - Cursor IDE configuration, skills, and agents.
- `documents/` - Project documentation (SRS, SDS, etc.).
- `scripts/` - Deno task scripts and benchmarks.
  - `benchmarks/` - Agent benchmarking system.
    - `lib/` - Core benchmarking logic.
    - `scenarios/` - Test scenario definitions.
    - `work/` - Runtime sandboxes (git-ignored).
- `AGENTS.md` - Persistent project-wide agent rules.
- `README.md` - Project entry point and overview.
- `.gitignore` - Git ignore rules.
- `deno.json` - Deno task configuration.

## .cursor Directory

- `agents/` - Agent definitions and prompts.
- `skills/` - Executable skills and workflows.
  - `af-*/` - Command-like skills (formerly commands).
  - `af-skill-*/` - How-to guides and workflows.
  - `rules-*/` - Context rules and behavioral frameworks.

## File Organization Patterns

- **Skills:** Stored in `.cursor/skills/` as directories containing `SKILL.md`.
- **Agents:** Stored in `.cursor/agents/` as `.md` files.
- **Scripts:** Deno task scripts in `./scripts/` with tasks configured in
  `deno.json`.
- **Docs:** Named according to SRS/SDS schema. Stored in `documents/`.
