# Cursor Hooks Reference

## Overview
Hooks let you observe, control, and extend the agent loop using custom scripts. They run before or after defined stages of the agent loop and can observe, block, or modify behavior.

## Hook Events Detailed Reference

### Session Lifecycle
- **`sessionStart`**: Called when a new composer conversation is created. Use to set environment variables, inject context, or block session creation.
- **`sessionEnd`**: Called when a composer conversation ends (completed, aborted, error, window_close, user_close). Fire-and-forget.

### Tool Execution
- **`preToolUse`**: Called before ANY tool execution (Shell, Read, Write, MCP, Task, etc.). Can allow/deny or modify input.
- **`postToolUse`**: Called after successful tool execution. Useful for auditing.
- **`postToolUseFailure`**: Called when a tool fails, times out, or is denied.

### Shell & MCP Commands
- **`beforeShellExecution`**: Specifically for terminal commands. Supports `allow`, `deny`, or `ask` (manual user approval).
- **`afterShellExecution`**: Fires after a shell command completes. Includes output and duration.
- **`beforeMCPExecution`**: Specifically for MCP tool calls. Fail-closed behavior.
- **`afterMCPExecution`**: Fires after an MCP tool call completes. Includes result JSON.

### File Operations (Agent)
- **`beforeReadFile`**: Called before the Agent reads a file. Can block access to sensitive files. Fail-closed.
- **`afterFileEdit`**: Fires after the Agent successfully edits a file. Useful for formatters.

### Subagent (Task Tool) Lifecycle
- **`subagentStart`**: Called before spawning a subagent. Can allow/deny.
- **`subagentStop`**: Called when a subagent completes or errors. Can trigger a `followup_message`.

### Agent Loop & UI
- **`beforeSubmitPrompt`**: Called after user hits send but before backend request. Can prevent submission.
- **`afterAgentResponse`**: Called after the agent completes an assistant message.
- **`afterAgentThought`**: Called after the agent completes a thinking block.
- **`preCompact`**: Called before context window compaction/summarization. Observational only.
- **`stop`**: Called when the agent loop ends. Can trigger an automatic `followup_message` to continue the loop.

### Cursor Tab (Inline Completions)
- **`beforeTabFileRead`**: Control file access specifically for Tab completions.
- **`afterTabFileEdit`**: Fires after Tab edits a file. Includes detailed range and line info.

## Configuration
Hooks are defined in `hooks.json`.
- Project: `.cursor/hooks.json` (relative to project root).
- User: `~/.cursor/hooks.json` (relative to `~/.cursor/`).

### hooks.json Example
```json
{
  "version": 1,
  "hooks": {
    "afterFileEdit": [{ "command": ".cursor/hooks/format.sh" }],
    "beforeShellExecution": [
      {
        "command": ".cursor/hooks/approve.sh",
        "matcher": "curl|wget"
      }
    ]
  }
}
```

## Execution Types
1. **Command-Based**: Shell scripts receiving JSON via stdin and returning JSON via stdout.
   - Exit code `0`: Success.
   - Exit code `2`: Block action (deny).
2. **Prompt-Based**: LLM-evaluated condition.
   ```json
   {
     "type": "prompt",
     "prompt": "Is this command safe?",
     "timeout": 10
   }
   ```

## Common Input Fields (JSON)
- `conversation_id`, `generation_id`, `model`, `hook_event_name`, `cursor_version`, `workspace_roots`.
- Hook-specific fields (e.g., `command`, `file_path`, `tool_name`, `tool_input`, `status`, `duration`).

## Common Output Fields (JSON)
- `decision`: "allow" | "deny"
- `reason`: string
- `updated_input`: object (for `preToolUse`)
- `permission`: "allow" | "deny" | "ask" (for `beforeShellExecution`)
- `user_message`, `agent_message`: string
- `followup_message`: string (for `stop` or `subagentStop`)
- `continue`: boolean (for `sessionStart` or `beforeSubmitPrompt`)
- `env`: object (for `sessionStart`)
- `additional_context`: string (for `sessionStart`)
