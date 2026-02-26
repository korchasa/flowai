# Multi-IDE Dev Resources (SPOT via .dev/)

## Goal

Eliminate Cursor lock-in for dev resources. Single Point of Truth in `.dev/`, symlinked to all supported IDEs (Cursor, Claude Code, OpenCode).

## Overview

### Context

Dev skills, agents, hooks currently live in `.cursor/` — only Cursor can use them. Claude Code and OpenCode directories exist but have no skills/agents. `catalog/` is the product (for end users), separate concern.

### Current State

- `.cursor/skills/` — 6 dev skills
- `.cursor/agents/` — 2 dev agents
- `.cursor/hooks.json`, `.cursor/hooks/logger.sh` — Cursor hook config
- `.cursor/worktrees.json` — Cursor worktree config
- `.claude/` — only `settings.local.json`
- `.opencode/` — only plugin dependency

### Constraints

- Symlinks must work on macOS/Linux (Windows out of scope)
- Claude Code destroys symlinks on write (confirmed bug) — dev skills are read-only, acceptable risk
- `catalog/` must remain separate (product vs dev resources)
- Post-clone `deno task link` required

## Definition of Done

- [x] `.dev/` contains all dev skills, agents, hooks, configs
- [x] `.cursor/`, `.claude/`, `.opencode/` use symlinks to `.dev/`
- [x] `deno task link` creates/verifies all symlinks (idempotent)
- [x] `deno task dev` calls link on startup
- [x] `check-skills.ts` validates `.dev/skills/`
- [x] `.gitignore` excludes symlinks, includes `.dev/`
- [x] Documentation updated (SRS, SDS, AGENTS.md)
- [x] `deno task check` passes

## Solution

### Linking Matrix

```
.dev/ source        .cursor/            .claude/            .opencode/
skills/             symlink             symlink             symlink
agents/             symlink             symlink             symlink
hooks/              symlink             skip (incompatible) skip (incompatible)
hooks.json          symlink             skip (Cursor-only)  skip (Cursor-only)
worktrees.json      symlink             skip (Cursor-only)  skip (Cursor-only)
```

### Steps

1. Create `.dev/`, move files from `.cursor/`
2. Create `scripts/task-link.ts` — idempotent symlink manager
3. Add `deno task link` to `deno.json`
4. Integrate into `deno task dev`
5. Update `check-skills.ts` -> `.dev/skills/`
6. Update `.gitignore`
7. Update docs (SRS, SDS, AGENTS.md)
8. Verify with `deno task check`
