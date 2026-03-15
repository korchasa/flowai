# Devcontainer Features Discovery

Reference for scanning a project and suggesting relevant devcontainer features.
The agent uses project indicators to identify needs, then searches the official
registry at https://containers.dev/features for matching feature IDs.

## Discovery Logic

1. Scan project root (and common subdirs like `src/`, `infra/`, `deploy/`) for indicator files and patterns
2. Map indicators to **needs** (see table below)
3. Search https://containers.dev/features for features matching each need
4. Filter out needs already covered by the primary stack's base image
5. Classify: **auto** (high confidence, lightweight) vs **suggest** (optional, heavy, or ambiguous)
6. Present grouped list to user with detection rationale (which file triggered each suggestion)
7. User confirms or customizes before generation

## AI IDE Features

The devcontainer registry already provides features for AI CLI tools.
Use these instead of manual installation scripts in `postCreateCommand`:

- **Claude Code**: `ghcr.io/devcontainers-extra/features/claude-code:1` (via npm) or `ghcr.io/stu-bell/devcontainer-features/claude-code:0` (via claude.ai/install.sh)
- **OpenCode**: `ghcr.io/jsburckhardt/devcontainer-features/opencode:1` (via opencode.ai/install)
- **Cursor CLI**: `ghcr.io/stu-bell/devcontainer-features/cursor-cli:0` (via cursor.com/install)
- **Gemini CLI**: `ghcr.io/stu-bell/devcontainer-features/gemini-cli:0` (via npm)
- **GitHub Copilot CLI**: `ghcr.io/devcontainers/features/copilot-cli:1`

When user selects an AI CLI in Step 4, prefer the registry feature over a raw
`curl | bash` in `postCreateCommand`. The feature handles installation, PATH
setup, and updates. Config persistence and global skills mounting still require
explicit `mounts` configuration (see SKILL.md).

## Indicator → Need Mapping

The agent scans for these indicators and maps them to a **need** keyword.
Then searches the registry for a feature matching that need.

### Secondary Runtimes (auto)

Skip if runtime is the primary stack or included in the base image.

- `package.json` (non-primary) → need: Node.js
- `requirements.txt` / `pyproject.toml` / `setup.py` (non-primary) → need: Python
- `go.mod` (non-primary) → need: Go
- `Cargo.toml` (non-primary) → need: Rust
- `deno.json` / `deno.jsonc` (non-primary) → need: Deno
- `pom.xml` / `build.gradle` / `build.gradle.kts` → need: Java

### Build Tools & Package Managers (auto)

- `pnpm-lock.yaml` / `pnpm-workspace.yaml` → need: pnpm
- `bun.lockb` / `bunfig.toml` → need: Bun
- `justfile` / `Justfile` → need: Just (command runner)
- `.envrc` → need: direnv
- `flake.nix` / `shell.nix` / `default.nix` → need: Nix

### Infrastructure & Cloud (suggest)

- `Dockerfile` (in project root, not `.devcontainer/`) / `docker-compose.yml` / `.dockerignore` → need: Docker-in-Docker
- `*.tf` / `.terraform.lock.hcl` → need: Terraform
- `k8s/` / `kubernetes/` / `Chart.yaml` / `kustomization.yaml` → need: kubectl, Helm
- `serverless.yml` / `samconfig.toml` / `cdk.json` / dependency `aws-sdk`/`boto3` → need: AWS CLI
- `azure-pipelines.yml` / `*.bicep` / dependency `@azure/*` → need: Azure CLI
- `cloudbuild.yaml` / `app.yaml` (GAE) / dependency `@google-cloud/*` → need: Google Cloud CLI

### Databases (suggest)

- `docker-compose.yml` with `postgres` / `prisma/schema.prisma` with `postgresql` → need: PostgreSQL
- `docker-compose.yml` with `redis` / dependency `ioredis`/`redis`/`bull` → need: Redis
- dependency `mongoose`/`mongodb`/`pymongo` → need: MongoDB

### Testing (suggest — heavy)

- `playwright.config.ts` / dependency `@playwright/test` → need: Playwright (large, installs browsers)

## Always Included (base template)

These are always added regardless of scan results:

- `ghcr.io/devcontainers/features/common-utils:2` — zsh, basic utilities
- `ghcr.io/devcontainers/features/github-cli:1` — gh CLI

## Presentation Format

```
Detected features for your project:

Auto-add (based on project files):
  - direnv (found .envrc)
  - pnpm (found pnpm-lock.yaml)

Suggested (confirm to add):
  - PostgreSQL (found prisma schema with postgresql provider)
  - Docker-in-Docker (found docker-compose.yml)

AI CLI (from Step 4):
  - Claude Code feature (ghcr.io/devcontainers-extra/features/claude-code:1)

Already included:
  - GitHub CLI (base template)
  - Common Utilities (base template)
  - Node.js (primary stack)

Add all suggested features? [Y/n/customize]
```

When user confirms, merge all features into the `features` block in devcontainer.json.
For each feature, check https://containers.dev/features for the latest version and
available options.
