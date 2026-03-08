# FR-14: Cross-IDE Hook/Plugin Format Transformation

## Goal

Provide comprehensive cross-IDE hook/plugin documentation in `flow-engineer-hook` SKILL.md so that AI agents can generate correct IDE-specific hook configurations from natural language requests. Update `flow-engineer-command` for Claude Code unification. No code transformation scripts — LLMs follow templates directly.

## Overview

### Current State

- `.dev/hooks/logger.sh` — single Bash script for shell command logging
- `.dev/hooks.json` — Cursor-native format, symlinked to `.cursor/hooks.json`
- `flow-engineer-hook/SKILL.md` — Cursor-centric (90+ lines), minimal Claude Code (3 lines), basic OpenCode
- `flow-engineer-command/SKILL.md` — comprehensive but lists out-of-scope IDEs (Antigravity, Codex)
- No transformation logic exists
- No canonical format abstraction exists

### Core Challenge

Three fundamentally different hook architectures:
- **Cursor**: JSON config + shell scripts (declarative, 2 hook types)
- **Claude Code**: JSON config in settings.json (nested structure, 4 hook types, 17+ events)
- **OpenCode**: TypeScript modules (programmatic, 30+ events, `tool()` helper)

Key mismatches:
- Event names differ (e.g., `beforeShellExecution` vs `PreToolUse` with `"Bash"` matcher)
- Some events are IDE-exclusive (Claude Code has `PermissionRequest`, `TeammateIdle`; Cursor has `afterAgentResponse`)
- Hook types vary: Claude Code supports `http` and `agent` types; OpenCode is fully programmatic
- Response formats differ (`{ "decision": "allow" }` vs `exit 0`)

### Scope

- FR-14: Canonical format + transformation to 3 IDEs (5 acceptance criteria)
- FR-15: Update `flow-engineer-hook` SKILL.md for cross-IDE docs (4 criteria, 1 done)
- FR-16: Update `flow-engineer-command` SKILL.md for Claude Code unification (3 criteria, 2 done)

## Definition of Done

### FR-14
- [ ] FR-14.1: Canonical IDE-agnostic hook format defined in `.dev/hooks/`
- [ ] FR-14.2: Transformation to Cursor hook format works
- [ ] FR-14.3: Transformation to Claude Code `settings.json` hooks section works
- [ ] FR-14.4: Transformation to OpenCode `.ts` plugin format works
- [ ] FR-14.5: `command`, `prompt`, and `agent` hook types supported where IDE allows

### FR-15
- [x] FR-15.3: Cursor hooks documentation retained
- [ ] FR-15.1: Claude Code hooks — all 17+ events, 4 hook types documented
- [ ] FR-15.2: OpenCode plugins — complete event reference, `tool()` helper, npm distribution
- [ ] FR-15.4: Cross-IDE guidance with IDE-specific examples and availability matrix

### FR-16
- [x] FR-16.2: IDE-specific paths and formats documented
- [x] FR-16.3: No breaking changes to existing workflow
- [ ] FR-16.1: Note that Claude Code commands = skills (unified namespace); remove out-of-scope IDEs

### Verification
- [ ] `deno task check` passes
- [ ] Benchmarks for `flow-engineer-hook` pass (if exist)
- [ ] Transformation tested on existing `logger.sh` hook

## Solution

**Selected variant**: A (Skill-only — documentation + templates, no code transformation). LLMs follow templates well; canonical format abstraction unnecessary.

**Cross-cutting rule**: Every step that produces a reference file MUST start with a web search for the latest official documentation. Hook/plugin APIs evolve rapidly — cached knowledge is unreliable.

### Step 1: Research & create Cursor hooks reference update

1. **Web search**: "Cursor IDE hooks API 2026", "cursor hooks.json format latest"
2. **Compare** findings with existing `references/hooks_api.md` (90 lines)
3. **Update** `hooks_api.md` if format changed; note any new events or deprecated ones

### Step 2: Research & create Claude Code hooks reference file

1. **Web search**: "Claude Code hooks settings.json 2026", "claude code hook events PreToolUse"
2. **Cross-check** with `documents/ides-difference.md` lines 63-147
3. **Create** `framework/skills/flow-engineer-hook/references/claude_code_hooks_api.md`:
   - All event types with descriptions
   - 4 hook types: `command`, `http`, `prompt`, `agent` — with examples for each
   - Configuration format in `settings.json` (nested `hooks` key)
   - Input env vars: `$HOOK_EVENT`, `$TOOL_NAME`, `$TOOL_INPUT`, `$SESSION_ID`, etc.
   - Output conventions: exit 0 = allow, exit 2 = deny (stderr = reason), JSON stdout
   - Response mapping: `updatedInput`, `permissionDecision`, `decision`

### Step 3: Research & create OpenCode plugins reference file

1. **Web search**: "OpenCode plugins API 2026", "opencode plugin tool() helper events"
2. **Cross-check** with current SKILL.md lines 87-134
3. **Create** `framework/skills/flow-engineer-hook/references/opencode_plugins_api.md`:
   - Plugin structure: JS/TS modules with `plugin()` helper
   - All event categories with verified signatures
   - npm distribution via `opencode.json` `plugin` field + `.opencode/package.json`
   - Complete example plugin (guard, formatter, auditor patterns)

### Step 4: Rewrite `flow-engineer-hook/SKILL.md` for cross-IDE support

1. **Web search**: verify IDE detection markers are still current for all 3 IDEs
2. Major changes:
   - **Cross-IDE event mapping table**: equivalent events across 3 IDEs
   - **Hook type availability matrix**: which types (command/prompt/http/agent) per IDE
   - **Expand Claude Code section** (lines 83-85 → full section): config, types, link to reference
   - **Expand OpenCode section** (lines 87-134 → restructured): link to reference for details
   - **Add cross-IDE examples**: same hook ("block dangerous commands") in all 3 formats
   - **Remove out-of-scope IDEs**: drop Antigravity, OpenAI Codex from tables (FR-17)
   - **Keep Cursor section** intact (FR-15.3), link to existing `hooks_api.md`
   - **Add directive**: "Read ONLY the reference file for the detected IDE"
   - **Tips section**: add Claude Code and OpenCode tips

### Step 5: Update `flow-engineer-command/SKILL.md` (FR-16)

1. **Web search**: "Claude Code commands vs skills 2026", "OpenCode commands format"
2. Minimal changes:
   - Description: remove Antigravity, OpenAI Codex
   - Table: remove Antigravity and OpenAI Codex rows
   - Detection: remove `.agent/` and `.codex/` checks
   - Add note: "Claude Code unifies commands and skills — `.claude/commands/` (legacy) and `.claude/skills/` (recommended, SKILL.md format)"

### Step 6: Update FR-14.1 in requirements.md

- Reword FR-14.1: "canonical format = documented templates in SKILL.md with IDE-specific reference files, not a separate schema"
- Add rationale: LLMs reliably follow template patterns; separate schema adds maintenance burden without benefit

### Step 7: Verification

- `deno task check` — no lint/format/test errors
- SKILL.md < 500 lines (progressive disclosure)
- Reference files linked from SKILL.md with "read only for detected IDE" directive
- Existing Cursor `hooks_api.md` preserved
- Write benchmark scenario for `flow-engineer-hook` (verifies FR-14.2–14.4)

### Acceptance Criteria Mapping

| Step | Closes |
|------|--------|
| Step 1 | FR-15.3 (Cursor hooks verified & current) |
| Step 2 | FR-15.1 (Claude Code hooks documented) |
| Step 3 | FR-15.2 (OpenCode plugins documented) |
| Step 4 | FR-14.1 (canonical = SKILL.md templates), FR-14.2–14.4 (IDE outputs via templates), FR-14.5 (hook types), FR-15.4 (cross-IDE guidance) |
| Step 5 | FR-16.1 (Claude Code unification note) |
| Step 6 | FR-14.1 formalization in SRS |
| Step 7 | Verification + benchmark for regression |
