# flow-update: Skill-Driven Framework Update

## Goal

Single entry point (`/flow-update`) for updating the AssistFlow framework in a project. The skill handles everything: CLI update, skill/agent sync, and migration of scaffolded project artifacts (AGENTS.md, devcontainer, deno.json, scripts/) using template diff as migration source.

## Overview

### Context

AssistFlow generates two types of outputs in projects:
- **Synced** (skills/, agents/) — updated automatically by `flowai sync`
- **Scaffolded** (AGENTS.md, .devcontainer/, deno.json tasks, scripts/check.ts, documents/) — created once by setup skills (flow-init, flow-setup-agent-*, flow-skill-configure-deno-commands), then owned by the project

When framework conventions change (TDD flow, planning rules, doc format, devcontainer best practices), scaffolded artifacts become stale. No mechanism exists to detect or resolve this.

### Current State

- `flowai sync` updates skills/agents only (binary content equality, conflict detection)
- `flowai` bare command = `flowai sync` (same behavior)
- `.flowai.lock` planned but not implemented (spec-skill-versioning.md)
- flow-init brownfield already supports re-running on existing projects with per-file diff confirmation
- IDE detection (verified empirically): `CLAUDECODE=1` (Claude Code), `CURSOR_AGENT=1` (Cursor Agent CLI), `OPENCODE=1` (OpenCode)

### Constraints

- `flowai` (bare) MUST NOT auto-update or auto-sync when run from IDE context. Only `flowai sync` explicitly.
- IDE detection via env vars (see ides-difference.md §3.9): `CURSOR_AGENT=1` first (may co-exist with CLAUDECODE), then `CLAUDECODE=1`. No fallback to directory presence.
- Migration logic lives in the skill (LLM-driven), not in the CLI (deterministic script).
- Must work across IDEs (Cursor, Claude Code, OpenCode).

## Definition of Done

- [x] `flowai` bare command: no-op when IDE detected (env var check), shows help instead. Evidence: `cli/src/cli.ts:189`, `cli/src/ide.ts:13-18`
- [x] `flowai sync` explicitly required to update skills/agents. Evidence: `cli/src/cli.ts:201-225`
- [x] `flow-update` skill created in `framework/skills/flow-update/`. Evidence: `framework/skills/flow-update/SKILL.md`
- [x] Skill step 1: runs `flowai sync` (updates skills/agents in IDE config dir). Evidence: `framework/skills/flow-update/SKILL.md` step 1
- [x] Skill step 2: reads `git diff` on synced skill/agent files to see framework changes. Evidence: `framework/skills/flow-update/SKILL.md` step 2
- [x] Skill step 3: reads project scaffolded artifacts (AGENTS.md, devcontainer, deno.json, scripts/). Evidence: `framework/skills/flow-update/SKILL.md` step 4
- [x] Skill step 4: identifies relevant changes from template diffs that affect project artifacts. Evidence: `framework/skills/flow-update/SKILL.md` step 3-4
- [x] Skill step 5: proposes per-file changes to project artifacts with explanation (why). Evidence: `framework/skills/flow-update/SKILL.md` step 5
- [x] Skill step 6: applies changes with user confirmation (per-file, like flow-init brownfield). Evidence: `framework/skills/flow-update/SKILL.md` step 6
- [x] Skill step 7: commits all changes together (sync + migrations). Evidence: `framework/skills/flow-update/SKILL.md` step 7
- [x] IDE detection section added to `documents/ides-difference.md` (section 3.9). Evidence: `documents/ides-difference.md:326-334` (pre-existing)
- [x] Benchmark scenarios for flow-update. Evidence: `benchmarks/flow-update/scenarios/basic/mod.ts`
- [x] `deno task check` passes

## Solution

### Part 1: CLI behavior change

Modify `flowai` bare command (no subcommand):
- Detect IDE context via env vars (see ides-difference.md §3.9)
- If inside IDE: print message "Run `flowai sync` explicitly or use `/flow-update` skill" and exit 0
- If outside IDE (terminal): keep current behavior (= `flowai sync`)

### Part 2: flow-update SKILL.md

```
framework/skills/flow-update/
├── SKILL.md
└── references/
    └── scaffolded-artifacts.md   # list of known artifacts and their source skills
```

**Skill workflow:**

1. **Sync**: Run `flowai sync` via shell. Capture output.
2. **Detect changes**: Run `git diff --name-only` on IDE config dirs (`.claude/skills/`, `.cursor/skills/`, etc.). If no changes — report "framework is up to date" and stop.
3. **Analyze template diffs**: For each changed skill/agent, run `git diff <file>`. Parse diffs to understand what conventions changed.
4. **Map to project artifacts**: Cross-reference changed templates with scaffolded artifacts:
   - flow-init templates changed → check `./AGENTS.md`, `./documents/AGENTS.md`, `./scripts/AGENTS.md`
   - flow-setup-agent-code-style-* changed → check code style section in `./AGENTS.md`
   - flow-skill-setup-ai-ide-devcontainer changed → check `.devcontainer/`
   - flow-skill-configure-deno-commands changed → check `deno.json` tasks, `scripts/check.ts`
5. **Propose changes**: For each affected artifact, show:
   - What changed in the framework template (summary)
   - What the current project artifact looks like
   - Proposed update (preserving project-specific content)
6. **Apply with confirmation**: Per-file diff, user approves/rejects each.
7. **Commit**: Stage synced files + migrated artifacts, commit with conventional message `chore(framework): update to vX.Y.Z`.

### Part 3: Scaffolded artifacts registry

`references/scaffolded-artifacts.md` maps source skills to project artifacts:

- `flow-init` → `AGENTS.md`, `documents/AGENTS.md`, `scripts/AGENTS.md`, `CLAUDE.md` symlinks
- `flow-setup-agent-code-style-ts-deno` → code style section in `AGENTS.md`
- `flow-setup-agent-code-style-ts-strict` → code style section in `AGENTS.md`
- `flow-skill-setup-ai-ide-devcontainer` → `.devcontainer/devcontainer.json`, `Dockerfile`, `init-firewall.sh`
- `flow-skill-configure-deno-commands` → `deno.json` tasks, `scripts/check.ts`
- `flow-init` → `documents/requirements.md` (SRS template), `documents/design.md` (SDS template), `documents/whiteboard.md`
