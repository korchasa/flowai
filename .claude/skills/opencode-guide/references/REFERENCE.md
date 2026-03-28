# OpenCode Capabilities Reference

> Full information on OpenCode capabilities relevant to this project. Source: [opencode.ai/docs](https://opencode.ai/docs), February 2026.

## 1. File Formats & Locations

### 1.1 Configuration (`opencode.json`)

- **Location**: Project root (`opencode.json`), `~/.config/opencode/opencode.json`, or via `OPENCODE_CONFIG`.
- **Format**: JSON.
- **Purpose**: Central configuration for the OpenCode environment.
- **Schema**:
  ```json
  {
    "model": "gpt-4o",
    "instructions": [
      "AGENTS.md",
      ".cursor/rules/*.md"
    ],
    "mcp": {
      "servers": { ... }
    },
    "agent": { ... },
    "command": { ... }
  }
  ```

### 1.2 AGENTS.md

- **Location**: Project root (`/AGENTS.md`) or global config.
- **Format**: Standard Markdown.
- **Context**: Loaded as high-priority instructions.
- **Purpose**: Global project context, roles, and constraints.

### 1.3 Agents (`.opencode/agents/`)

- **Location**: `.opencode/agents/<name>.md`.
- **Format**: Markdown with YAML frontmatter.
- **Frontmatter Schema**:

| Field         | Type     | Required | Description                                    |
| :------------ | :------- | :------- | :--------------------------------------------- |
| `name`        | string   | Yes      | Agent identifier.                              |
| `description` | string   | Yes      | Agent role and capabilities.                   |
| `model`       | string   | No       | Specific model to use (e.g., "claude-3-opus"). |
| `tools`       | string[] | No       | Whitelist of allowed tools.                    |

- **Example**:
  ```yaml
  ---
  name: "qa-engineer"
  description: "Agent for running tests and checking quality"
  model: "claude-3-opus"
  tools: ["run_tests", "read_file"]
  ---
  ```

### 1.4 Skills (`.opencode/skills/`)

- **Location**: `.opencode/skills/<name>/SKILL.md`.
- **Format**: Markdown with YAML frontmatter.
- **Structure**:
  ```text
  .opencode/skills/<name>/
  ├── SKILL.md          # Definition
  ├── scripts/          # Scripts
  └── assets/           # Resources
  ```
- **Frontmatter Schema**:

| Field         | Type   | Required | Description                  |
| :------------ | :----- | :------- | :--------------------------- |
| `name`        | string | Yes      | Skill identifier.            |
| `description` | string | Yes      | Description of capabilities. |

- **Example**:
  ```yaml
  ---
  name: "git-workflow"
  description: "Handle git operations"
  ---
  ```

### 1.5 Commands (`.opencode/commands/`)

- **Location**: `.opencode/commands/<name>.md`.
- **Format**: Markdown.
- **Invocation**: `/name` in chat.

## 2. Context Architecture

OpenCode manages context through a prioritized loading system:

1. **Project Config** (`opencode.json`): Highest priority. Defines the environment.
2. **Project Rules** (`AGENTS.md`): Specific instructions for the current project.
3. **Global Config** (`~/.config/opencode/opencode.json`): User defaults.
4. **Global Rules** (`~/.config/opencode/AGENTS.md`): User-wide instructions.
5. **Remote Config** (`.well-known/opencode`): Organization-level defaults.

## 3. Component Details

### 3.1 Modes

OpenCode supports distinct modes for different phases of development:

- **Plan Mode**: Read-only. Used for architectural planning, exploring the codebase, and discussing approaches. No file edits are allowed.
- **Build Mode**: Read-write. The standard mode for implementing changes, running commands, and editing files.

### 3.2 MCP Integration

OpenCode fully supports the Model Context Protocol (MCP) for connecting to external tools and data sources.

- **Configuration**: Defined in `opencode.json` under the `mcp` key.
- **Usage**: Tools exposed by MCP servers are automatically available to the agent.

### 3.3 TUI & CLI

OpenCode provides both a Terminal User Interface (TUI) and a Command Line Interface (CLI).

- **CLI**: `opencode start`, `opencode init`, `opencode check`.
- **TUI**: Interactive chat interface with file tree, diff view, and agent controls.
