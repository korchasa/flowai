# Related Skills for Plugin Marketplace Work

Use this reference when a plugin-marketplace task needs adjacent expertise.
Prefer these existing skills instead of duplicating their procedures.

## Primary Routing

- [engineer-ai-ide-plugin](../../engineer-ai-ide-plugin/SKILL.md) — single plugin
  design or packaging: manifests, skills, apps, MCP servers, hooks, assets, and
  per-IDE validation.
- [engineer-plugin-mcp](../../engineer-plugin-mcp/SKILL.md) — MCP server/tool
  schemas, stdio server design, host wiring, probes, and stable tool naming.
- [engineer-plugin-hooks](../../engineer-plugin-hooks/SKILL.md) — hook event
  adapters, blocking policy, audit hooks, and host-specific hook formats.
- [engineer-skill](../../../../devtools/skills/engineer-skill/SKILL.md) —
  SKILL.md package authoring, frontmatter, progressive disclosure, bundled
  scripts/references/assets, and cross-IDE placement.
- [engineer-command](../../../../devtools/skills/engineer-command/SKILL.md) —
  user-invoked workflow commands that should not be auto-discovered by the
  model.
- [engineer-subagent](../../../../devtools/skills/engineer-subagent/SKILL.md) —
  reusable agent/subagent definitions outside Codex plugin packaging.
- [engineer-hook](../../../../devtools/skills/engineer-hook/SKILL.md) — generic
  AI IDE hook creation beyond plugin packaging.

## Supporting Skills

- [write-agent-benchmarks](../../../../devtools/skills/write-agent-benchmarks/SKILL.md)
  — acceptance scenarios for skill, command, agent, and plugin behavior.
- [browser-automation](../../browser-automation/SKILL.md) — browser-based install
  or marketplace UI verification.
- [fix-tests](../../fix-tests/SKILL.md) — diagnosing and fixing failing validation
  or smoke tests.
- [deep-research](../../deep-research/SKILL.md) — broad host-doc or ecosystem
  research when official docs are incomplete.
- [draw-mermaid-diagrams](../../draw-mermaid-diagrams/SKILL.md) — marketplace
  build, sync, install, and trust-flow diagrams.
- [write-gods-tasks](../../write-gods-tasks/SKILL.md) — task breakdowns with
  goal, context, constraints, definition of done, and evidence.

## Local Repository Examples

- flowai: `scripts/build-plugins.ts`, `scripts/validate-plugins.ts`,
  `scripts/sync-plugins-local.ts`, and SDS section
  `Claude Code + Codex Plugin Marketplace`.
- flowai-workflow: `plugin-src/`, `scripts/build-plugin-payload.ts`,
  `scripts/plugin-payload-smoke.ts`, and `scripts/plugin-install-acceptance.ts`.
- FoxCode: `.claude-plugin/marketplace.json`, `foxcode/.claude-plugin/`,
  `foxcode/.mcp.json`, `opencode/`, and distribution sections in SDS.
