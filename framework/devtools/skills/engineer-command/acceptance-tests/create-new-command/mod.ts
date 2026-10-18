import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const EngineerCommandCreateBench = new class
  extends AcceptanceTestScenario {
  id = "engineer-command-create";
  name = "Create a project slash command for Docker Compose management";
  skill = "engineer-command";
  stepTimeoutMs = 600_000;
  agentsTemplateVars = {
    PROJECT_NAME: "DockerServices",
    TOOLING_STACK: "- TypeScript\n- Docker Compose",
  };

  userQuery =
    '/engineer-command I want to create a command called "docker-compose" that helps manage Docker Compose services. It should help with starting/stopping services, viewing logs, rebuilding containers, and checking health. This is a project-level command.';

  interactive = true;
  userPersona =
    "I am a developer who uses Docker Compose daily. I want the command to cover common workflows: up/down, logs, rebuild, health check. I prefer Cursor as my IDE. When asked about examples, I typically do things like 'rebuild and restart the api service' or 'show me the logs for the db service'. I want the command to be project-level.";

  checklist = [
    {
      id: "asks_usage_examples",
      description:
        "Did the agent ask for or discuss concrete usage examples before creating the command (Step 1)?",
      critical: true,
    },
    {
      id: "plans_arguments",
      description:
        "Did the agent work out, from the usage examples, which arguments the command takes (for example an action and a service name) before writing the file?",
      critical: false,
    },
    {
      id: "command_file_created",
      description:
        "Did the agent create the command as ONE Markdown file named after the command in the project-level commands directory of the IDE the user agreed to — `.cursor/commands/docker-compose.md`, `.claude/commands/docker-compose.md` or `.opencode/commands/docker-compose.md` — and NOT as a directory with a SKILL.md (for example `.claude/skills/docker-compose/SKILL.md`)?",
      critical: true,
    },
    {
      id: "format_matches_ide",
      description:
        "Does the command file follow the format of its IDE? A Cursor command is plain Markdown with no YAML frontmatter. A Claude Code or OpenCode command has YAML frontmatter with a `description` that says what the command does; a Claude Code command that takes arguments also has an `argument-hint`.",
      critical: true,
    },
    {
      id: "concise_body",
      description:
        "Is the command file's body focused on the procedure the agent must follow when the command runs, without README-style content, installation notes or a changelog?",
      critical: false,
    },
    {
      id: "ide_detection",
      description:
        "Did the agent ask which IDE the command is for, or act on the user's stated IDE, and put the file where that IDE reads project commands?",
      critical: false,
    },
    {
      id: "qa_format_compliant",
      description:
        "If the agent asked clarifying questions to the user (usage examples, IDE, scope), did each question follow FR-UNIVERSAL.QA-FORMAT — i.e. each question is a numbered list item (a line starting with '1.', '2.', ...), NOT a bold heading like '**1. Title**', a Markdown heading, or a bare paragraph? A numbered item whose text opens with a bold title ('1. **Example phrases.** ...') IS a numbered list item and passes; nested option lists under it are fine. If the agent did not ask any clarifying questions, this criterion is vacuously satisfied (mark as passed).",
      critical: true,
    },
  ];
}();
