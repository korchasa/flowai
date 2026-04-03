import { BenchmarkSkillScenario } from "@bench/types.ts";

export const SetupDevcontainerDenoWithFlowai = new class
  extends BenchmarkSkillScenario {
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
    `You are a developer who wants a devcontainer for a Deno project with flowai CLI installed.
When asked about AI CLI tools, choose flowai.
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
      id: "deno_support",
      description:
        "Does the config include Deno support (deno feature from devcontainers-extra, or Deno in Dockerfile, or denoland base image)?",
      critical: true,
    },
    {
      id: "flowai_install_in_post_create",
      description:
        "Does postCreateCommand include the flowai install command (`deno install -g -A -f jsr:@korchasa/flowai` or equivalent)?",
      critical: true,
    },
    {
      id: "no_flowai_config_volume",
      description:
        "Are there no unnecessary config volumes or bind mounts for flowai? flowai reads `.flowai.yaml` from the project workspace and needs no config volume.",
      critical: true,
    },
    {
      id: "no_hardcoded_secrets",
      description:
        "Are there no hardcoded API keys or tokens in any generated file?",
      critical: true,
    },
  ];
}();
