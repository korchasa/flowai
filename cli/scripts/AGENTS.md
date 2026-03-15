# Development Commands

## Standard Interface

- `check` - The main command for comprehensive project verification. Performs
  the following steps:
  - comment-scan: "TODO", "FIXME", "HACK", "XXX", debugger calls, linters and
    formatters suppression
  - code formatting check
  - static code analysis
  - runs all project tests
- `test <path>` - Runs a single test.
- `dev` - Runs the application in development mode with watch mode enabled.
- `prod` - Runs the application in production mode.

## Detected Commands

- `deno task bundle` — generate src/bundled.json from ../framework/
- `deno task check` — bundle + fmt + lint + test
- `deno task test` — run all tests
- `deno task dev` — development mode with watch
- `deno fmt` — format code
- `deno lint` — lint code
- `deno publish --dry-run` — validate JSR package

## Command Scripts

- `scripts/bundle-framework.ts` — bundle ../framework/ into src/bundled.json
- `scripts/check.ts` — comprehensive check script (bundle, fmt, lint, test)
