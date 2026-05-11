import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const SetupDevcontainerNodeBasic = new class
  extends AcceptanceTestScenario {
  id = "flowai-skill-setup-ai-ide-devcontainer-node-basic";
  name = "Basic Node.js devcontainer setup";
  skill = "flowai-skill-setup-ai-ide-devcontainer";
  stepTimeoutMs = 420_000;
  agentsTemplateVars = {
    PROJECT_NAME: "NodeExpressApp",
    TOOLING_STACK: "- TypeScript\n- Node.js\n- Express",
  };

  userQuery =
    "/flowai-skill-setup-ai-ide-devcontainer Set up a devcontainer for this Node.js project. Use Claude Code as AI CLI. No global skills mount. No firewall. No custom Dockerfile.";

  userPersona =
    `You are a developer who wants a simple devcontainer for a Node.js Express project.
When asked about AI CLI, choose Claude Code.
When asked about global skills, decline.
When asked about security hardening/firewall, decline.
When asked about custom Dockerfile, decline.
Confirm any file creation prompts.`;

  checklist = [
    {
      id: "devcontainer_json_created",
      description:
        "Was `.devcontainer/devcontainer.json` created and is it valid JSON?",
      critical: true,
    },
    {
      id: "node_base_image",
      description:
        "Does devcontainer.json reference a Node.js base image (contains 'node' or 'typescript-node' in image name)?",
      critical: true,
    },
    {
      id: "claude_code_extension",
      description: "Does the extensions list include `anthropic.claude-code`?",
      critical: true,
    },
    {
      id: "post_create_command",
      description:
        "Does postCreateCommand include `npm install` (or equivalent dependency install matching the lockfile: `yarn install`, `pnpm install`)?",
      critical: true,
    },
    {
      id: "no_hardcoded_secrets",
      description:
        "Are there no hardcoded API keys or tokens in any generated file?",
      critical: true,
    },
    {
      id: "remote_user_set",
      description:
        "Is `remoteUser` set to a non-root user (e.g. `node` for node:* images, `vscode` for mcr images)?",
      critical: false,
    },
    {
      id: "no_dockerfile",
      description:
        "Was NO Dockerfile generated (user declined custom Dockerfile)?",
      critical: false,
    },
    {
      id: "auth_policy_compliance",
      description:
        "Does the generated config strictly follow SKILL.md § Auth Policy? ALL must hold: (a) no `remoteEnv` auth vars (no `ANTHROPIC_API_KEY`, `GITHUB_TOKEN`, `CLAUDE_CONFIG_DIR` via `${localEnv:...}` — forwarding `${localEnv:ANTHROPIC_API_KEY}` resolves to an empty string when unset and silently breaks Claude OAuth); (b) no `secrets` block; (c) no `initializeCommand`; (d) no automation of `gh auth login`, `claude login`, or any other CLI login in postCreateCommand; (e) if `setup-container.sh` is generated, its body is strictly a chown loop.",
      critical: true,
    },
    {
      id: "feature_discovery_performed",
      description:
        "Did the agent scan for additional devcontainer features beyond the base stack (e.g., checking for databases, tools, secondary runtimes)?",
      critical: false,
    },
  ];
}();
