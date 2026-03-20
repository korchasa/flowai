# flowai: cross-IDE command sync

## Goal

Sync user commands (`.cursor/commands/`, `.claude/commands/`, `.opencode/commands/`) across IDEs during `user_sync`, eliminating manual duplication.

## Overview

### Context

flowai `user_sync` (FR-10.8) propagates user skills and agents across IDEs. Commands are not synced — they're a separate resource type with own dirs per IDE.

All 3 supported IDEs use identical format for commands:
- Cursor: `.cursor/commands/*.md` — flat md, no frontmatter
- Claude Code: `.claude/commands/*.md` — flat md, optional frontmatter (`allowed-tools`, `model`, `description`)
- OpenCode: `.opencode/commands/*.md` — flat md, `$ARGUMENTS` + shell interpolation

Format is identical across IDEs → copy as-is (no transformation needed).

Related files:
- `cli/src/user_sync.ts` — user resource scanning, planning, syncing
- `cli/src/sync.ts` — orchestrator, calls `runUserSync`
- `cli/src/types.ts` — `FlowConfig`, `PlanItem`, `KNOWN_IDES`
- `documents/ides-difference.md` §2.3 — command format per IDE
- `documents/requirements.md` FR-10.9 — resource mapping table

### Current State

- `scanIdeResources` scans `skills/` and `agents/` dirs per IDE — no `commands/`
- `UserResource.type` is `"skill" | "agent"` — no `"command"`
- `FlowConfig` has no include/exclude for commands
- `PlanItemType` is `"skill" | "agent"` — no `"command"`
- Commands format is identical across IDEs → no transformation needed (unlike agents)

### Constraints

- Must NOT break existing `flowai` behavior (framework sync, user_sync for skills/agents)
- Commands are flat files (not dirs like skills) — scan pattern matches agents
- No frontmatter transformation needed (format identical across IDEs)
- Framework commands (`flow-*` prefix) should be skipped like other framework resources
- `user_sync: true` should be the only gate — no separate `commands_sync` flag
- Existing `FlowConfig.skills`/`FlowConfig.agents` include/exclude filters do NOT apply to commands (different resource type)

## Definition of Done

- [ ] `FlowConfig.commands` with `{ include: [], exclude: [] }` — consistent with skills/agents
- [ ] `.flowai.yaml` parsing/serialization for `commands:` section
- [ ] Include + exclude mutually exclusive validation (same as skills/agents)
- [ ] `scanIdeResources` scans `{ide.configDir}/commands/` dir for `.md` files
- [ ] `PlanItemType = "skill" | "agent" | "command"`
- [ ] `UserResource.type` supports `"command"`
- [ ] Commands with `flow-*` prefix and frameworkNames skipped
- [ ] Commands copied as-is between IDEs (no frontmatter transform)
- [ ] Missing command in target IDE → create
- [ ] Command exists in both, content differs → conflict (mtime-based canonical with `--yes`)
- [ ] Config generator prompts for command include/exclude
- [ ] Tests: config parsing, command scan, command create, command skip, command conflict
- [ ] `deno task check` passes
- [ ] `/Users/korchasa/www/4ra/` sync: cursor commands appear in `.claude/commands/`

## Solution (Variant B — commands with include/exclude)

### 1. Types (`cli/src/types.ts`)

```typescript
// Extend PlanItemType
export type PlanItemType = "skill" | "agent" | "command";

// Extend FlowConfig
export interface FlowConfig {
  // ... existing ...
  commands: {
    include: string[];
    exclude: string[];
  };
}
```

### 2. Config (`cli/src/config.ts`)

Parse `commands:` section from `.flowai.yaml` (same pattern as skills/agents):
```yaml
commands:
  include: []
  exclude: []
```

- `parseConfigData`: extract `commands.include`/`commands.exclude`, default `[]`
- Validate mutual exclusivity (include + exclude = error)
- `saveConfig`: serialize `commands` section

### 3. Scanning (`cli/src/user_sync.ts`)

Add commands block to `scanIdeResources` after agents block:

```typescript
// Commands (flat .md files, same pattern as agents)
const commandsDir = join(cwd, ide.configDir, "commands");
if (await fs.exists(commandsDir)) {
  for await (const entry of fs.readDir(commandsDir)) {
    if (!entry.isFile || !entry.name.endsWith(".md")) continue;
    const name = entry.name.replace(/\.md$/, "");
    if (isFramework(name)) continue;
    if (!passesFilter(name, config.commands)) continue;
    // ... read content, mtime, push resource with type: "command"
  }
}
```

### 4. Plan computation (`cli/src/user_sync.ts`)

`computeUserSyncPlan` already handles arbitrary resource types. Commands need:
- `subDir` = `"commands"` (alongside `"skills"` / `"agents"`)
- No `crossTransformAgent` call — content copied as-is

Add to `getContent()`:
```typescript
if (resource.type === "agent" && canonical.ideName !== ide.name) {
  return crossTransformAgent(...);
}
// commands and skills: return content as-is
return canonical.content;
```

Already works — agents are the only type with transform. No change needed in plan computation.

### 5. Config generator (`cli/src/config_generator.ts`)

Add command include/exclude prompt (same pattern as skills/agents). Default: all commands synced.

### 6. Files changed

- `cli/src/types.ts` — add `commands` to `FlowConfig`, `"command"` to `PlanItemType`
- `cli/src/config.ts` — parse/validate/serialize `commands` section
- `cli/src/config_test.ts` — test commands config parsing + validation
- `cli/src/user_sync.ts` — add commands scanning block
- `cli/src/user_sync_test.ts` — add command-specific tests
- `cli/src/config_generator.ts` — add commands prompt

### 7. TDD order

1. RED: config test — `parseConfigData` handles `commands` section
2. GREEN: implement in `config.ts` + `types.ts`
3. RED: user_sync test — `scanIdeResources` finds commands
4. GREEN: implement commands block in `user_sync.ts`
5. RED: user_sync test — commands synced cross-IDE (create, conflict, skip)
6. GREEN: verify `computeUserSyncPlan` handles commands (should work without changes)
7. REFACTOR: `deno task check`
8. Manual: run on `/Users/korchasa/www/4ra/`, verify cursor commands in `.claude/commands/`
