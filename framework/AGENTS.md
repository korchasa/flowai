# Framework (Product)

Source of truth for end-user skills and agents distributed via `scripts/install.ts`.

## Responsibility

- `skills/` — Product skills (`SKILL.md` directories). Categories: `flow-*` (commands), `flow-skill-*` (capabilities).
- `agents/` — Product agent definitions per IDE (`claude/`, `cursor/`, `opencode/`). Each agent has 3 IDE variants with shared body and IDE-specific frontmatter.

## Key Decisions

- Scripts in `skills/*/scripts/` must be standalone-runnable (use `jsr:` specifiers, no import maps).
- Skills follow [agentskills.io](https://agentskills.io/home) standard.
- Agent body (system prompt) is identical across IDE variants; only frontmatter differs.
