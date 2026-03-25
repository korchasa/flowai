---
name: flowai-skill-configure-deno-commands
description: Configure and maintain Deno development commands (check, test, dev, prod). Use when the user wants to set up or update the standard command interface in deno.json and scripts/ directory.
---

# Configure Deno Commands

This skill ensures a standardized development interface using Deno tasks and scripts.

## Context

This skill can be invoked:
- **Standalone**: When a user wants to fix or update their Deno commands.
- **From flowai-init**: During project initialization to set up the standard interface.

## Standard Interface

The project must support these commands in `deno.json`:

- `deno task check`: Comprehensive verification (build, lint, fmt, static analysis, tests).
- `deno task test`: Run all tests or a specific test if a path is provided.
- `deno task dev`: Run in development mode with watch mode.
- `deno task prod`: Run in production mode.

## Rules & Constraints

1. **Idempotency**: Check existing `scripts/` and `deno.json` tasks before creating. Do not overwrite existing scripts unless user confirms.
2. **Scripts Location**: All complex logic must reside in `.ts` files within the `scripts/` directory.
3. **Task Definitions**: `deno.json` should point to these scripts.
4. **Standard Interface Compliance**: The `check.ts` script must implement the full verification checklist.
5. **Exit Codes**: Scripts must return non-zero exit codes on failure to break CI/CD and agent workflows.

## Workflow

1. **Analyze**: Check existing `deno.json` and `scripts/`.
2. **Scaffold Scripts**: Create `scripts/check.ts` if missing.
   
   **check.ts Template**:
   ```typescript
   // scripts/check.ts
   import { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.3/command/mod.ts";

   async function run(cmd: string, args: string[]) {
     console.log(`> ${cmd} ${args.join(" ")}`);
     const process = new Deno.Command(cmd, { args });
     const { success } = await process.output();
     if (!success) {
       console.error(`Command failed: ${cmd}`);
       Deno.exit(1);
     }
   }

   await new Command()
     .name("check")
     .description("Full project check")
     .action(async () => {
       console.log("Running Formatting check...");
       await run("deno", ["fmt", "--check"]);
       
       console.log("Running Linting...");
       await run("deno", ["lint"]);
       
       console.log("Running Tests...");
       await run("deno", ["test", "-A"]);
       
       console.log("Check passed successfully!");
     })
     .parse(Deno.args);
   ```

3. **Configure Tasks**: Update `deno.json` tasks to reference the scripts.
4. **Verify**: Run `deno task check` to ensure everything works.

## Examples

### deno.json tasks
```json
{
  "tasks": {
    "check": "deno run -A scripts/check.ts",
    "test": "deno test -A",
    "dev": "deno run --watch -A src/main.ts",
    "prod": "deno run -A src/main.ts"
  }
}
```

## Verification

- [ ] `scripts/check.ts` exists and is executable.
- [ ] `deno.json` contains all standard tasks.
- [ ] `deno task check` passes cleanly.
