# Project File Structure Map

## Root Directory

```text
.
├── .cursor/           # Cursor IDE configuration and rules
├── .vscode/           # VS Code editor settings (legacy)
├── documents/         # Project documentation (SRS, SDS, etc.)
├── .gitignore         # Git ignore patterns
└── README.md          # Project overview and usage guide
```

## Cursor Configuration (.cursor/)

```text
.cursor/
├── commands/          # Task workflow commands (/task-*)
│   ├── alpha-task-build-claude-md.md  # CLAUDE.md build workflow (alpha)
│   ├── debug-server-error.md           # Server debugging protocol
│   ├── task-analyze-error.md           # Read-only error analysis workflow
│   ├── task-answer.md                  # Q&A guidance workflow
│   ├── task-commit.md                  # Git commit workflow
│   ├── task-create-command.md          # Custom command authoring workflow
│   ├── task-create-run-ts-script.md    # CLI script creation
│   ├── task-execute.md                 # Task execution workflow
│   ├── task-fix.md                     # Error fixing workflow
│   ├── task-github-issue-create.md     # GitHub issue creation
│   ├── task-investigate.md             # Code investigation workflow
│   ├── task-plan.md                    # Task planning workflow
│   ├── task-review.md                  # Code review workflow
│   └── task-update-docs.md             # Documentation update workflow
└── rules/             # Development rules and guidelines
    ├── docs-schema-*.mdc          # Documentation schemas
    ├── howto-*.mdc                # How-to guides
    ├── main-example.mdc           # Main configuration example
    ├── rules-*.mdc                # Development rule sets
    └── run-commands.mdc           # CLI command definitions
```

## Documentation (documents/)

```text
documents/
├── requirements.md    # Software Requirements Specification (SRS)
├── design.md          # Software Design Specification (SDS)
├── file_structure.md  # This file - project structure map
└── whiteboard.md      # Temporary notes and progress tracking
```

## File Organization Patterns
- **Rule naming:** `rules-*` (always apply), `howto-*` (situational), `docs-*` (documentation)
- **Command naming:** `task-*` (workflow commands)
- **File extensions:** `.mdc` (Cursor rules), `.md` (documentation)
- **Directory structure:** Feature-based organization within `.cursor/`
- **Configuration:** Centralized in `.cursor/` directory
- **Documentation:** Structured in `documents/` with standard schemas
