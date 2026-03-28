# Framework (Product)

Source of truth for end-user packs (skills, agents) distributed via [flowai](https://github.com/korchasa/flowai).

## Responsibility

- `<pack>/pack.yaml` — Pack manifest (name, version, description, scaffolds).
- `<pack>/skills/` — Product skills (`SKILL.md` directories). Categories: `flowai-*` (commands), `flowai-skill-*` (capabilities). Benchmark scenarios co-located in `<pack>/skills/<skill>/benchmarks/`.
- `<pack>/agents/` — Canonical agent definitions (flat `.md` files, IDE-agnostic). Each agent has `name` + `description` frontmatter and a shared system prompt body. IDE-specific transformation is handled by flowai at install time.

## Packs

- `core` — Base commands (commit, plan, review, init, etc.) + core agents.
- `devtools` — Skill/agent authoring tools.
- `engineering` — Procedural engineering knowledge (deep-research, fix-tests, etc.).
- `deno` — Deno-specific skills.
- `typescript` — TypeScript-specific setup skills.

## Key Decisions

- Scripts in `<pack>/skills/*/scripts/` must be standalone-runnable (use `jsr:` specifiers, no import maps).
- Skills follow [agentskills.io](https://agentskills.io/home) standard.
- Agent format is canonical (IDE-agnostic); flowai adds IDE-specific frontmatter during distribution.
- Scaffolded artifact mapping declared in `pack.yaml` `scaffolds:` field (skill-name → artifact paths).
