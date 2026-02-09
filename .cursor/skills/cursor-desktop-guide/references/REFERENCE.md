# Cursor Desktop Capabilities Reference

> Full information on Cursor IDE desktop capabilities relevant to this project. Source: [cursor.com/docs](https://cursor.com/docs), February 2026.

## 1. File Formats & Locations

### 1.1 AGENTS.md
- **Location**: Project root (`/AGENTS.md`) or any subdirectory (`/path/to/dir/AGENTS.md`).
- **Format**: Standard Markdown.
- **Context**: Automatically loaded when working in the directory.
- **Purpose**: High-level context, project goals, architectural constraints.

### 1.2 Rules (`.cursor/rules/`)
- **Location**: `.cursor/rules/*.md` or `.cursor/rules/*.mdc`.
- **Format**: Markdown with optional YAML frontmatter.
- **Frontmatter Schema**:

| Field | Type | Required | Description |
|:---|:---|:---|:---|
| `description` | string | Yes | Context for the agent to decide when to apply this rule. |
| `globs` | string[] | No | List of glob patterns. Rule applies only to matching files. |
| `alwaysApply` | boolean | No | If `true`, rule is always added to context. Default `false`. |

- **Example**:
  ```yaml
  ---
  description: "Standards for writing React components"
  globs: ["**/*.tsx"]
  alwaysApply: false
  ---
  ```

### 1.3 Skills (`.cursor/skills/`)
- **Location**: `.cursor/skills/<skill-name>/SKILL.md`.
- **Format**: Markdown with YAML frontmatter.
- **Structure**:
  ```text
  .cursor/skills/<skill-name>/
  ├── SKILL.md          # Definition
  ├── scripts/          # Executable scripts
  ├── assets/           # Templates, static files
  └── references/       # Documentation
  ```
- **Frontmatter Schema**:

| Field | Type | Required | Description |
|:---|:---|:---|:---|
| `name` | string | Yes | Unique identifier (kebab-case). |
| `description` | string | Yes | Description for agent discovery. |
| `disable-model-invocation` | boolean | No | If `true`, skill can only be invoked manually via command. |

- **Example**:
  ```yaml
  ---
  name: generate-incident-report
  description: "Generates a post-mortem report from chat history"
  disable-model-invocation: false
  ---
  ```

### 1.4 Commands (`.cursor/commands/`)
- **Location**: `.cursor/commands/<name>.md`.
- **Format**: Standard Markdown.
- **Invocation**: `/name` in chat.
- **Content**: Becomes the system prompt for that turn.

### 1.5 Subagents (`.cursor/agents/`)
- **Location**: `.cursor/agents/<name>.md` (Convention).
- **Format**: Markdown with YAML frontmatter.
- **Frontmatter Schema**:

| Field | Type | Required | Description |
|:---|:---|:---|:---|
| `name` | string | Yes | Agent name. |
| `description` | string | Yes | Task description and role definition. |
| `model` | string | No | Suggested model (e.g., "fast", "slow"). |

- **Example**:
  ```yaml
  ---
  name: qa-reviewer
  description: "Reviews code for testing gaps"
  model: "fast"
  ---
  ```

### 1.6 MCP Configuration (`.cursor/mcp.json`)
- **Location**: Project root or `~/.cursor/mcp.json`.
- **Format**: JSON.
- **Schema**:
  ```json
  {
    "mcpServers": {
      "server-name": {
        "command": "npx",
        "args": ["-y", "@server/package"],
        "env": { "KEY": "VALUE" }
      }
    }
  }
  ```

### 1.7 Hooks (`.cursor/hooks.json`)
- **Location**: Project root or `~/.cursor/hooks.json`.
- **Format**: JSON.
- **Schema**:
  ```json
  {
    "hooks": [
      {
        "event": "preToolUse",
        "command": "./scripts/check.sh",
        "matcher": { "tool": "Shell" }
      }
    ]
  }
  ```

## 2. Context Architecture details

Cursor Agent is an LLM agent running inside the IDE. Each user request triggers an agent loop: the model analyzes the context, calls tools (read files, shell commands, MCP), receives results, and generates a response.

**Context Window:**
- Default: 200K tokens
- Max Mode: up to 1M tokens (depends on the model)
- All content (AGENTS.md, rules, read files, MCP responses, chat history) consumes the context window
- When full, compaction occurs — compression of early messages

**Context Loading Order:**
1. Team Rules (if any, highest priority)
2. Project Rules (from `.cursor/rules/`)
3. User Rules (from Cursor Settings)
4. AGENTS.md (from project root and subdirectories)
5. Automatically discovered Skills

## 3. Component Details

### 3.1 Subagents
Isolated AI assistants with their own context window. Launched via Task tool from the main agent.

**Key Properties:**
- **Context isolation:** intermediate data does not clutter main context
- **Parallel execution:** multiple subagents can work simultaneously
- **Clean start:** subagent does not see main conversation history, context must be passed in prompt
- **Model selection:** model is set by parent agent (`model` parameter in Task tool), not in file frontmatter

**Built-in Subagents:**
| Subagent | Purpose | Why Isolated |
|:---|:---|:---|
| **Explore** | Codebase search | Generates voluminous intermediate search results |
| **Bash** | Series of shell commands | Command output is often voluminous |
| **Browser** | Browser control (MCP) | DOM snapshots and screenshots create noise |

### 3.2 MCP Servers
Model Context Protocol — one way to access external services from local Agent Chat. Alternative — CLI tools via Shell tool (jira-cli, glab). MCP is preferred for stateful connections (Slack), CLI — for request-response (Jira, GitLab).

**Three Transport Types:**
| Transport | Where Executed | For Whom |
|:---|:---|:---|
| `stdio` | Locally, Cursor manages process | Single user |
| `SSE` | Locally or remote | Multiple users |
| `Streamable HTTP` | Locally or remote | Multiple users |

**Supported Protocol Capabilities:**
- Tools — functions to execute (main mechanism)
- Prompts — template messages and workflows
- Resources — structured data sources
- Roots — server file system requests
- Elicitation — server requests for additional information from user

**Config interpolation:** variables in `mcp.json`:
- `${env:NAME}` — environment variables
- `${workspaceFolder}` — project root
- `${userHome}` — home directory

### 3.3 Agent Modes

| Mode | Description | Tools | When to Use |
|:---|:---|:---|:---|
| **Agent** | Full access to all tools | All | Main mode: creating files, MCP calls, shell commands |
| **Ask** | Read-only, read and analyze only | Read only | Questions about code without changes |
| **Plan** | Collaborative read-only for planning | Read only | Architectural decisions, work plan |
| **Debug** | Systematic troubleshooting | All + runtime evidence | Investigating errors, unexpected behavior |

Agent can switch modes independently if rules or context suggest another mode is more appropriate.

### 3.4 Hooks
Scripts triggered at specific stages of the agent loop. Communicate via stdin/stdout in JSON format.

**Available Events (Agent Chat):**

| Event | When Triggered | Can Block? |
|:---|:---|:---|
| `sessionStart` | New conversation created | No |
| `sessionEnd` | Conversation ended | No |
| `preToolUse` | Before executing any tool | Yes (`deny`) |
| `postToolUse` | After successful tool execution | No (can modify MCP output) |
| `postToolUseFailure` | Tool failed, timeout or rejected | No |
| `subagentStart` | Before launching subagent | Yes (`deny`) |
| `subagentStop` | Subagent finished | No (can send followup) |
| `beforeShellExecution` | Before shell command | Yes (`deny`, `ask`) |
| `afterShellExecution` | After shell command | No |
| `beforeMCPExecution` | Before MCP call | Yes, **fail-closed** |
| `afterMCPExecution` | After MCP call | No |
| `beforeReadFile` | Before reading file | Yes, **fail-closed** |
| `afterFileEdit` | After editing file | No |
| `beforeSubmitPrompt` | Before sending prompt | Yes (`continue: false`) |
| `preCompact` | Before context compaction | No |
| `stop` | Agent finished loop | No (can send followup) |
| `afterAgentResponse` | After agent response | No |
| `afterAgentThought` | After thinking block | No |

**Two Hook Types:**
- **Command-based** (default): shell script, exit code 0 = ok, 2 = deny
- **Prompt-based**: LLM evaluates natural language condition

**Matcher:** filter determining when hook runs:
- `preToolUse`: by tool type (`Shell`, `Read`, `Write`, `MCP`, `Task`)
- `subagentStart`: by subagent type (`explore`, `shell`, `generalPurpose`)
- `beforeShellExecution`: by command text (regex)

### 3.5 Semantic Search
Built-in search by meaning (not exact text). Cursor indexes project files and allows agent to find relevant content.

**Behavior:**
- Indexes all project files except those in `.cursorignore`
- Agent uses Semantic Search automatically to find context
- Results include chunk signatures (function/class signatures) and full text chunks

### 3.6 Ignore Files (`.cursorignore`)
File in project root, syntax similar to `.gitignore`. Excludes files from:
- Semantic Search indexing
- Automatic inclusion in context
- Codebase-wide analysis

### 3.7 Models
Cursor supports several models with different characteristics:

| Model | Context | Max Mode | Features |
|:---|:---|:---|:---|
| Claude 4.6 Opus | 200K | 1M | Agent, Thinking. Most powerful |
| Claude 4.5 Sonnet | 200K | 1M | Agent, Thinking. Faster than Opus |
| GPT-5.2 | 272K | — | Agent, Thinking |
| Gemini 3 Pro | 200K | 1M | Agent, Thinking |
| Gemini 3 Flash | 200K | 1M | Agent, Thinking. Fast and cheap |

### 3.8 Native Integrations vs MCP
Cursor has "Integrations" section in docs (Slack, GitHub, GitLab, Linear), but they are all entry points for Cloud Agents:

| Integration | What it does | Works locally? |
|:---|:---|:---|
| Slack | `@cursor` in Slack → Cloud Agent | No |
| GitHub | Clone repo, PR for Cloud Agents / Bugbot | No |
| GitLab | Clone repo, MR for Cloud Agents / Bugbot | No |
| Linear | Delegate issues to Cloud Agents | No |

**For local Agent Chat, access to external services is via MCP or CLI tools (Shell tool).** MCP is used for Slack (requires stateful connection). Jira and GitLab are available via CLI tools (jira-cli, glab), which is more compact and reliable than MCP.

### 3.9 Cloud Agents (not used in system)
Formerly called Background Agents. Run agent on isolated Ubuntu VM, clone repo from GitHub/GitLab, work on separate branch, create PR. Require remote repository. Access from Slack (`@cursor prompt`), Linear (delegate issues), GitHub (comment `@cursor` on PR/issue) or Cursor UI.

**Why not used:** system works with local repository without remote. Cloud Agents require GitHub/GitLab App connection for cloning.

### 3.10 @ Mentions
In Agent chat, you can refer to specific files and folders via `@`:
- `@vault/decisions/ADR-001.md` — specific file
- `@projects/` — entire directory
- `@url` — web page

Files from @-mentions are added to request context, even if they wouldn't be included automatically. Useful for pinpointing context.

### 3.11 Inline Edit (Cmd+K)
Quick edit mode directly in file, without Agent Chat. Select text in editor, press Cmd+K, describe change.

**For Second Brain:** Agent Chat is more convenient for:
- Updating task status in `tasks.md`
- Adding item to `inbox.md`
- Quick wording edit in note
- Updating last review date in `vault/areas/`

## 4. Best Practices for Knowledge Management in Cursor

1. **AGENTS.md — entry point, not encyclopedia.** Contains role, key context, and links to data zones. Detailed rules — in rules.
2. **Rules by glob — for formats.** `format-adr` with glob `vault/decisions/**` automatically applies when working with ADR files.
3. **Skills — for multi-step workflows.** Weekly review, incident report, 1:1 prep — each as separate skill with `SKILL.md`.
4. **Commands — for rituals.** `/morning`, `/evening` — simple markdown, quick invocation.
5. **Subagents — only when real need for context isolation.** Do not create subagent for task main agent can solve in one step.
6. **MCP + CLI — two paths to external services.** MCP for stateful connections (Slack), CLI for request-response (jira-cli, glab). Native integrations work only with Cloud Agents.
7. **`.cursorignore` — for Semantic Search cleanliness.** Excludes archive and cache.
8. **Hooks — for process checks, not semantic.** `afterFileEdit` + path check, not "incident closed".
9. **Max Mode — for heavy workflows.** `/weekly` with many MCP calls requires large context.
10. **Batch confirmation — for operations with multiple items.** Table of proposals → one confirmation, not item-by-item.
11. **Checkpoint recovery — for long workflows.** Intermediate results in `.cache/rituals/`, continue from last point.
