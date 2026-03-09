import { BenchmarkSkillScenario } from "../../../../scripts/benchmarks/lib/types.ts";

export const SetupDevcontainerDenoWithClaude = new class
  extends BenchmarkSkillScenario {
  id = "flow-skill-setup-ai-ide-devcontainer-deno-claude";
  name = "Deno project with Claude Code, global skills, and firewall";
  skill = "flow-skill-setup-ai-ide-devcontainer";

  userQuery =
    "/flow-skill-setup-ai-ide-devcontainer Set up a devcontainer for this Deno project with full Claude Code integration, global skills mounting, and security hardening.";

  userPersona =
    `You are a developer who wants a secure devcontainer for a Deno project with autonomous AI agent support.
When asked about AI CLI, choose Claude Code.
When asked about global skills, agree to mount host ~/.claude/ read-only.
When asked about security hardening/firewall, agree.
When asked about custom Dockerfile, agree (needed for Deno + firewall).
Confirm any file creation prompts.`;

  checklist = [
    {
      id: "devcontainer_json_created",
      description:
        "Was `.devcontainer/devcontainer.json` created and is it valid JSON?",
      critical: true,
    },
    {
      id: "deno_support",
      description:
        "Does the config include Deno support (deno feature from devcontainers-extra, or Deno in Dockerfile, or denoland base image)?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "deno_extension",
      description: "Does the extensions list include `denoland.vscode-deno`?",
      critical: true,
    },
    {
      id: "claude_code_setup",
      description:
        "Is Claude Code CLI installation configured (native installer or npm install in Dockerfile or postCreateCommand)?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "global_skills_mount",
      description:
        "Is there a bind mount for host ~/.claude/ (read-only) to a separate path like ~/.claude-host?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "firewall_script",
      description:
        "Was `init-firewall.sh` created with default-deny policy and domain allowlist?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "net_admin_cap",
      description:
        "Does devcontainer.json include NET_ADMIN capability in runArgs?",
      critical: true,
    },
    {
      id: "dockerfile_created",
      description: "Was a Dockerfile created in .devcontainer/?",
      critical: true,
    },
    {
      id: "anthropic_api_key_env",
      description:
        "Does remoteEnv reference ANTHROPIC_API_KEY via ${localEnv:ANTHROPIC_API_KEY}?",
      critical: true,
    },
    {
      id: "deno_settings",
      description:
        "Does customizations.vscode.settings include `deno.enable: true`?",
      critical: false,
    },
    {
      id: "no_hardcoded_secrets",
      description:
        "Are there no hardcoded API keys or tokens in any generated file?",
      critical: true,
    },
  ];
}();
