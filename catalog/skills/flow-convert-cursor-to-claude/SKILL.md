---
name: flow-convert-cursor-to-claude
description: Converts a project's Cursor IDE primitives to Claude Code equivalents. Use when migrating a project from Cursor to Claude Code, or when setting up Claude Code alongside an existing Cursor config. Handles AGENTS.md, .cursor/rules/, commands/, skills/, agents/, hooks.json, mcp.json.
disable-model-invocation: true
---

# Convert Cursor → Claude Code

Migrates all Cursor IDE primitives to Claude Code equivalents by running `scripts/convert.py`.

## What Gets Converted

| Cursor | Claude Code | Transform |
| :--- | :--- | :--- |
| `AGENTS.md` | `CLAUDE.md` | Copy (rename) |
| `subdir/AGENTS.md` | `subdir/CLAUDE.md` | Copy (rename) |
| `.cursor/rules/*.md` | `.claude/rules/*.md` | `globs` → `paths`, drop `alwaysApply`/`description` |
| `.cursor/commands/*.md` | `.claude/commands/*.md` | Copy as-is |
| `.cursor/skills/<n>/` | `.claude/skills/<n>/` | Copy entire directory |
| `.cursor/agents/*.md` | `.claude/agents/*.md` | `model: fast`→`haiku`, `readonly: true`→`disallowedTools` |
| `.cursor/hooks.json` | `.claude/settings.json` | Merge into `hooks` key; remap event names |
| `.cursor/hooks/` | `.claude/hooks/` | Copy scripts directory |
| `mcp.json` | `.mcp.json` | Copy (rename) |
| `.cursorignore` | — | Warns user; no direct equivalent |

## Usage

Find the skill installation path first — it depends on where this skill is installed:
- Cursor (project): `.cursor/skills/flow-convert-cursor-to-claude`
- Cursor (user): `~/.cursor/skills/flow-convert-cursor-to-claude`
- OpenCode (project): `.opencode/skills/flow-convert-cursor-to-claude`

```bash
SKILL_PATH=".cursor/skills/flow-convert-cursor-to-claude"  # adjust for your IDE

# Preview — show what would happen without writing files
deno run -A "$SKILL_PATH/scripts/convert.ts" [project_dir] --dry-run

# Convert
deno run -A "$SKILL_PATH/scripts/convert.ts" [project_dir]
```

`project_dir` defaults to the current working directory.

## Workflow

1. **Preview**: run with `--dry-run`, review the planned changes.
2. **Convert**: run without `--dry-run`.
3. **Review** generated files:
   - `.claude/rules/*.md` — verify `paths` globs match intent.
   - `.claude/agents/*.md` — check tool restrictions (`disallowedTools`).
   - `.claude/settings.json` — verify hook commands still resolve.
4. **Test**: open the project in Claude Code and confirm primitives load.

## Known Limitations

- **`.cursorignore`** — no Claude Code equivalent; script warns. Merge patterns into `.gitignore` manually.
- **`alwaysApply: false` + `description` only** — "Apply Intelligently" has no Claude Code equivalent; becomes unconditional (always-apply).
- **Manual rules** (triggered via `@rule-name`) — no Claude Code equivalent.
- **`model: fast`** → mapped to `model: haiku`; verify this is correct for the project.
- **Hook script paths** — `.cursor/hooks/` occurrences in commands are rewritten to `.claude/hooks/`; check for other hardcoded paths inside scripts.
- Existing `.claude/` files are **never overwritten** — script warns and skips conflicts.

## Hook Event Mapping

Full Cursor → Claude Code event name table: [references/hook-event-map.md](references/hook-event-map.md).
