# FR-20 Implementation Gaps: Complete Coverage

## Goal

Ensure FR-20 (AI Devcontainer Setup) has complete implementation with full benchmark coverage and SDS documentation. Currently SKILL.md covers all 11 sub-requirements, but design.md section is missing and benchmarks have coverage holes for FR-20.4, FR-20.9, FR-20.10, and multi-CLI scenarios.

## Overview

### Context

- FR-20 defines `flow-skill-setup-ai-ide-devcontainer` with 11 acceptance criteria (FR-20.1–FR-20.11)
- SKILL.md: fully implemented (7-step workflow, 4 reference docs, AI CLI reference for 4 tools)
- Benchmarks: 4 scenarios exist (`deno-with-claude`, `node-basic`, `brownfield-existing`, `feature-discovery`)
- SDS: `documents/design.md` has sections for FR-10–FR-13 but none for FR-20
- Key files:
  - `documents/requirements.md:737-790` — FR-20 spec
  - `framework/skills/flow-skill-setup-ai-ide-devcontainer/SKILL.md` — implementation
  - `benchmarks/flow-skill-setup-ai-ide-devcontainer/scenarios/` — 4 scenarios

### Current State

**SKILL.md** — Complete. All FR-20.1–FR-20.11 addressed in workflow steps and references.

**Benchmark coverage matrix (gap analysis):**
- FR-20.1 (consent) — covered in `node-basic`, `brownfield-existing`
- FR-20.2 (stack-aware) — covered in all 4 scenarios (Deno, Node, Python, Node)
- FR-20.3 (idempotency) — covered in `brownfield-existing`
- FR-20.4 (greenfield interview) — NOT tested (no benchmark calls flow-init delegation)
- FR-20.5 (verification) — covered in all 4
- FR-20.6 (AI CLI) — covered but ONLY Claude Code; no OpenCode/Cursor/Gemini scenario
- FR-20.7 (global skills) — covered in `deno-with-claude` only; no explicit sync command check
- FR-20.8 (security) — covered in `deno-with-claude`
- FR-20.9 (sync timing) — NOT checked (no checklist validates postStartCommand vs postCreateCommand)
- FR-20.10 (symlink deref) — NOT checked (no checklist validates cp -rL)
- FR-20.11 (feature discovery) — covered in `feature-discovery`

**design.md** — No FR-20 section exists. Breaks SDS convention.

### Constraints

- Benchmarks are agent-evaluated (semantic checks); cannot verify exact shell command strings with substring match
- flow-init delegation (FR-20.4) would require a flow-init benchmark, not a devcontainer skill benchmark
- Only `documents/whiteboard.md` may be modified by this planning session
- Must follow TDD: benchmarks first, then implementation fixes

## Definition of Done

- [ ] `documents/design.md` has FR-20 section (matching convention of FR-10–FR-13 sections)
- [ ] Benchmark scenario for multi-CLI setup (OpenCode + Claude Code) exists and passes
- [ ] Existing `deno-with-claude` scenario has checklist items for FR-20.9 (sync timing) and FR-20.10 (symlink deref)
- [ ] FR-20.4 coverage decision documented (either new flow-init benchmark or explicit skip with rationale)
- [ ] `deno task check` passes (fmt, lint, test)
- [ ] All existing benchmarks still pass

## Solution

Selected: **Variant A — Full Coverage**

### Step 1: Add FR-20 section to `documents/design.md`

Insert `### 3.9 AI Devcontainer Setup — FR-20` after section 3.8 (line ~202), following the convention of FR-10–FR-13 sections. Content:

- **Purpose:** Generate `.devcontainer/` config optimized for AI IDE development.
- **Architecture:** 7-step skill workflow (detect stack → discover features → detect existing → determine capabilities → generate → write → verify). 4 reference docs (devcontainer-template, features-catalog, dockerfile-patterns, firewall-template).
- **Stack detection:** Scans project root for indicator files (`deno.json`, `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`). Maps to MCR base images. Multi-stack → user picks primary, secondary added as features.
- **Feature discovery:** Indicator→need mapping in `references/features-catalog.md`. Categories: secondary runtimes (auto), build tools (auto), infra/cloud (suggest), databases (suggest), testing (suggest). Always includes `common-utils` + `github-cli`.
- **AI CLI support:** 4 CLIs via registry features (Claude Code, OpenCode, Cursor CLI, Gemini CLI). Config persistence via Docker volumes. Global skills via read-only bind mount to `*-host` path + `postStartCommand` sync with `cp -rL` (dereferences symlinks).
- **Security hardening:** Optional `init-firewall.sh` with default-deny iptables + stack-aware domain allowlist. Requires `NET_ADMIN`/`NET_RAW` capabilities + custom Dockerfile.
- **Idempotency:** Detects existing `.devcontainer/`, shows diff, asks per-file confirmation.
- **Integration:** Invoked standalone or delegated from `flow-init` step 11.
- **Deps:** None (pure SKILL.md, agent-driven generation).

### Step 2: Add FR-20.9 and FR-20.10 checklist items to `deno-with-claude` scenario

In `benchmarks/flow-skill-setup-ai-ide-devcontainer/scenarios/deno-with-claude/mod.ts`, add 2 new semantic checklist items:

```typescript
{
  id: "global_skills_sync_in_post_start",
  description:
    "Is the global skills sync command (cp -rL from ~/.claude-host) placed in postStartCommand (NOT postCreateCommand), so it runs on every container restart?",
  critical: true,
  type: "semantic" as const,
},
{
  id: "symlink_dereference",
  description:
    "Does the skills sync command use `cp -rL` (with -L flag to dereference symlinks) rather than plain `cp -r`?",
  critical: true,
  type: "semantic" as const,
},
```

These are semantic checks — the LLM evaluator can verify from the generated `devcontainer.json` content whether `postStartCommand` (not `postCreateCommand`) contains the sync, and whether `-rL` is used.

### Step 3: Create new scenario `opencode-multi-cli`

Create `benchmarks/flow-skill-setup-ai-ide-devcontainer/scenarios/opencode-multi-cli/`:

**fixture/**: Minimal Python project:
- `pyproject.toml` — basic Python project with FastAPI dependency
- `main.py` — hello-world FastAPI app

**mod.ts**: New scenario class `SetupDevcontainerOpenCodeMultiCli`:
- `id`: `"flow-skill-setup-ai-ide-devcontainer-opencode-multi-cli"`
- `skill`: `"flow-skill-setup-ai-ide-devcontainer"`
- `userQuery`: Set up devcontainer with both Claude Code and OpenCode. Mount global skills. No firewall.
- `userPersona`: Chooses both Claude Code + OpenCode, agrees to global skills, declines firewall/Dockerfile.
- Checklist items (10):
  1. `devcontainer_json_created` — valid JSON (critical)
  2. `python_base_image` — Python base image (critical)
  3. `claude_code_configured` — Claude Code feature or install present (critical, semantic)
  4. `opencode_configured` — OpenCode feature or install present (critical, semantic)
  5. `claude_global_skills_mount` — bind mount for `~/.claude/` → `~/.claude-host` (critical, semantic)
  6. `opencode_global_skills_mount` — bind mount for `~/.config/opencode/` → `~/.config/opencode-host` (critical, semantic)
  7. `anthropic_api_key_env` — `ANTHROPIC_API_KEY` via `${localEnv:}` (critical)
  8. `post_start_skills_sync` — `postStartCommand` syncs both Claude and OpenCode skills (critical, semantic)
  9. `no_hardcoded_secrets` — no hardcoded keys (critical)
  10. `python_deps_install` — `pip install` in postCreateCommand (non-critical)

### Step 4: Document FR-20.4 decision

FR-20.4 (greenfield interview integration) tests the **flow-init → devcontainer delegation** path. This belongs to a flow-init benchmark, not to devcontainer skill benchmarks. Add a comment in the `deno-with-claude/mod.ts` or a note in `whiteboard.md` documenting this decision. No new benchmark needed here.

### Step 5: Verification

1. `deno fmt` — format new files
2. `deno lint` — lint new files
3. `deno task check` — full project check (fmt + lint + test)
4. Verify all 5 benchmark scenarios are discoverable (4 existing + 1 new)
