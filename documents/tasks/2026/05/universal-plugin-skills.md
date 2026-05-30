---
implements:
  - FR-UNIVERSAL
date: 2026-05-30
status: done
---
# AI IDE Plugin Skills

## Goal

Add engineering skills that let agents design and create plugins for selected AI IDEs.

## Overview

### Context

Live IDE trials in `flowai-experiments/documents/rnd/2026-05-29-universal-plugin-live-ide-trials.md` validated MCP and hook behavior across Claude Code and Codex. Current `framework/engineering/skills/` has no dedicated AI IDE plugin skill. `framework/devtools/skills/` covers individual primitives, but not plugin packaging, MCP wiring, or cross-host hook adapters as a unified engineering workflow.

### Current State

- `engineering` contains general engineering skills only.
- `devtools/engineer-hook` covers hooks for IDE configuration, but not plugin hook packaging and live Codex caveats.
- No skill explains plugin manifest/marketplace generation, plugin root discovery, official-doc verification, or cross-IDE MCP server design.

### Constraints

- New primitives live under `framework/engineering/skills/`.
- Each new skill needs acceptance coverage:
  - one behavior scenario;
  - `trigger-pos-1`, `trigger-adj-1`, `trigger-false-1`.
- Documentation must stay in sync with `README.md` and `documents/design.md`.

## Definition of Done

- [x] FR-UNIVERSAL: Agents can design and package an AI IDE plugin as a whole.
  - Test: `engineer-ai-ide-plugin-basic`
  - Evidence: `deno task acceptance-tests -f engineer-ai-ide-plugin-basic`
- [x] FR-UNIVERSAL: Agents can create AI IDE plugin MCP elements.
  - Test: `engineer-plugin-mcp-basic`
  - Evidence: `deno task acceptance-tests -f engineer-plugin-mcp-basic`
- [x] FR-UNIVERSAL: Agents can create AI IDE plugin hook adapters.
  - Test: `engineer-plugin-hooks-basic`
  - Evidence: `deno task acceptance-tests -f engineer-plugin-hooks-basic`
- [x] FR-UNIVERSAL: Skill trigger coverage exists for every new skill.
  - Test: `scripts/check-trigger-coverage.ts`
  - Evidence: `deno run -A scripts/check-trigger-coverage.ts`
- [x] FR-UNIVERSAL: Framework docs list the new engineering skills.
  - Test: `deno task check`
  - Evidence: `deno task check`

## Solution

1. Add RED acceptance scenarios for three new skills:
   - `engineer-ai-ide-plugin`
   - `engineer-plugin-mcp`
   - `engineer-plugin-hooks`
2. Run a new basic scenario before skill creation and confirm it fails because the skill is absent.
3. Add concise SKILL.md files with progressive disclosure. Keep exact host details in official-documentation links, not in the skill body.
4. Add trigger scenarios for each skill.
5. Update README engineering catalog and SDS primitive inventory count/list.
6. Run targeted scenarios and local checks. Defer full primitive sweeps if costly.
