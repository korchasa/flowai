# Framework (Product)

Source of truth for end-user skills and agents distributed via [flowai](https://github.com/korchasa/flow).

## Responsibility

- `skills/` — Product skills (`SKILL.md` directories). Categories: `flow-*` (commands), `flow-skill-*` (capabilities).
- `agents/` — Canonical agent definitions (flat `.md` files, IDE-agnostic). Each agent has `name` + `description` frontmatter and a shared system prompt body. IDE-specific transformation is handled by flowai at install time.

## Key Decisions

- Scripts in `skills/*/scripts/` must be standalone-runnable (use `jsr:` specifiers, no import maps).
- Skills follow [agentskills.io](https://agentskills.io/home) standard.
- Agent format is canonical (IDE-agnostic); flowai adds IDE-specific frontmatter during distribution.
