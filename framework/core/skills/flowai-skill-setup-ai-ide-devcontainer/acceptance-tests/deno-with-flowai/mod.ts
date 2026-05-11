import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const SetupDevcontainerDenoWithFlowai = new class
  extends AcceptanceTestScenario {
  id = "flowai-skill-setup-ai-ide-devcontainer-deno-flowai";
  name = "Deno project with flowai CLI";
  skill = "flowai-skill-setup-ai-ide-devcontainer";
  stepTimeoutMs = 420_000;
  agentsTemplateVars = {
    PROJECT_NAME: "DenoFlowaiApp",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  userQuery =
    "/flowai-skill-setup-ai-ide-devcontainer Set up a devcontainer for this Deno project with flowai CLI integration.";

  userPersona =
    `You are a developer who wants a devcontainer for a Deno project with the flowai CLI installed.
When asked about AI CLI tools, choose flowai (only).
When asked about host AI config visibility, decline.
When asked about security hardening/firewall, decline.
When asked about custom Dockerfile, decline.
Confirm any file creation prompts.`;

  checklist = [
    // Positive functional checks
    {
      id: "devcontainer_json_created",
      description:
        "Was `.devcontainer/devcontainer.json` created and is it valid JSON (JSONC parser — comments allowed)?",
      critical: true,
    },
    {
      id: "deno_support",
      description:
        "Does the config include Deno support (either a Deno-aware base image like `mcr.microsoft.com/devcontainers/base:ubuntu` + the `ghcr.io/devcontainers-extra/features/deno:latest` feature, OR a `denoland/deno:*` base image)? flowai requires Deno at runtime.",
      critical: true,
    },
    {
      id: "deno_extension",
      description: "Does the extensions list include `denoland.vscode-deno`?",
      critical: true,
    },
    {
      id: "flowai_install_in_post_create",
      description:
        "Does `postCreateCommand` include `deno install -g -A -f jsr:@korchasa/flowai` (or an equivalent `deno install` of the flowai JSR specifier)?",
      critical: true,
    },
    {
      id: "no_flowai_config_volume",
      description:
        "Is there NO named volume or bind mount specifically for flowai config (e.g. no `~/.config/flowai` or `~/.flowai` mounts)? flowai reads `.flowai.yaml` from the project workspace root and needs no persistent state outside the workspace.",
      critical: true,
    },

    // Auth Policy compliance — a single consolidated check
    {
      id: "auth_policy_compliance",
      description:
        "Does the generated config strictly follow SKILL.md § Auth Policy? To pass, ALL of the following must hold: (a) no `remoteEnv` auth vars (no `ANTHROPIC_API_KEY`, `GITHUB_TOKEN`, `CLAUDE_CONFIG_DIR` via `${localEnv:...}`); (b) no `secrets` block; (c) no `initializeCommand`; (d) no automation of `gh auth login` or any CLI login in postCreateCommand or setup-container.sh; (e) if `setup-container.sh` is generated at all, its entire body is a chown loop — no credential writes; (f) no `~/.claude-auth-staging.json` or similar Keychain staging mounts.",
      critical: true,
    },

    // Persistence hygiene (applies when setup-container.sh + any volume is generated)
    {
      id: "stable_volume_names_if_any",
      description:
        "IF the generated config uses any Docker named volumes (e.g. for bash history), do they use stable names derived from `${localWorkspaceFolderBasename}` (NOT `${devcontainerId}` which rehashes on every edit)? If no named volumes are generated (flowai-only minimal setup), this check is vacuously satisfied.",
      critical: false,
    },

    // Non-auth hygiene
    {
      id: "no_hardcoded_secrets",
      description:
        "Are there no hardcoded API keys or tokens in any generated file?",
      critical: true,
    },
    {
      id: "remote_user_set",
      description:
        "Is `remoteUser` set to a non-root user (`vscode` for mcr base images, `deno` for denoland images)?",
      critical: false,
    },
    {
      id: "no_dockerfile",
      description:
        "Was NO Dockerfile generated (user declined custom Dockerfile)?",
      critical: false,
    },
  ];
}();
