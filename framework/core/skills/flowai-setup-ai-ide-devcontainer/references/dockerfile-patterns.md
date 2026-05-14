# Dockerfile Patterns

> `gh` (GitHub CLI) and common utilities are installed via the devcontainer features (`ghcr.io/devcontainers/features/github-cli:1`, `ghcr.io/devcontainers/features/common-utils:2`) that the skill always adds. Do NOT re-install them in the Dockerfile — double installation wastes layers and causes version skew with the feature's self-update path.

## Base Pattern (all stacks)

```dockerfile
FROM {{base_image}}

ARG USERNAME={{remote_user}}
ARG USER_UID=1000
ARG USER_GID=$USER_UID

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    ca-certificates \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Non-root user — ONLY create when the base image does NOT already provide one.
# mcr.microsoft.com/devcontainers/* ships `vscode`; node:* ships `node`;
# denoland/deno:* ships `deno`. In those cases, skip this RUN block and set
# `ARG USERNAME=<existing>` to match the base image's user.
RUN groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID -m $USERNAME \
    && echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME
```

## Deno Stack

Preferred: use `mcr.microsoft.com/devcontainers/base:ubuntu` as base image + the
`ghcr.io/devcontainers-extra/features/deno:latest` devcontainer feature (see SKILL.md § Step 1).
The Dockerfile below is for cases where a custom Dockerfile is needed anyway
(e.g. firewall packages, extra system deps):

```dockerfile
FROM mcr.microsoft.com/devcontainers/base:ubuntu

# ... base pattern (skip user creation — `vscode` user already exists) ...

# Deno — install in Dockerfile only if NOT using the devcontainer feature.
# Prefer the feature; this is a fallback for images without feature support.
ENV DENO_INSTALL="/usr/local"
RUN curl -fsSL https://deno.land/install.sh | sh -s -- --yes

# gh CLI is provided by the ghcr.io/devcontainers/features/github-cli:1 feature —
# do NOT re-install it here.
```

## AI CLI Installation (append for selected tools)

### Claude Code
```dockerfile
# Claude Code CLI (native installer, recommended)
RUN curl -fsSL https://claude.ai/install.sh | bash
```

Alternative with version pinning via npm:
```dockerfile
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*
ARG CLAUDE_CODE_VERSION=latest
RUN npm install -g @anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}
```

### OpenCode
```dockerfile
# OpenCode CLI (check https://opencode.ai for latest install method)
RUN curl -fsSL https://opencode.ai/install | bash
```

### flowai
```dockerfile
# flowai CLI (requires Deno installed in earlier layer)
RUN deno install -g -A -f jsr:@korchasa/flowai
```

## Firewall Support (append when security hardening enabled)

```dockerfile
# Firewall dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    iptables \
    ipset \
    iproute2 \
    dnsutils \
    sudo \
    && rm -rf /var/lib/apt/lists/*

COPY init-firewall.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/init-firewall.sh \
    && echo "${USERNAME} ALL=(root) NOPASSWD: /usr/local/bin/init-firewall.sh" \
    > /etc/sudoers.d/${USERNAME}-firewall \
    && chmod 0440 /etc/sudoers.d/${USERNAME}-firewall
```

## Environment Markers

Always add near the end of Dockerfile:
```dockerfile
ENV DEVCONTAINER=true
WORKDIR /workspace
USER ${USERNAME}
```
