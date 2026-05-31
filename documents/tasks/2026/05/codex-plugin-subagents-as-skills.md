---
date: 2026-05-31
status: done
tags:
  - skill
  - codex
  - plugin
related_tasks: []
---
# Codex Plugin Subagents As Skills

## Goal

Keep AI IDE plugin guidance accurate for Codex: plugin-packaged subagent behavior must be represented as skills because current Codex plugin docs do not define an agents/subagents component.

## Overview

### Context

`engineer-ai-ide-plugin` is a cross-IDE design skill. It already lists Codex plugin surfaces as skills, apps, MCP servers, hooks, assets, and marketplace metadata. Its workflow still treats agents as a generic plugin element, which can make a Claude Code + Codex design emit Codex `agents/` or `subagents/` packaging even though Codex custom agents live in `.codex/agents/*.toml`, outside the current plugin component list.

### Current State

- Skill path: `framework/engineering/skills/engineer-ai-ide-plugin/SKILL.md`.
- Existing acceptance scenarios cover generic packaging, official-doc lookup, and trigger behavior.
- No scenario checks Codex-specific handling of agents/subagents.

### Constraints

- Follow Acceptance Test TDD.
- Do not freeze a full Codex manifest schema in the skill.
- Keep the rule host-specific: Claude Code may still use plugin agents when current docs support them; Codex maps plugin-packaged agent behavior to skills.

## Definition of Done

- [x] FR-HOWTO: `engineer-ai-ide-plugin` tells agents to model Codex plugin subagent/agent behavior as skills, not as Codex plugin agents.
  - Test: `framework/engineering/skills/engineer-ai-ide-plugin/acceptance-tests/codex-subagents-as-skills/mod.ts`
  - Evidence: `NO_COLOR=1 deno task acceptance-tests -f engineer-ai-ide-plugin-codex-subagents-as-skills`

## Solution

1. RED: Add `engineer-ai-ide-plugin-codex-subagents-as-skills` acceptance scenario. Run it and confirm failure.
2. GREEN: Update `engineer-ai-ide-plugin/SKILL.md` workflow and Codex host anchor:
   - include apps in the contract element inventory;
   - state that Codex plugins currently do not package agents/subagents as plugin components;
   - instruct converting Codex plugin-packaged agent/subagent behavior into one or more skills;
   - keep Claude Code and other host-specific agent formats separate.
3. REFACTOR: Tighten wording if needed without adding schema copies.
4. CHECK: Re-run the targeted scenario. Hand off full primitive sweep: `NO_COLOR=1 deno task acceptance-tests -f engineer-ai-ide-plugin`.
