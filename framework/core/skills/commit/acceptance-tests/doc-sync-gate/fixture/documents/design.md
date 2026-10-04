# SDS

## 1. Intro

- **Purpose:** Architecture for the CliTool utility.
- **Rel to SRS:** Satisfies FR-CLI-VERBOSE, FR-CLI-RUN.

## 2. Arch

- **Subsystems:** Single-module CLI dispatcher (`src/cli.ts`).

## 3. Components

### 3.1 Comp: CLI Dispatcher (`src/cli.ts`)

- **Purpose:** Parse argv, dispatch to `run` handler, honor `--verbose` logging flag.
- **Interfaces:** `main(argv: string[])` entry point.
- **Deps:** None.
- **Flags:**
  - `--verbose` — enables detailed logging.

## 4. Data

- **Entities:** None (stateless).

## 5. Logic

- **Algos:** argv[2] is the subcommand name; presence of `--verbose` in argv toggles log verbosity.

## 6. Non-Functional

- **Logs:** Verbose logs go to stdout when `--verbose` is set.

## 7. Constraints

- **Simplified/Deferred:** No config file support yet.
