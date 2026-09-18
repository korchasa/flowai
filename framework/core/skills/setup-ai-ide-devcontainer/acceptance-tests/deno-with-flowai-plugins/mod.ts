import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const SetupDevcontainerDenoWithFlowaiPlugins = new class
  extends AcceptanceTestScenario {
  id = "setup-ai-ide-devcontainer-deno-flowai-plugins";
  name = "Deno project with the flowai plugin";
  skill = "setup-ai-ide-devcontainer";
  stepTimeoutMs = 420_000;
  // Interactivity wired on 2026-08-24. This is the only scenario of the six
  // whose query answers NONE of the Step 4 capability questions, so the skill
  // must ask and wait — `node-basic` and `deno-with-claude` answer them inline
  // in the query, `feature-discovery` pre-authorizes with "accept all". The
  // persona below was authored for exactly those four questions but never ran:
  // `UserEmulator` is built only when `interactive` is true (runner.ts:518), so
  // the run was single-turn and the agent's questions went unanswered. It
  // scored green only while the skill skipped the questions; once step 6/7 was
  // made mandatory the scenario measured the harness, not the skill.
  interactive = true;
  maxSteps = 15;
  agentsTemplateVars = {
    PROJECT_NAME: "DenoFlowaiApp",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  userQuery =
    "/setup-ai-ide-devcontainer Set up a devcontainer for this Deno project with flowai installed from its plugin marketplace.";

  userPersona =
    `You are a developer who wants a devcontainer for a Deno project with Claude Code and the flowai plugin installed.
When asked about AI CLI tools, choose Claude Code with the flowai plugin.
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
        "Does the config include Deno support (either a Deno-aware base image like `mcr.microsoft.com/devcontainers/base:ubuntu` + the `ghcr.io/devcontainers-extra/features/deno:latest` feature, OR a `denoland/deno:*` base image)? The project in the fixture is a Deno project, so the container must be able to run Deno.",
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
        "Does `postCreateCommand` install flowai from its plugin marketplace — `claude plugin marketplace add korchasa/flowai-plugins` followed by `claude plugin install flowai@flowai-plugins`? The Codex equivalent (`codex plugin marketplace add korchasa/flowai-plugins` + `codex plugin add flowai@flowai-plugins`) is accepted instead.",
      critical: true,
    },
    {
      id: "no_jsr_install",
      description:
        "Is the string `jsr:@korchasa/flowai` absent from every generated file? That JSR package is an archived CLI and must never be installed.",
      critical: true,
    },
    {
      id: "no_flowai_config_volume",
      description:
        "Is there NO named volume or bind mount for a flowai config file (e.g. no `~/.config/flowai` or `~/.flowai` mounts)? The plugin install keeps no state outside the IDE's own plugin cache.",
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
        "IF the generated config uses any Docker named volumes (e.g. for bash history), do they use stable names derived from `${localWorkspaceFolderBasename}` (NOT `${devcontainerId}` which rehashes on every edit)? If no named volumes are generated, this check is vacuously satisfied.",
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
