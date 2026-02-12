---
name: af-engineer-hook
description: "Creation and configuration of event hooks/plugins to manage agent behavior, command filtering, auditing, and automation. Works across IDEs (Cursor, Claude Code, OpenCode). Use when you need to: (1) Create a new hook (e.g., for formatting or security checks), (2) Configure hooks/plugins, (3) Implement logic for blocking or modifying agent actions via scripts."
---

# Hook / Plugin Creator

## Overview
This skill helps design and implement event hooks (or plugins). Hooks allow intercepting agent actions (command execution, file read/write, tool usage) and applying rules: allow, block (with explanation), request confirmation, or modify input data.

## IDE Detection and Hook Placement

### Hook Paths by IDE

| IDE | User Hooks | Project Hooks | Format |
|-----|-----------|--------------|--------|
| **Cursor** | `~/.cursor/hooks.json` | `.cursor/hooks.json` | JSON config + shell scripts |
| **Claude Code** | `~/.claude/settings.json` | `.claude/settings.json`<br>`.claude/settings.local.json` | JSON config (command + LLM) |
| **OpenCode** | `~/.config/opencode/plugins/*.{js,ts}` | `.opencode/plugins/*.{js,ts}`<br>`opencode.json` `plugin` (npm) | JS/TS modules (event-based) |
| **Antigravity** | - | - | Not supported |
| **OpenAI Codex** | - | - | Not supported |

### Detection Strategy

1. Check for IDE-specific markers:
   - `.cursor/` directory -> Cursor
   - `.claude/` directory -> Claude Code
   - `.opencode/` directory or `opencode.json` -> OpenCode
2. If multiple detected or none -> ask the user

## Main Workflow

1. **Define the Event**: Choose the appropriate event for the target IDE
2. **Choose Implementation Type** (IDE-dependent)
3. **Configure**: Add configuration to the correct location
4. **Implement Logic**: Create the script/plugin

## Cursor Hooks

### Configuration

Hooks in `.cursor/hooks.json`:

```json
{
  "version": 1,
  "hooks": {
    "afterFileEdit": [{ "command": ".cursor/hooks/format.sh" }],
    "beforeShellExecution": [
      { "command": ".cursor/hooks/guard.sh", "matcher": "rm " }
    ]
  }
}
```

### Implementation Types

1. **Command-based**: Shell script receiving JSON via stdin, returning JSON via stdout. Exit code 0 = success, 2 = deny.
2. **Prompt-based**: LLM-evaluated condition.
   ```json
   { "type": "prompt", "prompt": "Is this command safe?", "timeout": 10 }
   ```

### Cursor Events Reference

For detailed event list, input/output JSON formats: see [hooks_api.md](references/hooks_api.md).

### Example: Blocking Dangerous Commands

**guard.sh**:
```bash
#!/bin/bash
input=$(cat)
command=$(echo "$input" | jq -r '.command')
if [[ "$command" == *"rm -rf"* ]]; then
  echo '{"permission": "ask", "user_message": "Are you sure?", "agent_message": "rm -rf requires confirmation."}'
else
  echo '{"permission": "allow"}'
fi
```

## Claude Code Hooks

Configured in `.claude/settings.json` under `hooks` key. Supports both command execution and LLM-based evaluation.

## OpenCode Plugins

OpenCode uses a **plugin system** instead of hook config files.

### Plugin Structure

Plugins are JS/TS files in `.opencode/plugins/` or `~/.config/opencode/plugins/`:

```typescript
// .opencode/plugins/guard.ts
import { plugin } from "@opencode-ai/plugin"

export default plugin({
  name: "guard",
  hooks: {
    "tool.execute.before": async (event) => {
      // inspect event, return modified or block
    },
    "file.edited": async (event) => {
      // run formatter after edit
    }
  }
})
```

### Available Events

| Category | Events |
|----------|--------|
| **Tool execution** | `tool.execute.before`, `tool.execute.after` |
| **Session lifecycle** | `session.created`, `session.idle`, `session.error`, `session.compacted` |
| **File operations** | `file.edited`, `file.watcher.updated` |
| **Messages** | `message.updated`, `message.part.updated` |
| **Permissions** | `permission.asked`, `permission.replied` |
| **Environment** | `shell.env` (inject env variables) |
| **TUI** | `tui.prompt.append`, `tui.command.execute`, `tui.toast.show` |

### npm Plugins

External plugins via `opencode.json`:

```jsonc
{
  "plugin": ["@my-org/opencode-security-plugin"]
}
```

Dependencies managed via `.opencode/package.json`, installed with `bun install` at startup.

## Resources
- [hooks_api.md](references/hooks_api.md) - Cursor hooks: full event list and data formats
- `assets/hook_template.sh` - Bash script template for Cursor hook

## Tips
- **Cursor**: Use `matcher` so hooks only fire for relevant commands
- **Cursor**: Debug via "Hooks" tab in settings or "Hooks" output channel
- **OpenCode**: Plugin dependencies go in `.opencode/package.json`
- **All**: Paths are relative to project root
