# Dev Resources

IDE-agnostic Single Point of Truth (SPOT) for development-time AI resources. NOT distributed to end users.

## Responsibility

- `skills/` — Dev-only skills (benchmark helpers, IDE guides, code generation).
- `agents/` — Dev-only agent definitions (`benchmark-runner.md`, `flow-diff-specialist.md`).
- `hooks/` — Hook scripts (e.g., `logger.sh`). Cursor-only via symlink.
- `hooks.json`, `worktrees.json` — Cursor-specific config files.

## Key Decisions

- Symlinked to `.cursor/`, `.claude/`, `.opencode/` via `deno task link`.
- Dev skills override framework skills on name collision (`.dev/skills/` takes priority).
- Hooks/worktrees config is Cursor-only (Claude Code and OpenCode don't support these features).
