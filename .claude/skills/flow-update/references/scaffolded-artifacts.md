# Scaffolded Artifacts Registry

Maps source skills to project artifacts they generate. Used by `flow-update` to determine which project files may need migration when framework templates change.

## Mapping

### flow-init
- `.flowai.yaml` — flowai configuration (IDEs, skill/agent filters)
- `./AGENTS.md` — core agent rules, project metadata, planning rules, TDD flow
- `./documents/AGENTS.md` — documentation system rules (SRS/SDS/GODS formats)
- `./scripts/AGENTS.md` — development commands (standard interface, detected commands)
- `./CLAUDE.md` — symlink to `AGENTS.md` (Claude Code compatibility)
- `./documents/requirements.md` — SRS template
- `./documents/design.md` — SDS template
- `./documents/whiteboard.md` — temporary plans (GODS format)

### flow-setup-agent-code-style-ts-deno
- Code style section in `./AGENTS.md`

### flow-setup-agent-code-style-ts-strict
- Code style section in `./AGENTS.md`

### flow-skill-setup-ai-ide-devcontainer
- `.devcontainer/devcontainer.json`
- `.devcontainer/Dockerfile` (if security hardening enabled)
- `.devcontainer/init-firewall.sh` (if firewall enabled)

### flow-skill-configure-deno-commands
- `deno.json` tasks section
- `scripts/check.ts`
