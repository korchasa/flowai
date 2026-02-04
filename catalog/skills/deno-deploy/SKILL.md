---
name: deno-deploy
description: Manage Deno Deploy cloud services using both `deno deploy` and `deployctl`. Use this skill for deploying projects, managing cloud environments (Build/Dev/Prod contexts), monitoring logs, and troubleshooting deployment issues (like private npm dependencies).
---

# Deno Deploy

This skill covers managing Deno Deploy cloud services using the built-in `deno deploy` command and the advanced `deployctl` utility.

## Core Concepts (Deno 2.x / 2026)

- **Integrated Build System**: Deno Deploy now handles builds (install + build steps) on its own infrastructure with automatic caching and live logs.
- **Deployment Contexts**: Environment variables and configurations are separated into **Production**, **Development** (Preview/Branch), and **Build** contexts.
- **Runtime Permissions**: Applications run with `--allow-all` by default, supporting subprocesses, FFI, and full npm compatibility.
- **Static Assets**: First-class support for static files (Vite, SSG) which are automatically cached by the Deno Deploy CDN.

## Built-in `deno deploy`

The `deno deploy` command is integrated into the Deno CLI and is suitable for basic deployment tasks.

### Commands
- `deno deploy [OPTIONS] [root-path]`: Deploy the local project to Deno Deploy.
- `deno deploy create`: Create a new application.
- `deno deploy env`: Manage environment variables in the cloud (supports contexts).
- `deno deploy logs`: Stream live logs from a deployed application.
- `deno deploy switch`: Switch between organizations and applications.
- `deno deploy sandbox`: Interact with sandboxes.
- `deno deploy setup-aws` / `setup-gcp`: Configure cloud connections (OIDC).
- `deno deploy logout`: Revoke the Deno Deploy authentication token.

---

## Advanced Management via `deployctl`

For more granular control, including listing deployments and managing projects, use `deployctl`.

### Installation
```bash
deno install -gArf jsr:@deno/deployctl
```

### Projects and Deployments
- `deployctl list`: List all deployments for the current project.
- `deployctl projects list`: List all projects in your account.
- `deployctl deployments show <id>`: Show detailed information for a specific deployment/build.
- `deployctl redeploy --deployment=<id>`: Roll back or redeploy a specific version.
- `deployctl projects create <name>`: Create a new project.
- `deployctl projects delete <name>`: Delete a project.

### Monitoring and Utilities
- `deployctl top`: Real-time resource usage monitoring.
- `deployctl logs`: Advanced log streaming and filtering.

---

## Troubleshooting & Best Practices

### Private Dependencies (npm/JSR)
Deployments from local console (via `deployctl` or `deno deploy`) may fail with `Internal Server Error` if the project uses private npm packages.
- **Cause**: Deno Deploy build servers cannot access your local private registry credentials.
- **Solution**: Use **GitHub Actions** for deployment. GitHub Actions can be configured with secrets to authenticate against private registries before deploying the build artifact.

### CI/CD with GitHub Actions
Recommended workflow for complex projects (monorepos, private deps, E2E tests):
1. **Checkout & Setup**: Use `actions/checkout` and `denoland/setup-deno@v2`.
2. **Test & Build**: Run `deno task test` and `deno task build`.
3. **Deploy**: Use `denoland/deployctl@v1` Action.
4. **E2E Tests**: Run Playwright/browser tests after deployment using the `deployment_status` event.

### Environment Variables
- **Build Context**: Use for API tokens or build-time configurations.
- **Prod/Dev Contexts**: Use for runtime secrets (DB URLs, etc.).
- **Secrets**: Mark sensitive variables as "Secret" in the Deploy dashboard or via CLI.

## Common Workflows

### Deploying to Production
```bash
deno deploy --prod
# OR
deployctl deploy --prod
```

### Checking Deployment History
```bash
deployctl list
```

### Managing Environment Variables
```bash
deno deploy env set MY_VAR=value --context=production
```
