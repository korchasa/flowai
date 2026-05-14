import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const SetupDevcontainerBrownfield = new class
  extends AcceptanceTestScenario {
  id = "flowai-setup-ai-ide-devcontainer-brownfield";
  name = "Brownfield: existing devcontainer in Python project";
  skill = "flowai-setup-ai-ide-devcontainer";
  stepTimeoutMs = 420_000;
  interactive = true;
  maxSteps = 15;
  agentsTemplateVars = {
    PROJECT_NAME: "PyBrownfield",
    TOOLING_STACK: "- Python",
  };

  userQuery =
    "/flowai-setup-ai-ide-devcontainer Update the devcontainer config for this Python project. Add Claude Code support.";

  userPersona =
    `You are a developer with an existing (outdated) devcontainer who wants to modernize it.
When asked whether this is an update or a fix, say "update" — you just want to modernize.
When asked about AI CLI, choose Claude Code.
If the agent asks about authentication forwarding, API keys, Keychain extraction, or ANTHROPIC_API_KEY: say you expect ALL authentication to be manual (you will run \`claude login\` and \`gh auth login\` inside the container yourself). Do NOT provide an API key. The skill's policy is fully manual auth — do not ask it to automate anything.
When asked about host AI config visibility (mounting ~/.claude read-only), decline.
When asked about security hardening/firewall, decline.
When asked about custom Dockerfile, decline.
When shown diffs of existing files, confirm the overwrite.`;

  checklist = [
    {
      id: "diff_shown",
      description:
        "Did the agent show a diff or comparison of the existing devcontainer.json before overwriting?",
      critical: true,
    },
    {
      id: "confirmation_asked",
      description:
        "Did the agent ask for confirmation before overwriting the existing config?",
      critical: true,
    },
    {
      id: "python_base_image",
      description:
        "Does the updated devcontainer.json reference a Python base image (contains 'python' in image name)?",
      critical: true,
    },
    {
      id: "claude_code_extension",
      description: "Does the extensions list include `anthropic.claude-code`?",
      critical: true,
    },
    {
      id: "pip_install",
      description:
        "Does postCreateCommand include pip install or equivalent Python dependency command?",
      critical: true,
    },
    {
      id: "valid_json",
      description: "Is the final devcontainer.json valid JSON?",
      critical: true,
    },
    {
      id: "volume_ownership_fix",
      description:
        "IF a writable `~/.claude/` volume is generated, is the chown handled INSIDE `setup-container.sh` as a self-healing `if [ ! -w ... ]; then sudo chown -R ...` guard — NOT as a separate parallel `postCreateCommand` object entry (which races with anything else touching `~/.claude/`)?",
      critical: true,
    },
    {
      id: "auth_policy_compliance",
      description:
        "Does the generated config strictly follow SKILL.md § Auth Policy? ALL must hold: (a) no `remoteEnv` auth vars (no `ANTHROPIC_API_KEY`, `GITHUB_TOKEN`, `CLAUDE_CONFIG_DIR` via `${localEnv:...}`); (b) no `secrets` block; (c) no `initializeCommand`; (d) no automation of `gh auth login`, `claude login`, or any other CLI login in postCreateCommand or setup-container.sh; (e) if `setup-container.sh` is generated, its body is strictly a chown loop — no credential writes.",
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
