import { BenchmarkSkillScenario } from "../../../../../../scripts/benchmarks/lib/types.ts";

export const EngineerCommandCreateBench = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-command-create";
  name = "Create a new AssistFlow command for Docker Compose management";
  skill = "flowai-skill-engineer-command";
  stepTimeoutMs = 300_000;

  userQuery =
    '/flowai-skill-engineer-command I want to create a command called "flow-docker-compose" that helps manage Docker Compose services. It should help with starting/stopping services, viewing logs, rebuilding containers, and checking health. This is a project-level command.';

  interactive = true;
  userPersona =
    "I am a developer who uses Docker Compose daily. I want the command to cover common workflows: up/down, logs, rebuild, health check. I prefer Cursor as my IDE. When asked about examples, I typically do things like 'rebuild and restart the api service' or 'show me the logs for the db service'. I want the command to be project-level.";

  checklist = [
    {
      id: "asks_usage_examples",
      description:
        "Did the agent ask for or discuss concrete usage examples before creating the command (Step 1)?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "plans_resources",
      description:
        "Did the agent identify reusable resources (scripts, references, assets) needed for the command (Step 2)?",
      critical: false,
      type: "semantic" as const,
    },
    {
      id: "skill_md_created",
      description:
        "Did the agent create a SKILL.md file with YAML frontmatter containing name and description fields?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "description_includes_triggers",
      description:
        "Does the SKILL.md description field include when to use the command (trigger contexts), not just what it does?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "concise_body",
      description:
        "Is the SKILL.md body focused on procedural knowledge the agent needs, without unnecessary documentation or README-style content?",
      critical: false,
      type: "semantic" as const,
    },
    {
      id: "ide_detection",
      description:
        "Did the agent detect or ask about the IDE environment and place the command in the correct path?",
      critical: false,
      type: "semantic" as const,
    },
  ];
}();
