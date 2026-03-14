# flow-cli: Universal Agent Format Support

## Goal

Adapt flow-cli to read agents from flat `framework/agents/` (universal format containing data for all IDEs) instead of per-IDE subdirectories (`framework/agents/{claude,cursor,opencode}/`). Add IDE-specific frontmatter extraction at sync time.

**Why:** The flow repo now stores one universal definition per agent. flow-cli extracts IDE-relevant fields from it during sync, rather than expecting pre-formatted per-IDE variants.

## Overview

### Context

The flow repo has been restructured (spec-flow-cli-integration.md):
- `framework/agents/` is now flat — 4 `.md` files with universal frontmatter (superset of all IDE fields)
- Per-IDE subdirectories (`claude/`, `cursor/`, `opencode/`) are deleted
- flow-cli (v0.1.4) still expects `framework/agents/{ide}/*.md` — this is now broken

flow-cli is a git submodule at `flow-cli/` in the flow repo. Changes here affect flow-cli's own repo.

### Current State

**flow-cli agent pipeline:**
1. `extractAgentNames(paths, ide.agentSubdir)` — regex matches `framework/agents/{ide}/name.md`
2. `readAgentFiles(names, ide, paths, source)` — reads from `framework/agents/{ide.agentSubdir}/{name}.md`
3. Writes agent content as-is to `{ide_configDir}/agents/{name}.md`

**Affected files:**
- `src/types.ts` — `IDE.agentSubdir` field, `KNOWN_IDES` definitions
- `src/source.ts` — `extractAgentNames()` function
- `src/sync.ts` — `readAgentFiles()` function, agent sync loop
- `src/config_generator.ts` — agent discovery via `extractAgentNames()`
- `src/source_test.ts` — test for `extractAgentNames()`
- `src/main_test.ts` — mock source with per-IDE agents

**IDE frontmatter transformation rules** (from `documents/ides-difference.md`):
- Claude Code: `name` (keep), `description` (keep), `tools` (list), `disallowedTools`
- Cursor: `name` (keep), `description` (keep), `readonly` (bool)
- OpenCode: remove `name`, add `mode: subagent`, `tools` (map: write/edit→bool)

However, not all agents need the same frontmatter additions. The transformation rules depend on the agent itself (e.g., `flow-diff-specialist` is read-only, `flow-skill-executor` is not).

### Constraints

- flow-cli is a separate repo (git submodule). Changes must be valid in isolation.
- `deno task check` must pass in flow-cli.
- TDD: tests first.
- No stubs.
- The transformation must produce output equivalent to the previous per-IDE variants.

## Definition of Done

- [x] Universal agent format in flow repo: superset frontmatter with all IDE fields (`name`, `description`, `tools`, `disallowedTools`, `readonly`, `mode`). Evidence: `framework/agents/*.md`
- [x] `extractAgentNames()` reads from flat `framework/agents/` (no IDE subdir). Evidence: `flow-cli/src/source.ts:146-160`
- [x] `readAgentFiles()` reads from flat path, applies IDE-specific frontmatter extraction. Evidence: `flow-cli/src/sync.ts:247-262`
- [x] `IDE.agentSubdir` field removed from types and KNOWN_IDES. Evidence: `flow-cli/src/types.ts:1-6,47-55`
- [x] New `transformAgent(content, ideName)` function: extracts IDE-relevant fields, unknown fields pass-through. Evidence: `flow-cli/src/transform.ts:31-60`
- [x] `config_generator.ts` agent discovery works with flat structure. Evidence: `flow-cli/src/config_generator.ts:59-61`
- [x] All tests updated and passing (`source_test.ts`, `main_test.ts`, new transform tests). Evidence: 141 passed, 0 failed
- [x] Tests cover YAML edge cases (multiline description, colons, quotes). Evidence: `flow-cli/src/transform_test.ts:125-134`
- [x] `main_test.ts` assertions verify IDE-specific frontmatter in output. Evidence: `flow-cli/src/main_test.ts:71-97`
- [x] Integration test (`GitCloneSource`) marked skip until flow repo pushed with new format. Evidence: `flow-cli/src/source_test.ts:86-104`
- [x] `deno task check` passes in flow-cli. Evidence: "All checks passed!"
- [x] flow-cli SRS updated (FR-1 acceptance criteria for agents). Evidence: `flow-cli/documents/requirements.md:30`
- [x] flow repo `documents/design.md` §3.2 updated to describe universal format. Evidence: `documents/design.md:93-97`
- [x] Universal agents in flow repo contain all IDE fields. Evidence: `framework/agents/*.md`

## Solution

**Selected Variant: C — Flat Read + Universal Frontmatter + IDE Extraction**

Two repos affected: flow (universal source) and flow-cli (extraction + delivery).

---

### Part 1: Universal Agent Format (flow repo)

Update `framework/agents/*.md` to contain **superset of all IDE fields**. Each agent file holds all data needed by every IDE. flow-cli extracts what each IDE needs.

**Universal frontmatter fields (superset):**
- `name` (required) — agent identifier (Claude, Cursor use; OpenCode ignores — uses filename)
- `description` (required) — agent purpose (all IDEs)
- `tools` (optional, string) — allowed tools as comma-separated list (Claude)
- `disallowedTools` (optional, string) — disallowed tools (Claude)
- `readonly` (optional, bool) — read-only mode (Cursor)
- `mode` (optional, string) — agent mode, e.g., `subagent` (OpenCode)
- `opencode_tools` (optional, map) — tool permissions map (OpenCode), e.g., `{write: false, edit: false}`

**Agent updates:**

1. `flow-diff-specialist.md`:
   ```yaml
   name: flow-diff-specialist
   description: ...
   tools: Read, Grep, Glob, Bash
   disallowedTools: Write, Edit
   readonly: true
   mode: subagent
   opencode_tools:
     write: false
     edit: false
   ```
2. `deep-research-worker.md` — same pattern, `tools: Read, Grep, Glob, Bash, WebFetch`
3. `flow-console-expert.md` — same pattern as flow-diff-specialist
4. `flow-skill-executor.md` — only `name`, `description`, `mode: subagent` (no restrictions)

**Update `documents/design.md` §3.2:** Change "Frontmatter contains only IDE-agnostic metadata (`name`, `description`)" → describe universal format with all IDE fields.

**Verification:** `deno task check` passes in flow repo.

---

### Part 2: flow-cli Changes

#### Step 1: Remove `agentSubdir` from types

**File: `src/types.ts`**
- Remove `agentSubdir` field from `IDE` interface
- Remove `agentSubdir` values from `KNOWN_IDES`

#### Step 2: Update `extractAgentNames()` to flat structure

**File: `src/source.ts`**
- Change signature: `extractAgentNames(paths: string[])` — remove `ideSubdir` parameter
- Change regex: `^framework/agents/([^/]+)\.md$` (flat, no IDE subdir)

#### Step 3: Create `transformAgent()` function

**New file: `src/transform.ts`**

```
transformAgent(content: string, ideName: string): string
```

Parses YAML frontmatter from universal agent, extracts IDE-relevant fields, returns transformed content with IDE-native frontmatter.

**Extraction rules (from universal → IDE-specific):**

| Universal field | Claude Code | Cursor | OpenCode |
|:---|:---|:---|:---|
| `name` | keep | keep | **drop** (filename = ID) |
| `description` | keep | keep | keep |
| `tools` (string) | keep | **drop** | **drop** |
| `disallowedTools` (string) | keep | **drop** | **drop** |
| `readonly` (bool) | **drop** | keep | **drop** |
| `mode` (string) | **drop** | **drop** | keep |
| `opencode_tools` (map) | **drop** | **drop** | rename to `tools` |
| unknown fields | **pass-through** | **pass-through** | **pass-through** |

Body (system prompt) passed through unchanged for all IDEs.

**YAML edge case handling:** Test multiline descriptions (with colons, quotes, special chars). Use `@std/yaml` (already a dependency via `src/config.ts`).

#### Step 4: Update `readAgentFiles()` in sync.ts

**File: `src/sync.ts`**
- Remove `ide` parameter from `readAgentFiles()` (no longer needed for path)
- Read from `framework/agents/{name}.md` (flat)
- After reading content, call `transformAgent(content, ide.name)` before returning

#### Step 5: Update agent sync loop in sync.ts

**File: `src/sync.ts` (lines 108-138)**
- Change `extractAgentNames(allPaths, ide.agentSubdir)` → `extractAgentNames(allPaths)`
- Move agent name extraction outside the IDE loop (names are the same for all IDEs now)
- Pass `ide.name` to `readAgentFiles()` for transformation

#### Step 6: Update config_generator.ts

**File: `src/config_generator.ts` (lines 61-70)**
- Simplify: single `extractAgentNames(allPaths)` call instead of per-IDE loop
- Remove `agentSubdir` usage

#### Step 7: Update tests (TDD)

**File: `src/source_test.ts`**
- Update `extractAgentNames` test: flat paths instead of per-IDE
  - Input: `["framework/agents/agent1.md", "framework/agents/agent2.md"]`
  - Expected: `["agent1", "agent2"]`

**File: `src/main_test.ts`**
- Update `createMockSource()`: flat agent paths with universal frontmatter
  - Single `"framework/agents/test-agent.md"` with all fields
- Update assertions: verify IDE-specific frontmatter in written content (not just file existence)
  - Claude output has `tools`, `disallowedTools`, no `readonly`, no `mode`
  - Cursor output has `readonly`, no `tools`, no `mode`

**File: `src/source_test.ts`**
- `GitCloneSource` integration test: mark as `ignore: true` until flow repo pushed with universal format
- Update after coordinated push

**New file: `src/transform_test.ts`**
- Test Claude extraction: universal → keeps `name`, `description`, `tools`, `disallowedTools`; drops `readonly`, `mode`, `opencode_tools`
- Test Cursor extraction: universal → keeps `name`, `description`, `readonly`; drops `tools`, `disallowedTools`, `mode`, `opencode_tools`
- Test OpenCode extraction: universal → keeps `description`, `mode`; renames `opencode_tools` → `tools`; drops `name`, `tools` (string), `disallowedTools`
- Test no-restriction agent (only `name` + `description` + `mode`) → minimal extraction per IDE
- Test body preservation: system prompt unchanged across all IDEs
- Test unknown fields: pass-through for all IDEs
- Test YAML edge cases: multiline description with colons and quotes

#### Step 8: Update documentation

**File: `documents/requirements.md`**
- FR-1 acceptance criterion: "Agents written to `{ide_dir}/agents/{name}.md` (single file, per-IDE variant)" → update to describe canonical source + transformation

**File: `documents/design.md`**
- Update agent architecture section to describe canonical format + transformation pipeline

---

### Execution Order

```
Part 1 (flow repo: extend canonical agents)
  ↓
Part 2, Step 7 (TDD: write tests first)
  ↓
Part 2, Steps 1-6 (implement: types → source → transform → sync → config_generator)
  ↓
Part 2, Step 8 (documentation)
  ↓
Verify: deno task check in both repos
```

### Estimated Scope

- **flow repo:** 4 files modified (3 universal agents + `documents/design.md` §3.2)
- **flow-cli:** 6 files modified, 2 new files (`transform.ts`, `transform_test.ts`), ~150 lines net new code
