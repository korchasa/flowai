---
description: Guidance on running project tooling
globs:
alwaysApply: true
---
## CLI COMMANDS VIA `deno task`

Use `deno task` to perform standard development operations.

### Usage:
```bash
deno task <command> [args...]
```

### Commands:
- `check` - The main command for comprehensive project verification. Performs the following steps:
  - build the project
  - comment-scan: "TODO", "FIXME", "HACK", "XXX", debugger calls, linters and formatters suppression
  - code formatting check
  - static code analysis
  - runs all project tests
- `test <path>` - Runs a single test.
- `dev` - Runs the application in development mode with watch mode enabled.
- `prod` - Runs the application in production mode.
