import { BenchmarkSkillScenario } from "@bench/types.ts";

export const SetupDevcontainerOpenCodeMultiCli = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-setup-ai-ide-devcontainer-opencode-multi-cli";
  name = "Python project with Claude Code + OpenCode and global skills";
  skill = "flowai-skill-setup-ai-ide-devcontainer";
  stepTimeoutMs = 420_000;
  interactive = true;
  maxSteps = 15;
  agentsTemplateVars = {
    PROJECT_NAME: "PyMultiCli",
    TOOLING_STACK: "- Python",
  };

  userQuery =
    "/flowai-skill-setup-ai-ide-devcontainer Set up a devcontainer for this Python project. Install both Claude Code and OpenCode. Mount global skills from host. No firewall. No custom Dockerfile.";

  userPersona =
    `You are a developer who wants a Python devcontainer with both Claude Code and OpenCode AI CLIs.
When asked about AI CLI, choose both Claude Code and OpenCode.
When asked about global skills, agree to mount host config directories read-only.
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
      id: "python_base_image",
      description:
        "Does devcontainer.json reference a Python base image (contains 'python' in image name)?",
      critical: true,
    },
    {
      id: "claude_code_configured",
      description:
        "Is Claude Code configured (via registry feature like ghcr.io/.../claude-code, or npm/curl install in postCreateCommand)?",
      critical: true,
    },
    {
      id: "opencode_configured",
      description:
        "Is OpenCode configured (via registry feature like ghcr.io/.../opencode, or curl install in postCreateCommand)?",
      critical: true,
    },
    {
      id: "claude_global_skills_mount",
      description:
        "Is there a bind mount for host ~/.claude/ (read-only) to a separate path like ~/.claude-host?",
      critical: true,
    },
    {
      id: "opencode_global_skills_mount",
      description:
        "Is there a bind mount for host ~/.config/opencode/ (read-only) to a separate path like ~/.config/opencode-host?",
      critical: true,
    },
    {
      id: "post_start_skills_sync",
      description:
        "IF the generated config includes a skills-sync step, is it placed in `postStartCommand` (not `postCreateCommand`) AND does it use `cp -rL` (dereference symlinks) for BOTH Claude Code (`~/.claude-host/skills` → `~/.claude/skills`) and OpenCode (`~/.config/opencode-host/skills` → `~/.config/opencode/skills`)? Skills sync is optional per SKILL.md — this check grades placement and form ONLY IF sync was generated; absence is acceptable.",
      critical: false,
    },
    {
      id: "no_hardcoded_secrets",
      description:
        "Are there no hardcoded API keys or tokens in any generated file?",
      critical: true,
    },
    {
      id: "python_deps_install",
      description:
        "Does `postCreateCommand` include `pip install` (or equivalent Python dependency install)?",
      critical: false,
    },
    {
      id: "auth_policy_compliance",
      description:
        "Does the generated config strictly follow SKILL.md § Auth Policy? ALL must hold: (a) no `remoteEnv` auth vars (no `ANTHROPIC_API_KEY`, `GITHUB_TOKEN`, `CLAUDE_CONFIG_DIR` via `${localEnv:...}`; empty `ANTHROPIC_API_KEY` breaks Claude OAuth, `CLAUDE_CONFIG_DIR` breaks the volume strategy); (b) no `secrets` block; (c) no `initializeCommand`; (d) no automation of `gh auth login`, `claude login`, or `opencode auth login` anywhere in postCreateCommand or setup-container.sh; (e) if `setup-container.sh` is generated, its body is strictly a chown loop — no credential writes.",
      critical: true,
    },
    {
      id: "stable_volume_names",
      description:
        "Do named Docker volumes in `mounts` for both Claude Code and OpenCode use stable names derived from `${localWorkspaceFolderBasename}` (e.g. `${localWorkspaceFolderBasename}-claude-config`, `${localWorkspaceFolderBasename}-opencode-config`), NOT the `${devcontainerId}` suffix that rehashes on every config edit?",
      critical: true,
    },
  ];
}();
