# devcontainer.json Template Logic

> Auth, `remoteEnv`, `secrets`, and `initializeCommand` rules come from SKILL.md § **Auth Policy**. This file only documents the positive structure of the generated config — it does not restate the prohibitions.

## Image-Based (default, no custom Dockerfile)

```jsonc
{
  "name": "{{project_name}}",
  "image": "{{base_image}}",

  "features": {
    // Always include. `configureZshAsDefaultShell` installs zsh AND makes it the
    // login shell for remoteUser — drop that option (and/or `installZsh`) if the
    // project relies on bash-specific shell integration (e.g. `bash -lc` init scripts).
    "ghcr.io/devcontainers/features/common-utils:2": {
      "installZsh": true,
      "configureZshAsDefaultShell": true
    },
    "ghcr.io/devcontainers/features/github-cli:1": {}
    // Stack-specific features added here (e.g., Deno feature)
    // Secondary stack features added here (e.g., Node feature for Deno+Node projects)
    // AI CLI features added here (e.g., opencode — from registry; Claude Code installed via postCreateCommand)
    // Discovered features from project scan (Step 2) added here
  },

  "customizations": {
    "vscode": {
      "extensions": [
        // Stack extensions (from SKILL.md table)
        // AI extensions (from SKILL.md table)
        // Always: "eamodio.gitlens", "editorconfig.editorconfig"
      ],
      "settings": {
        // Stack-specific settings (see below)
      }
    }
  },

  // NO `remoteEnv`, NO `secrets`, NO `initializeCommand`. See SKILL.md § Auth Policy.

  "mounts": [
    // Named volume for container's own writable state (Claude Code writes .credentials.json here after `claude login`)
    // Host IDE config bind mounts (read-only, separate *-host target, for host data visibility — sessions, history, skills)
    // Bash history volume
  ],

  // Object form — each key runs in parallel (Promise.allSettled).
  // Volume ownership: Docker named volumes are created root-owned. The
  // chown is handled by setup-container.sh as a self-healing guard, so
  // there is no ordering dependency between entries.
  "postCreateCommand": {
    "deps": "{{dependency_install_command}}",
    // Always include — sole responsibility: chown named volumes so the user's
    // later `claude login` / `gh auth login` / `opencode auth login` can write
    // into ~/.claude/, ~/.config/opencode/, /commandhistory:
    "setup": ".devcontainer/setup-container.sh",
    // Add CLI install entries below only for selected AI CLIs:
    // "claude-cli": "curl -fsSL https://claude.ai/install.sh | bash"
  },
  "postStartCommand": "git config --global --add safe.directory ${containerWorkspaceFolder}",
  "remoteUser": "{{remote_user}}"
}
```

## Dockerfile-Based (custom setup)

Replace `"image"` with:
```jsonc
{
  "build": {
    "dockerfile": "Dockerfile",
    "args": {}
  }
}
```

## With Firewall (security hardening)

Add:
```jsonc
{
  "runArgs": [
    "--cap-add=NET_ADMIN",
    "--cap-add=NET_RAW"
  ],
  "postStartCommand": {
    "git-safe": "git config --global --add safe.directory ${containerWorkspaceFolder}",
    "firewall": "sudo /usr/local/bin/init-firewall.sh"
  }
}
```

## Stack-Specific Settings

### Deno
```jsonc
"settings": {
  "deno.enable": true,
  "deno.lint": true,
  "editor.defaultFormatter": "denoland.vscode-deno",
  "editor.formatOnSave": true
}
```

### Node/TS (ESLint + Prettier)
```jsonc
"settings": {
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  }
}
```

### Python
```jsonc
"settings": {
  "python.defaultInterpreterPath": "/usr/local/bin/python",
  "editor.defaultFormatter": "ms-python.python",
  "editor.formatOnSave": true
}
```

### Go
```jsonc
"settings": {
  "go.toolsManagement.autoUpdate": true,
  "editor.defaultFormatter": "golang.go",
  "editor.formatOnSave": true
}
```

### Rust
```jsonc
"settings": {
  "rust-analyzer.check.command": "clippy",
  "editor.defaultFormatter": "rust-lang.rust-analyzer",
  "editor.formatOnSave": true
}
```

## Mounts Configuration

Two distinct purposes — do not conflate:

1. **Named volume (writable)** — container's own state. Claude Code writes `.credentials.json` here after the user runs `claude login` inside the container. Persists across restarts/rebuilds.
2. **Host bind mount (read-only)** — exposes host IDE config so the agent inside can read session history, projects, skills, CLI history, etc. Mounted to a **separate** path (`~/.claude-host`) to avoid overwriting the writable volume.

### Claude Code (when selected)
```jsonc
// Writable volume: container's own .claude/ state (auth tokens written here by `claude login`)
"source=${localWorkspaceFolderBasename}-claude-config,target=/home/{{remote_user}}/.claude,type=volume"
// Read-only bind mount of host ~/.claude/ for session/projects/history analysis by the agent
"source=${localEnv:HOME}/.claude,target=/home/{{remote_user}}/.claude-host,type=bind,readonly"
```

### OpenCode (when selected)
```jsonc
// Writable volume: container's own opencode state
"source=${localWorkspaceFolderBasename}-opencode-config,target=/home/{{remote_user}}/.config/opencode,type=volume"
// Read-only bind mount of host ~/.config/opencode/ for host data visibility
"source=${localEnv:HOME}/.config/opencode,target=/home/{{remote_user}}/.config/opencode-host,type=bind,readonly"
```

### Bash history persistence (always)
```jsonc
"source=${localWorkspaceFolderBasename}-bashhistory,target=/commandhistory,type=volume"
```

### Volume naming convention (MANDATORY)

Use **stable names** of the form `${localWorkspaceFolderBasename}-<purpose>` for all named Docker volumes. Do NOT use the `${devcontainerId}` suffix that older templates used.

- `${devcontainerId}` is recomputed from a hash of `devcontainer.json` every time the file changes meaningfully. Each edit orphans the previous volume and creates a new empty one, silently losing auth tokens, bash history, and any persisted state. Users usually discover this only when they are forced to re-authenticate after a trivial config change.
- `${localWorkspaceFolderBasename}` resolves on the host to the workspace folder's basename (e.g. `flowai` for `~/www/tools/flowai`). It is stable across config edits, unique per checkout/worktree, and produces readable names in `docker volume ls` (e.g. `flowai-claude-config`).
- Trade-off: two checkouts of the same repo at paths sharing a basename (rare) will share volumes. If per-checkout isolation is required, fall back to a hardcoded unique suffix — never `${devcontainerId}`.

### Lifecycle matrix (with stable volume names)

| Scenario | Volume survives? | Auth persists? | Action needed |
|---|---|---|---|
| Container restart | Yes | Yes | None |
| Container rebuild (same workspace) | Yes | Yes | None |
| `devcontainer.json` edited (any change) | Yes | Yes | None |
| Rebuild Without Cache (same workspace) | Yes | Yes | None |
| Workspace folder renamed (basename change) | **No** (different volume) | **No** | Re-auth: `claude login` inside new container |
| Volume manually deleted (`docker volume rm`) | No | No | Re-auth: `claude login` inside new container |

Row 3 ("any edit") is the main reason to prefer `${localWorkspaceFolderBasename}` over `${devcontainerId}` — the latter rehashes on every edit and converts restart/rebuild/edit into re-auth events.

### Host bind mount: purpose and caveats

The read-only mount of `${localEnv:HOME}/.claude` → `/home/{{remote_user}}/.claude-host` exists so the agent inside the container can read host IDE data (`projects/`, `sessions/`, `history.jsonl`, `skills/`, `commands/`) without interfering with container state. Rules come from SKILL.md § Auth Policy; the only additions specific to this mount:

- **Privacy**: the container has read access to the entire host `~/.claude` tree (settings, plugin data, session transcripts). Acceptable for local dev; review before using with untrusted code.
- **Codespaces**: `$HOME` bind mounts don't work — drop the mount or bake skills into the image.

### Volume ownership fix

Docker named volumes are created with root ownership before `remoteUser` takes effect. Any write into `~/.claude/`, `~/.config/opencode/`, or `/commandhistory` fails with `Permission denied` until ownership is fixed for the remoteUser — including the user's first `claude login`, `gh auth login`, or `opencode auth login` attempts.

**The chown MUST be recursive (`chown -R`).** A top-level chown leaves subdirs that the feature build stage may have created (e.g. `~/.claude/backups`, `~/.claude/downloads`) still root-owned, and subsequent writes into those subdirs fail.

**The chown MUST run inside `setup-container.sh`**, not as a separate `postCreateCommand` object entry. `postCreateCommand` object form runs entries in **parallel** (`Promise.allSettled`), so a separate chown entry races with any other entry that touches the config dirs. Put the chown as a self-healing `if [ ! -w ... ]` guard at the top of `setup-container.sh` and `postCreateCommand` stays a simple object without ordering assumptions.

**sudo dependency**: `setup-container.sh` uses `sudo chown -R` because the volumes are root-owned. Passwordless sudo is provided by the `ghcr.io/devcontainers/features/common-utils:2` feature (always included in the base template). If `common-utils` is removed, `sudo` will prompt for a password and `setup-container.sh` will fail on container creation. This is why `common-utils` is mandatory, not optional.

### setup-container.sh

Generate this script at `.devcontainer/setup-container.sh` (chmod +x). Its sole responsibility is to fix ownership of named Docker volumes so the user's manual `claude login`, `gh auth login`, `opencode auth login`, etc. can write to their config directories. It does NOT run any authentication — all auth is the user's responsibility and happens manually after first start.

```bash
#!/usr/bin/env bash
set -euo pipefail

# Fix named-volume ownership.
#
# Docker named volumes are created root-owned, so the remoteUser cannot
# write into the mount target until this runs. All authentication in this
# container is the user's responsibility — `claude login`, `gh auth login`,
# `opencode auth login`, etc. are run manually inside the container terminal.
# This script only ensures those commands have a writable config directory.
#
# Recursive chown is required: the devcontainer/feature build process may
# have created subdirs (e.g. ~/.claude/backups) as root before remoteUser
# takes effect. A top-level chown would leave those subdirs unwritable.
for dir in "$HOME/.claude" "$HOME/.config/opencode" /commandhistory; do
  if [ -d "$dir" ] && [ ! -w "$dir" ]; then
    sudo chown -R "$(id -un):$(id -gn)" "$dir"
  fi
done
```

Include only the directories that actually exist — drop `$HOME/.claude` from the loop if Claude Code is not selected, `$HOME/.config/opencode` if OpenCode is not selected, `/commandhistory` if bash history volume is not generated. If none of the three apply, skip generating the script entirely and omit the `setup` entry from `postCreateCommand`.

**postCreateCommand** example (with Claude Code + OpenCode + flowai):
```jsonc
// Object form runs entries in parallel. Volume chown lives inside
// setup-container.sh, so there is no ordering dependency between entries.
// CLI installers (claude.ai/install.sh, opencode.ai/install) only write
// to ~/.local/bin/ — they do not race with `setup` on the config volumes.
"postCreateCommand": {
  "deps": "{{dependency_install_command}}",
  "setup": ".devcontainer/setup-container.sh",
  "claude-cli": "curl -fsSL https://claude.ai/install.sh | bash",
  "opencode-cli": "curl -fsSL https://opencode.ai/install | bash",
  "flowai-cli": "deno install -g -A -f jsr:@korchasa/flowai"
}
```

> All prohibitions (`initializeCommand`, auth `remoteEnv`, `secrets`) are defined once in SKILL.md § Auth Policy. If a project genuinely needs a non-auth env var (e.g. `NODE_ENV=development`), add a minimal `remoteEnv` block containing only that.

**NOTE**: flowai needs no mounts or volumes — it reads `.flowai.yaml` from the project workspace. For non-Deno stacks, add `ghcr.io/devcontainers-extra/features/deno:latest` to the features block.

### Manual auth workflow

See SKILL.md § **Step 8: Post-Setup Notes** for the user-facing instructions shown after generation (one-time `claude login` / `gh auth login` / `opencode auth login`, plus the SSH-vs-HTTPS remote URL caveat).
