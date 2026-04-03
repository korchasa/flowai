# devcontainer.json Template Logic

## Image-Based (default, no custom Dockerfile)

```jsonc
{
  "name": "{{project_name}}",
  "image": "{{base_image}}",

  "features": {
    // Always include
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

  "remoteEnv": {
    // IMPORTANT: Do NOT include ANTHROPIC_API_KEY here by default.
    // An empty string (unset on host) triggers API-key auth mode and breaks OAuth.
    // Only add ANTHROPIC_API_KEY if the user explicitly provides an API key.
    "GITHUB_TOKEN": "${localEnv:GITHUB_TOKEN}"
  },

  "secrets": {
    // Add ANTHROPIC_API_KEY here ONLY if the user chose API-key auth (not OAuth)
    "GITHUB_TOKEN": {
      "description": "GitHub PAT for gh CLI"
    }
  },

  "mounts": [
    // Config persistence volume
    // Auth forwarding staging mount (if Claude Code selected)
    // Global skills bind mount (if enabled)
  ],

  // Runs on HOST before container creation (macOS only — extracts Keychain tokens)
  "initializeCommand": "security find-generic-password -s 'Claude Code-credentials' -w > ~/.claude-auth-staging.json 2>/dev/null || echo '{}' > ~/.claude-auth-staging.json",

  // Object form — each key runs in parallel. Order within a key is sequential.
  // Volume ownership: Docker named volumes are created as root. Must chown BEFORE CLI install/auth writes.
  "postCreateCommand": {
    "deps": "{{dependency_install_command}}",
    // Add per-CLI entries below only for selected AI CLIs:
    // "claude-chown": "sudo chown -R {{remote_user}}:{{remote_user}} ~/.claude",
    // "claude-cli": "curl -fsSL https://claude.ai/install.sh | bash",
    // "claude-auth": ".devcontainer/setup-container.sh"  // see setup-container.sh generation below
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

Add only mounts for selected AI CLIs.

### Claude Code (when selected)
```jsonc
// Config persistence volume (auth tokens in .credentials.json survive here)
"source=claude-config-${devcontainerId},target=/home/{{remote_user}}/.claude,type=volume"
// Auth forwarding: host Keychain tokens staged here (macOS only, read-only)
"source=${localEnv:HOME}/.claude-auth-staging.json,target=/home/{{remote_user}}/.claude-auth-staging.json,type=bind,readonly"
// Global skills from host (if enabled, local dev only)
"source=${localEnv:HOME}/.claude,target=/home/{{remote_user}}/.claude-host,type=bind,readonly"
```

### OpenCode (when selected)
```jsonc
// Config persistence volume
"source=opencode-config-${devcontainerId},target=/home/{{remote_user}}/.config/opencode,type=volume"
// Global skills from host (if enabled, local dev only)
"source=${localEnv:HOME}/.config/opencode,target=/home/{{remote_user}}/.config/opencode-host,type=bind,readonly"
```

### Bash history persistence (always)
```jsonc
"source=bashhistory-${devcontainerId},target=/commandhistory,type=volume"
```

### Volume ownership fix

Docker named volumes are created with root ownership before `remoteUser` takes effect. AI CLI installers and auth token writes fail without this fix.

**This is integrated into the main template** via `postCreateCommand` object form. Each AI CLI gets a chown entry that runs BEFORE the CLI install entry. See main template above.

### Auth forwarding (Claude Code) via setup-container.sh

Auth tokens live in `~/.claude/.credentials.json` inside the config volume. On first container creation (empty volume), tokens are copied from the host Keychain staging file.

Instead of fragile inline shell one-liners, generate a **setup-container.sh** script:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Copy auth tokens from host Keychain staging file into the config volume.
# Runs in postCreateCommand after volume chown.
STAGING="$HOME/.claude-auth-staging.json"
TARGET="$HOME/.claude/.credentials.json"

if [ ! -s "$STAGING" ]; then
  echo "[setup-container] No auth staging file or empty — skipping auth copy."
  echo "[setup-container] You can authenticate manually: claude login"
  exit 0
fi

# Always copy from staging (overwrite stale/corrupt tokens from previous attempts)
cp "$STAGING" "$TARGET"
chmod 600 "$TARGET"
echo "[setup-container] Auth tokens copied from host Keychain staging."
```

Place this script at `.devcontainer/setup-container.sh` and make it executable (`chmod +x`).

**postCreateCommand** references:
```jsonc
"postCreateCommand": {
  "deps": "{{dependency_install_command}}",
  "claude-chown": "sudo chown -R {{remote_user}}:{{remote_user}} ~/.claude",
  "claude-cli": "curl -fsSL https://claude.ai/install.sh | bash",
  "claude-auth": ".devcontainer/setup-container.sh",
  "opencode-chown": "sudo chown -R {{remote_user}}:{{remote_user}} ~/.config/opencode",
  "opencode-cli": "curl -fsSL https://opencode.ai/install | bash"
}
```

**initializeCommand** (runs on host, macOS only):
```jsonc
"initializeCommand": "security find-generic-password -s 'Claude Code-credentials' -w > ~/.claude-auth-staging.json 2>/dev/null || echo '{}' > ~/.claude-auth-staging.json"
```

See [auth-forwarding.md](auth-forwarding.md) for full architecture details and warnings.

**WARNING**: Do NOT set `CLAUDE_CONFIG_DIR` in `remoteEnv` — it redirects where Claude looks for `.credentials.json`, breaking the volume auth strategy.

**WARNING**: Do NOT set `ANTHROPIC_API_KEY` to empty string in `remoteEnv` — Claude Code interprets it as API-key auth attempt and fails. Only include `ANTHROPIC_API_KEY` if the user explicitly provides an API key. See [auth-forwarding.md](auth-forwarding.md) § Critical Warnings.
