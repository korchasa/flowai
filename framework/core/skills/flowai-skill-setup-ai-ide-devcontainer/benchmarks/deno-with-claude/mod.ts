// FR-DEVCONTAINER.INTERVIEW (greenfield interview integration) is NOT tested here.
// That path (flowai-init → devcontainer delegation) belongs to flowai-init benchmarks,
// not to devcontainer skill benchmarks. The skill itself is tested standalone.

import { BenchmarkSkillScenario } from "@bench/types.ts";

export const SetupDevcontainerDenoWithClaude = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-setup-ai-ide-devcontainer-deno-claude";
  name = "Deno project with Claude Code, global skills, and firewall";
  skill = "flowai-skill-setup-ai-ide-devcontainer";
  stepTimeoutMs = 420_000;
  agentsTemplateVars = {
    PROJECT_NAME: "DenoSecureApp",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  userQuery =
    "/flowai-skill-setup-ai-ide-devcontainer Set up a devcontainer for this Deno project with full Claude Code integration, global skills mounting, and security hardening.";

  userPersona =
    `You are a developer who wants a secure devcontainer for a Deno project with autonomous AI agent support.
When asked about AI CLI, choose Claude Code.
When asked about global skills, agree to mount host ~/.claude/ read-only.
When asked about security hardening/firewall, agree.
When asked about custom Dockerfile, agree (needed for Deno + firewall).
Confirm any file creation prompts.`;

  checklist = [
    // Positive functional checks — what the scenario asks for
    {
      id: "devcontainer_json_created",
      description:
        "Was `.devcontainer/devcontainer.json` created and is it valid JSON (JSONC parser — comments allowed)?",
      critical: true,
    },
    {
      id: "deno_support",
      description:
        "Does the config include Deno support (deno feature from devcontainers-extra, or Deno installed in the Dockerfile, or a denoland base image)?",
      critical: true,
    },
    {
      id: "deno_extension",
      description: "Does the extensions list include `denoland.vscode-deno`?",
      critical: true,
    },
    {
      id: "claude_code_setup",
      description:
        "Is Claude Code CLI installation configured via official install script (`curl -fsSL https://claude.ai/install.sh | bash`) or via `npm install -g @anthropic-ai/claude-code` — in Dockerfile or in postCreateCommand (NOT via a registry feature, per SKILL.md guidance)?",
      critical: true,
    },
    {
      id: "host_claude_bind_mount_readonly_separate_path",
      description:
        "Is host `${localEnv:HOME}/.claude` mounted read-only at `/home/<user>/.claude-host` (a SEPARATE path from the writable volume target `/home/<user>/.claude`)? Shadowing the writable volume is the canonical mistake and must not happen.",
      critical: true,
    },
    {
      id: "firewall_script",
      description:
        "Was `init-firewall.sh` created with default-deny policy and a domain allowlist?",
      critical: true,
    },
    {
      id: "net_admin_cap",
      description:
        "Does devcontainer.json include NET_ADMIN capability in runArgs (required for iptables inside the container)?",
      critical: true,
    },
    {
      id: "dockerfile_created",
      description: "Was a Dockerfile created in .devcontainer/?",
      critical: true,
    },
    {
      id: "deno_settings",
      description:
        "Does customizations.vscode.settings include `deno.enable: true`?",
      critical: false,
    },

    // Persistence and volume correctness
    {
      id: "stable_volume_names",
      description:
        "Do named Docker volumes in `mounts` use stable names derived from `${localWorkspaceFolderBasename}` (e.g. `${localWorkspaceFolderBasename}-claude-config`), NOT the `${devcontainerId}` suffix which rehashes on every config edit?",
      critical: true,
    },
    {
      id: "volume_ownership_fix",
      description:
        "Is the `~/.claude/` volume chown handled INSIDE `setup-container.sh` as a self-healing `if [ ! -w ... ]; then sudo chown -R ...` guard, NOT as a separate parallel `postCreateCommand` object entry (which races with anything else touching `~/.claude/`)?",
      critical: true,
    },

    // Single consolidated Auth Policy compliance check
    // (replaces 9 overlapping legacy items: no_anthropic_api_key_in_remote_env, no_remote_env_auth_vars,
    //  no_gh_auth_automation, setup_script_chown_only, setup_script_no_credentials_write, no_secrets_block,
    //  no_initialize_command, no_auth_staging_mount, no_claude_config_dir_env)
    {
      id: "auth_policy_compliance",
      description:
        "Does the generated config strictly follow SKILL.md § Auth Policy? To pass, ALL of the following must hold: (a) no `remoteEnv` auth vars at all — no `ANTHROPIC_API_KEY`, `GITHUB_TOKEN`, `CLAUDE_CONFIG_DIR`, or any API key via `${localEnv:...}` (empty-string `ANTHROPIC_API_KEY` breaks Claude OAuth; `CLAUDE_CONFIG_DIR` breaks the volume strategy); (b) no `secrets` block; (c) no `initializeCommand` (Keychain-extraction forwarder was removed); (d) no automation of `gh auth login`, `claude login`, or `opencode auth login` anywhere in postCreateCommand or setup-container.sh; (e) `setup-container.sh` body is strictly a recursive chown loop — no credential writes, no `cp` into `.credentials.json`, no staging-file reads; (f) no bind mount for `~/.claude-auth-staging.json` or similar Keychain staging files.",
      critical: true,
    },

    // Non-auth hygiene
    {
      id: "no_hardcoded_secrets",
      description:
        "Are there no hardcoded API keys or tokens in any generated file?",
      critical: true,
    },

    // Skills sync (optional per SKILL.md — graded only if generated)
    {
      id: "global_skills_sync_placement",
      description:
        "IF the agent generated a global skills sync command, is it placed in `postStartCommand` (not `postCreateCommand`) and does it use `cp -rL` (dereference symlinks, since host skills may be symlinks with host-relative paths)? Skills sync is optional per SKILL.md — this check grades placement and form ONLY IF sync was generated; absence of a sync step is acceptable.",
      critical: false,
    },

    // Feature discovery
    {
      id: "feature_discovery_performed",
      description:
        "Did the agent scan for additional devcontainer features beyond the base stack (databases, tools, secondary runtimes)?",
      critical: false,
    },
  ];
}();
