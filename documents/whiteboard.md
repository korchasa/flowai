# flow-init: Multi-File Architecture + Diff-Based Updates + Declarative Manifest

## Goal

Eliminate user content loss during `flow-init` re-runs. Split monolithic AGENTS.md into 3 domain-scoped files. Implement declarative manifest for file structure + diff-based per-file update with user confirmation. Rewrite Python scripts to Deno/TS.

## Overview

### Context

- FR-12 (idempotency with user edit preservation) — fully unimplemented
- FR-13 (Python-to-Deno migration) — partially addressed here
- Current `generate_agents.py` has binary overwrite: skip entirely OR full overwrite
- Only preservation mechanism: `PROJECT_RULES` between `---` markers
- Users lose: custom YOU MUST rules, custom sections (e.g. Terminology), edits to Planning Rules, custom doc structures
- @framework/skills/flow-init/SKILL.md — current skill
- @framework/skills/flow-init/scripts/generate_agents.py — current generator
- @framework/skills/flow-init/assets/AGENTS.template.md — current template
- @documents/requirements.md#FR-12 — requirements
- @documents/design.md#3.7 — current (outdated) design

### Current State

Single template (`AGENTS.template.md`, 213 lines) → single `AGENTS.md`. `generate_agents.py` (Python) does `str.replace()` for 8 placeholders. `--no-overwrite-agents` flag skips write entirely. No merge, no diff, no section awareness.

### Constraints

- `---` markers in root AGENTS.md preserved (backward compat for PROJECT_RULES)
- Cross-IDE: Cursor, Codex, Claude Code support subdir AGENTS.md natively. OpenCode needs `opencode.json` glob workaround. Antigravity — no evidence of support.
- Python scripts rewritten to Deno/TS (FR-13)
- Benchmarks must cover all scenarios (TDD)
- No `<!-- AF:BEGIN/END -->` markers (dropped from design)

## Definition of Done

- [ ] Declarative manifest (`manifest.json`) defines all 3 target files, templates, vars, preservation rules
- [ ] `generate_agents.ts` (Deno/TS) reads manifest, renders templates, computes diffs
- [ ] 3 separate templates: root, documents/, scripts/
- [ ] SKILL.md updated: manifest-driven workflow, per-file diff confirmation, OpenCode compat check
- [ ] `brownfield-idempotent` benchmark: all 3 files preserved after re-run
- [ ] New `brownfield-update` benchmark: template change → diff shown, user content preserved
- [ ] `greenfield` + `brownfield` benchmarks updated for 3-file output
- [ ] This project's own AGENTS.md split into 3 files
- [ ] SRS/SDS updated (FR-12 criteria, SDS 3.7 rewrite)
- [ ] `deno task check` passes
- [ ] `analyze_project.py` rewritten to `analyze_project.ts`

## Solution

### Architecture: 3 AGENTS.md files

```
./AGENTS.md              — core agent rules + project metadata
./documents/AGENTS.md    — documentation system rules
./scripts/AGENTS.md      — development commands & scripts conventions
```

Content distribution:

- **`./AGENTS.md`**: # YOU MUST, `---` + PROJECT_RULES, Project Info, Vision, Stack, Architecture, Key Decisions, Planning Rules, CODE DOCS, TDD FLOW
- **`./documents/AGENTS.md`**: DOCS STRUCTURE & RULES (hierarchy, rules, SRS/SDS/GODS formats, compressed style rules, whiteboard rules)
- **`./scripts/AGENTS.md`**: Development Commands (standard interface description, detected commands, command scripts)

### Declarative Manifest (`manifest.json`)

```json
{
  "version": 1,
  "files": [
    {
      "path": "AGENTS.md",
      "template": "assets/AGENTS.template.md",
      "vars": ["PROJECT_NAME", "PROJECT_VISION", "TOOLING_STACK", "ARCHITECTURE", "KEY_DECISIONS", "PROJECT_RULES"],
      "preserve": {
        "type": "markers",
        "start": "---",
        "end": "## ",
        "inject_as": "PROJECT_RULES"
      },
      "update": "diff-confirm"
    },
    {
      "path": "documents/AGENTS.md",
      "template": "assets/AGENTS.documents.template.md",
      "vars": [],
      "preserve": null,
      "update": "diff-confirm"
    },
    {
      "path": "scripts/AGENTS.md",
      "template": "assets/AGENTS.scripts.template.md",
      "vars": ["DEVELOPMENT_COMMANDS", "COMMAND_SCRIPTS"],
      "preserve": null,
      "update": "diff-confirm"
    }
  ],
  "generated_by_llm": [
    {"path": "documents/requirements.md", "skip_if_lines_gt": 50, "description": "SRS from interview/analysis data"},
    {"path": "documents/design.md", "skip_if_lines_gt": 50, "description": "SDS initial structure"},
    {"path": "documents/whiteboard.md", "skip_if_lines_gt": 10, "description": "Whiteboard with discovered context (brownfield) or empty (greenfield)"}
  ],
  "ide_compat": {
    "opencode": {
      "check": "opencode.json",
      "warn_if_missing_globs": ["documents/AGENTS.md", "scripts/AGENTS.md"],
      "explain_before_read": "I need to check your OpenCode config to ensure subdirectory AGENTS.md files are discoverable by the IDE."
    }
  }
}
```

### Diff-Based Update Flow

For each file in `manifest.files`:
1. Script renders template → proposed content (deterministic)
2. If target doesn't exist → write directly, report "created"
3. If target exists:
   a. Extract preserved content (if `preserve` defined)
   b. Inject preserved content into proposed version
   c. Compute unified diff (proposed vs current)
   d. If no diff → report "up to date", skip
   e. If diff exists → print diff, agent asks user
4. Agent shows diff to user, asks "Apply changes to <path>? [y/n]"
5. If yes → run script with `apply` command for that path
6. If no → skip that file

### Script: `generate_agents.ts` (Deno)

Replaces both `generate_agents.py` and `analyze_project.py`.

CLI:
```
deno run generate_agents.ts <command> [options]

Commands:
  analyze <dir>                  Analyze project, output JSON to stdout
  render <manifest> <data>       Render all templates, show diffs (JSON output)
  apply <manifest> <data> <path> Apply rendered template to specific file
```

### Templates

**`AGENTS.template.md`** (trimmed root):
- # YOU MUST, `---`/PROJECT_RULES, Project Info, Vision, Stack, Architecture, Key Decisions, Planning Rules, CODE DOCS, TDD FLOW

**`AGENTS.documents.template.md`** (new):
- DOCS STRUCTURE & RULES, Hierarchy, Rules, SRS Format, SDS Format, GODS Format, Compressed Style

**`AGENTS.scripts.template.md`** (new):
- Development Commands, Standard Interface, Detected Commands, Command Scripts

### SKILL.md Workflow Changes

Steps 5-6 replaced with manifest-driven flow:
- Step 5: Read manifest, inventory existing files, report to user
- Step 6: `deno run generate_agents.ts render`, show diffs per file, confirm per file, apply confirmed
- Step 6a: OpenCode compat check (explain purpose → read config → warn if globs missing)

### Implementation Order (TDD)

1. **RED**: Update/write benchmarks
2. **GREEN**: Create templates, manifest, scripts, update SKILL.md
3. **REFACTOR**: Split this project's AGENTS.md, update SRS/SDS, run checks
