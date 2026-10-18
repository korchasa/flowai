# Related Skills for Plugin Marketplace Work

Use this reference when a plugin-marketplace task needs adjacent expertise.
Prefer these skills instead of duplicating their procedures.

## Primary Routing

- [engineer-ai-ide-plugin](../../engineer-ai-ide-plugin/SKILL.md) — single plugin
  design or packaging: manifests, skills, apps, MCP servers, hooks, assets, and
  per-IDE validation.
- [engineer-plugin-mcp](../../engineer-plugin-mcp/SKILL.md) — MCP server/tool
  schemas, stdio server design, host wiring, probes, and stable tool naming.
- [engineer-plugin-hooks](../../engineer-plugin-hooks/SKILL.md) — hook event
  adapters, blocking policy, audit hooks, and host-specific hook formats.

## Authoring Skills from the `devtools` Pack

These skills ship in the flowai `devtools` pack (the `flowai-devtools` plugin),
not in this one, so a project that installed only this pack does not have them.
List them by name with their link whenever the task calls for them, whether or
not they are installed locally. When one is missing locally, say which pack
provides it; do not drop it from the list. The links point at the published
marketplace, so they open without a local install.

- [engineer-skill](https://github.com/korchasa/flowai-plugins/blob/main/plugins/flowai-devtools/skills/engineer-skill/SKILL.md) —
  SKILL.md package authoring, frontmatter, progressive disclosure, bundled
  scripts/references/assets, and cross-IDE placement.
- [engineer-command](https://github.com/korchasa/flowai-plugins/blob/main/plugins/flowai-devtools/skills/engineer-command/SKILL.md) —
  user-invoked workflow commands that should not be auto-discovered by the
  model.
- [engineer-subagent](https://github.com/korchasa/flowai-plugins/blob/main/plugins/flowai-devtools/skills/engineer-subagent/SKILL.md) —
  reusable agent/subagent definitions outside Codex plugin packaging.
- [engineer-hook](https://github.com/korchasa/flowai-plugins/blob/main/plugins/flowai-devtools/skills/engineer-hook/SKILL.md) — generic
  AI IDE hook creation beyond plugin packaging.
- [write-agent-benchmarks](https://github.com/korchasa/flowai-plugins/blob/main/plugins/flowai-devtools/skills/write-agent-benchmarks/SKILL.md)
  — acceptance scenarios for skill, command, agent, and plugin behavior.

## Supporting Skills

- [browser-automation](../../browser-automation/SKILL.md) — browser-based install
  or marketplace UI verification.
- [deep-research](../../deep-research/SKILL.md) — broad host-doc or ecosystem
  research when official docs are incomplete.
- [draw-mermaid-diagrams](../../draw-mermaid-diagrams/SKILL.md) — marketplace
  build, sync, install, and trust-flow diagrams.
- `write-gods-tasks` (core pack) — the accepted task format: goal, context,
  constraints, definition of done, and evidence.

## Local Repository Examples

- flowai: `scripts/build-plugins.ts`, `scripts/validate-plugins.ts`,
  `scripts/sync-plugins-local.ts`, and SDS section
  `Claude Code + Codex Plugin Marketplace`.
- flowai-workflow: `plugin-src/`, `scripts/build-plugin-payload.ts`,
  `scripts/plugin-payload-smoke.ts`, and `scripts/plugin-install-acceptance.ts`.
- FoxCode: `.claude-plugin/marketplace.json`, `foxcode/.claude-plugin/`,
  `foxcode/.mcp.json`, `opencode/`, and distribution sections in SDS.
