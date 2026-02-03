---
name: af-engineer-hook
description: "Creation and configuration of Cursor hooks (hooks.json) to manage agent behavior, command filtering, auditing, and automation. Use this command when you need to: (1) Create a new hook (e.g., for formatting or security checks), (2) Configure hooks.json, (3) Implement logic for blocking or modifying agent actions via scripts."
---

# Af Engineer Hook

## Overview
This command helps design and implement Cursor hooks. Hooks allow you to intercept agent actions (command execution, file read/write, tool usage) and apply rules to them: allow, block (with an explanation), request confirmation, or modify input data.

## Main Workflow

1. **Define the Event**: Choose the appropriate event (e.g., `beforeShellExecution` for terminal control or `afterFileEdit` for post-processing).
2. **Choose Implementation Type**:
   - **Command-based**: A script (Bash, Python, Node.js) that receives JSON and returns JSON.
   - **Prompt-based**: An instruction for the LLM that evaluates the action.
3. **Configure hooks.json**: Add the configuration to `.cursor/hooks.json`.
4. **Implement Logic**: Create the script in `.cursor/hooks/`.

## API Reference
A detailed description of all events, input, and output JSON data is available in [hooks_api.md](references/hooks_api.md).

## Implementation Examples

### 1. Blocking Dangerous Commands (Command-based)
Scenario: Prohibit the execution of `rm -rf` without confirmation.

**hooks.json**:
```json
{
  "hooks": {
    "beforeShellExecution": [
      {
        "command": ".cursor/hooks/guard.sh",
        "matcher": "rm "
      }
    ]
  }
}
```

**guard.sh**:
```bash
#!/bin/bash
input=$(cat)
command=$(echo "$input" | jq -r '.command')

if [[ "$command" == *"rm -rf"* ]]; then
  echo '{"permission": "ask", "user_message": "Are you sure you want to delete this?", "agent_message": "The rm -rf command requires user confirmation."}'
else
  echo '{"permission": "allow"}'
fi
```

### 2. Simple Security Check (Prompt-based)
Scenario: Checking if the agent is trying to send secrets to an external network.

**hooks.json**:
```json
{
  "hooks": {
    "beforeShellExecution": [
      {
        "type": "prompt",
        "prompt": "Check if this command contains sending API keys or passwords via curl/wget. If so, block it.",
        "matcher": "curl|wget"
      }
    ]
  }
}
```

## Resources
- [hooks_api.md](references/hooks_api.md) - Full list of events and data formats.
- `assets/hook_template.sh` - Bash script template for a hook.

## Tips
- Use `matcher` in `hooks.json` so that the hook only runs for relevant commands or tools, saving resources.
- For debugging, check the "Hooks" tab in Cursor settings or the "Hooks" output channel.
- Remember that paths in `.cursor/hooks.json` are specified relative to the project root.
  