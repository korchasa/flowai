---
name: flowai-setup-ai-ide-devcontainer
description: Set up .devcontainer for AI IDE development. Generates devcontainer.json and optional Dockerfile for project tech stack, AI CLI integration (Claude Code, OpenCode, flowai), skill mounting, and security hardening.
---

# AI Devcontainer Setup

Creates a `.devcontainer/` configuration for AI-agent-driven development.

**Architecture**: VS Code or Cursor **opens** the devcontainer (they support the devcontainer spec natively). AI tools work **inside** the container in two modes:
- **VS Code extensions** (e.g., `anthropic.claude-code`, `github.copilot`) — installed automatically via `customizations.vscode.extensions`, share the same container config and env vars
- **CLI/TUI tools** (e.g., `claude` CLI, `opencode` CLI) — run in the container terminal, use the same `~/.claude/` or `~/.config/opencode/` config

Both modes share config directories, env vars, and global skills. This skill configures all layers.

## Auth Policy (canonical — referenced throughout)

**All authentication is manual.** The skill MUST NOT generate:

- `remoteEnv` auth vars. Never forward `ANTHROPIC_API_KEY`, `GITHUB_TOKEN`, `CLAUDE_CONFIG_DIR` via `${localEnv:...}`. Unset `ANTHROPIC_API_KEY` → empty string → Claude CLI enters API-key mode and silently breaks OAuth. `CLAUDE_CONFIG_DIR` redirects `.credentials.json` off the volume. `GITHUB_TOKEN` has no consumer. Non-auth vars (`NODE_ENV`, `DENO_DIR`) are fine when actually needed.
- `secrets` block. Codespaces metadata for prompting credentials — nothing here consumes them.
- `initializeCommand`. The Keychain-extraction forwarder was removed (macOS-only, undocumented format, split-brain refresh).
- Automation of `gh auth login`, `claude login`, `opencode auth login`, or any credential copy into `.credentials.json`.

**`setup-container.sh`** does exactly ONE thing: recursive `chown -R` of writable volumes so the user's manual `*login` commands can write.

**Persistence**: Docker named volumes with **stable names** `source=${localWorkspaceFolderBasename}-<purpose>,target=<path>,type=volume`. Never `${devcontainerId}` — it rehashes on every edit and orphans the volume.

**Host config visibility** (optional, local dev only): **read-only** bind mount of host `~/.claude/` onto container `~/.claude-host/` (or `~/.config/opencode-host/` for OpenCode) — always a **separate** target path, never over the writable volume. Read-only is mandatory — a RW mount would also cause split-brain token refresh (host CLI and container CLI refreshing the same `refreshToken` independently; whichever refreshes second is invalidated). This is data visibility, **not** auth forwarding — on macOS the host dir has no `.credentials.json` anyway (tokens live in Keychain).

Every verification, reference table, and post-setup note below derives from this section. Do not restate — point here.

## Prerequisites

- Project root is identifiable (has `package.json`, `deno.json`, `go.mod`, `Cargo.toml`, `pyproject.toml`, or similar)
- User has confirmed they want a devcontainer

## Workflow

### Step 1: Detect Project Stack

Scan the project root for stack manifests and apply the priority below (top-down, stop at first match). `tsconfig.json` is NOT a primary indicator — it accompanies a primary manifest.

1. `deno.json` / `deno.jsonc` → **Deno** (ignore any `tsconfig.json`; commonly present for LSP interop only) — base `mcr.microsoft.com/devcontainers/base:ubuntu` + Deno feature
2. `go.mod` → **Go** — base `mcr.microsoft.com/devcontainers/go`
3. `Cargo.toml` → **Rust** — base `mcr.microsoft.com/devcontainers/rust`
4. `pyproject.toml` / `requirements.txt` / `setup.py` → **Python** — base `mcr.microsoft.com/devcontainers/python`
5. `package.json` → **Node/TS** — base `mcr.microsoft.com/devcontainers/typescript-node`
6. Only `tsconfig.json` with none of the above → **Generic + ask user**. Do NOT assume Node.
7. None of the above → **Generic** — base `mcr.microsoft.com/devcontainers/base:ubuntu`

If MULTIPLE top-level manifests match (e.g. `package.json` AND `go.mod`), ask the user which is primary. Secondary stacks become features.

### Step 2: Discover Relevant Features

Scan the project for indicators that map to devcontainer features beyond the base stack. Use the indicator→need mapping in [references/features-catalog.md](references/features-catalog.md), then search https://containers.dev/features for matching feature IDs.

1. **Scan** project root and common subdirs for indicator files/patterns (see catalog for full mapping)
2. **Map** indicators to needs (e.g., `pnpm-lock.yaml` → need pnpm, `*.tf` → need Terraform)
3. **Search** https://containers.dev/features for features matching each identified need. Use latest versions
4. **Filter** out features already covered by the primary stack's base image (e.g., skip Node feature if Node is primary)
5. **Classify** matches:
   - **auto**: high-confidence matches (secondary runtimes, build tools detected by lockfiles) — add without asking
   - **suggest**: optional/heavy features (databases, Docker-in-Docker, cloud CLIs) — present to user for confirmation
6. **Present** grouped list to user (see catalog for format). Show what was detected and why (which indicator file triggered each suggestion)
7. **User confirms** or customizes the list. Confirmed features are merged into the `features` block in step 5 (Generate Configuration)

Skip this step only if user explicitly provided a complete feature list in their request.

### Step 3: Detect Existing Configuration

Check if `.devcontainer/` exists:
- **If exists**:
  1. Read current `devcontainer.json` and display it to the user.
  2. Ask the user to clarify intent: **"update"** (evolve current config — preserve user customizations where possible) OR **"fix"** (something is broken — what is the exact symptom and error?). Do not assume — diagnose first.
  3. After generating the new version (Step 5), show a **diff** (old vs new) to the user.
  4. **MANDATORY**: Ask for explicit per-file confirmation before overwriting. If the user declines — **abort**, do not proceed to writing files.
- **If not exists**: proceed to generation.

### Step 4: Determine Capabilities

Ask the user (skip items already answered in prior context):

1. **AI CLI tools** (multi-select): "Which AI CLI tools to install in the container? (install only — authentication is always manual via `<cli> login` inside the container after first start)"
   - Claude Code — install via `postCreateCommand` script (`curl claude.ai/install.sh`) + writable named volume for `~/.claude`
   - OpenCode — install via registry feature (`ghcr.io/jsburckhardt/devcontainer-features/opencode:1`, preferred) or `curl opencode.ai/install` in `postCreateCommand` + writable named volume for `~/.config/opencode`
   - Cursor CLI, Gemini CLI — via registry features
   - flowai — via `deno install` in `postCreateCommand` (requires Deno runtime; auto-added as feature for non-Deno stacks)
   - Multiple — installs and configures all selected (each with its own writable named volume)
   - None — skip AI CLI setup
2. **Host AI config visibility**: "Mount host AI config directories into the container read-only, so the agent can read session history, projects, skills, and CLI history from the host? (local dev only; does NOT forward OAuth auth)"
   - Yes (default for local dev) — adds bind mounts for selected AI CLIs' config dirs to a separate `*-host` path
   - No — skip
3. **Security hardening**: "Add network firewall (default-deny + allowlist)? Recommended for autonomous agent mode. Trade-off: grants the container `NET_ADMIN`+`NET_RAW` Linux capabilities (needed to program iptables), which is a meaningful privilege increase — weigh this against the egress-control benefit."
   - Yes — generates `init-firewall.sh`, adds `NET_ADMIN`/`NET_RAW` capabilities
   - No (default) — skip
4. **Custom Dockerfile**: "Need additional system packages or non-standard setup?"
   - Yes — generates Dockerfile (required if firewall is enabled)
   - No (default) — use image + features only

### Step 5: Generate Configuration

#### 5.1 devcontainer.json

Generate using the template logic in [references/devcontainer-template.md](references/devcontainer-template.md).

Key structure (the rules in Auth Policy above apply — do not generate any `remoteEnv`/`secrets`/`initializeCommand`):
```jsonc
{
  "name": "<project-name>",
  "image": "<base-image>",  // OR "build": { "dockerfile": "Dockerfile" } — see 5.2
  "features": { /* stack features + common-utils + github-cli */ },
  "customizations": {
    "vscode": {
      "extensions": [ /* stack extensions + AI extensions */ ],
      "settings": { /* stack-specific settings */ }
    }
  },
  "mounts": [
    // Writable named volume for container's own state
    // Read-only bind mount of host ~/.claude → ~/.claude-host (separate path) — if host data visibility enabled
  ],
  // Object form runs entries in parallel. setup-container.sh is a self-healing
  // chown guard — no ordering dependency with other entries.
  "postCreateCommand": {
    "deps": "<dependency-install-command>",
    "setup": ".devcontainer/setup-container.sh",
    "claude-cli": "curl -fsSL https://claude.ai/install.sh | bash"
  },
  "postStartCommand": "git config --global --add safe.directory ${containerWorkspaceFolder}",
  "remoteUser": "<non-root-user>"
}
```

#### 5.2 Dockerfile (if custom)

Generate only when the user chose custom Dockerfile in Step 4, item 4. See [references/dockerfile-patterns.md](references/dockerfile-patterns.md).

#### 5.3 init-firewall.sh (if security hardening)

Generate only when the user chose firewall in Step 4, item 3. See [references/firewall-template.md](references/firewall-template.md).

### Step 6: Write Files

1. Create `.devcontainer/` directory if missing
2. Write `.devcontainer/devcontainer.json`
3. Write `.devcontainer/Dockerfile` (if custom)
4. Write `.devcontainer/init-firewall.sh` (if firewall), make executable
5. Write `.devcontainer/setup-container.sh` (only when at least one of `~/.claude`, `~/.config/opencode`, `/commandhistory` exists as a writable volume; skip entirely otherwise), make executable. The script's **sole** responsibility is a recursive self-healing chown of those volumes so the user's manual `claude login` / `gh auth login` / `opencode auth login` commands can write to them. It does NOT authenticate anything itself. See [references/devcontainer-template.md](references/devcontainer-template.md) § setup-container.sh

### Step 7: Verify

Structural:
- [ ] `.devcontainer/devcontainer.json` parses via a JSONC parser (comments and trailing commas are allowed)
- [ ] If Dockerfile exists: `FROM` line present
- [ ] If `init-firewall.sh` exists: has shebang and `set -euo pipefail`
- [ ] If `setup-container.sh` exists: has shebang, `set -euo pipefail`, is executable
- [ ] `remoteUser` matches the base image (e.g. `node` for Node images, `vscode` for mcr images, `deno` for denoland images)

Auth Policy compliance (see the Auth Policy section above for rationale):
- [ ] No `remoteEnv` block (or only non-auth vars like `NODE_ENV`)
- [ ] No `secrets` block
- [ ] No `initializeCommand`
- [ ] No hardcoded API keys or tokens in any generated file
- [ ] `setup-container.sh` body is strictly a chown loop — no `gh auth`, no `claude login`, no `cp` into `.credentials.json`
- [ ] Named volumes use `${localWorkspaceFolderBasename}-*`, not `${devcontainerId}-*`
- [ ] If host data visibility enabled: host `~/.claude` is mounted read-only at `~/.claude-host` (separate path), NOT at `~/.claude`

End-to-end (when devcontainer CLI is available):
- [ ] `devcontainer up --workspace-folder .` exits 0 with `outcome:success`
- [ ] If Claude Code selected: `devcontainer exec --workspace-folder . bash -lc 'claude --version && ls ~/.claude-host/ && touch ~/.claude/.perm-test && rm ~/.claude/.perm-test'` succeeds. Do NOT expect `claude auth status` to show authenticated — `claude login` is the user's manual step.

### Step 8: Post-Setup Notes

After generation, show the user the one-time manual auth steps (because of the Auth Policy above, the skill does nothing automatic):

**General**: tokens live in writable named volumes with stable names (`${localWorkspaceFolderBasename}-*`) and survive restarts, rebuilds, and `devcontainer.json` edits. Renaming the workspace folder changes the basename and therefore the volume — you will re-auth.

If **Claude Code** was selected:
> Open a terminal inside the container and run `claude login`. OAuth opens in a browser via IDE URL forwarding. Credentials are written to `~/.claude/.credentials.json` in volume `${localWorkspaceFolderBasename}-claude-config`.
>
> Host data is mounted read-only at `~/.claude-host/` (separate from the writable `~/.claude/`). The agent can read: `projects/<workspace-hash>/*.jsonl`, `history.jsonl`, `sessions/`, `skills/`, `commands/`.

If **OpenCode** was selected:
> Run `opencode auth login` (or the provider-specific variant) in the container terminal. State persists in volume `${localWorkspaceFolderBasename}-opencode-config`.

**Always** (the `github-cli` feature is always included):
> Run `gh auth login` once inside the container — choose GitHub.com → HTTPS → **"Login with a web browser"** (this is GitHub's OAuth web-browser flow; copy the one-time code it displays into the browser). This authenticates the `gh` CLI and registers it as the git credential helper for HTTPS remotes in one step.
>
> **SSH vs HTTPS**: `gh auth login` does not affect SSH remotes. If the repo was cloned as `git@github.com:...`, SSH operations depend on VS Code / Cursor's SSH agent forwarding. If forwarding is unavailable: either `git remote set-url origin https://github.com/<owner>/<repo>.git` and re-run `gh auth login`, or configure SSH keys in the container manually.

If **flowai** was selected:
> `flowai` is installed globally via Deno. Run `flowai sync` in the container terminal to sync skills/agents. `.flowai.yaml` is read from the project workspace root.

---

## Stack Reference

### Features by Stack

| Stack | Features to Add |
|---|---|
| Deno | `ghcr.io/devcontainers-extra/features/deno:latest` |
| Node/TS | (included in base image) |
| Python | (included in base image) |
| Go | (included in base image) |
| Rust | (included in base image) |
| Common (always) | `ghcr.io/devcontainers/features/common-utils:2`, `ghcr.io/devcontainers/features/github-cli:1` |
| Secondary Node | `ghcr.io/devcontainers/features/node:1` (when Node needed alongside non-Node primary) |
| Discovered | Additional features from [references/features-catalog.md](references/features-catalog.md) based on project scan (Step 2) |

### Extensions by Stack

| Stack | Extensions |
|---|---|
| Deno | `denoland.vscode-deno` |
| Node/TS | `dbaeumer.vscode-eslint`, `esbenp.prettier-vscode` |
| Python | `ms-python.python`, `ms-python.vscode-pylance` |
| Go | `golang.go` |
| Rust | `rust-lang.rust-analyzer` |
| Common (always) | `eamodio.gitlens`, `editorconfig.editorconfig` |

### AI CLI Extensions (VS Code/Cursor)

| Tool | Extension ID | Notes |
|---|---|---|
| Claude Code | `anthropic.claude-code` | IDE extension + CLI inside container |
| GitHub Copilot | `github.copilot`, `github.copilot-chat` | IDE extension only |

> OpenCode is a standalone TUI/CLI — no VS Code extension. It runs in the container terminal.

### postCreateCommand by Stack

| Stack | Command |
|---|---|
| Deno | `deno install` or `deno cache` (check deno.json for deps) |
| Node/TS | `npm install` or `yarn install` or `pnpm install` (match lockfile) |
| Python | `pip install -r requirements.txt` or `pip install -e .` (match project) |
| Go | `go mod download` |
| Rust | `cargo fetch` |

### remoteUser by Base Image

| Base Image Pattern | remoteUser |
|---|---|
| `mcr.microsoft.com/devcontainers/*` | `vscode` |
| `node:*` | `node` |
| `denoland/deno:*` | `deno` |
| `debian:*` / `ubuntu:*` | Create non-root user in Dockerfile |

---

## AI CLI Setup Reference

Per-tool specifics only. All auth/env/secrets rules come from the **Auth Policy** section above — they are NOT restated here.

Installation preference is **per-tool** — see each subsection below. Rule of thumb: use the official install script in `postCreateCommand` when the registry feature is known to ship outdated or broken binaries (Claude Code); use the registry feature when it is maintained and up-to-date (OpenCode, Cursor CLI, Gemini CLI). See [references/features-catalog.md](references/features-catalog.md) for the full matrix.

### Claude Code

- **Install (preferred)**: `curl -fsSL https://claude.ai/install.sh | bash` in `postCreateCommand`. Alternative: `npm install -g @anthropic-ai/claude-code@latest`.
- **Writable volume**: `source=${localWorkspaceFolderBasename}-claude-config,target=/home/<user>/.claude,type=volume`. Claude CLI writes `.credentials.json` here after `claude login`. `~/.claude.json` in home root is metadata/cache only and is auto-recreated.
- **Host bind mount (optional, read-only)**: `source=${localEnv:HOME}/.claude,target=/home/<user>/.claude-host,type=bind,readonly`. Exposes `projects/`, `sessions/`, `history.jsonl`, `skills/`, `commands/` to the agent.
- **Skills sync (optional, `postStartCommand`)**: `rm -rf ~/.claude/skills ~/.claude/commands && cp -rL ~/.claude-host/skills ~/.claude/skills 2>/dev/null || true && cp -rL ~/.claude-host/commands ~/.claude/commands 2>/dev/null || true`. Use `cp -rL` (dereference symlinks) since host skills may be symlinks with host-relative paths. This is NOT a required step — agents can also read directly from `~/.claude-host/`.
- **Extension**: `anthropic.claude-code`.

### OpenCode

- **Install (preferred)**: registry feature `ghcr.io/jsburckhardt/devcontainer-features/opencode:1`. Fallback: `curl -fsSL https://opencode.ai/install | bash` in `postCreateCommand`.
- **Writable volume**: `source=${localWorkspaceFolderBasename}-opencode-config,target=/home/<user>/.config/opencode,type=volume`.
- **Host bind mount (optional, read-only)**: `source=${localEnv:HOME}/.config/opencode,target=/home/<user>/.config/opencode-host,type=bind,readonly`.
- **Skills sync (optional, `postStartCommand`)**: `rm -rf ~/.config/opencode/skills && cp -rL ~/.config/opencode-host/skills ~/.config/opencode/skills 2>/dev/null || true`.
- **Extension**: none (standalone TUI/CLI).

### Cursor CLI

- **Install**: registry feature `ghcr.io/stu-bell/devcontainer-features/cursor-cli:0`.
- **Extension**: N/A (Cursor is the IDE host).

### flowai

- **Install**: `deno install -g -A -f jsr:@korchasa/flowai` in `postCreateCommand`. Requires Deno; for non-Deno stacks add `ghcr.io/devcontainers-extra/features/deno:latest` to features.
- **Persistence**: none needed — reads `.flowai.yaml` from the project workspace.
- **Extension**: none (CLI-only).

### Codespaces caveat (all AI CLIs)

Host bind mounts to `$HOME` do NOT work in GitHub Codespaces. For Codespaces, drop the bind mount entirely — the user runs `claude login` / `opencode auth login` inside the Codespace, and the agent has no host data visibility (there is no "host" in Codespaces).

---

## Lifecycle Hooks Reference

| Hook | When | Use For |
|---|---|---|
| `initializeCommand` | On host, before container creation | NOT used by this skill (Auth Policy forbids it) |
| `postCreateCommand` | Once after container creation | Dependency install, CLI installers, `setup-container.sh` (chown-only) |
| `postStartCommand` | Every container start | `git safe.directory`, optional host skills sync (`cp -rL ~/.claude-host/skills ~/.claude/skills`) |
| `postAttachCommand` | Every IDE attach | Shell customization |

All hooks accept string, array, or object (parallel execution) format:
```jsonc
// Object form for parallel execution
"postCreateCommand": {
  "deps": "npm install",
  "cli": "curl -fsSL https://claude.ai/install.sh | bash"
}
```
