# Hook Event Mapping: Cursor → Claude Code

## Event Names

| Cursor event | Claude Code event | Recommended `matcher` | Notes |
| :--- | :--- | :--- | :--- |
| `beforeShellExecution` | `PreToolUse` | `"Bash"` | Fires before every shell command |
| `afterShellExecution` | `PostToolUse` | `"Bash"` | Fires after successful shell command |
| `preToolUse` | `PreToolUse` | — | Fires before any tool |
| `postToolUse` | `PostToolUse` | — | Fires after any tool succeeds |
| `postToolUseFailure` | `PostToolUseFailure` | — | Fires after tool failure |
| `sessionStart` | `SessionStart` | — | Session start/resume |
| `sessionEnd` | `SessionEnd` | — | Session end |
| `subagentStart` | `SubagentStart` | — | Before subagent spawns |
| `subagentStop` | `SubagentStop` | — | After subagent completes |
| `stop` | `Stop` | — | Main agent finishes responding |
| `preCompact` | `PreCompact` | — | Before context compaction |
| `afterFileEdit` | `PostToolUse` | `"Edit\|Write"` | After file write/edit |
| `beforeSubmitPrompt` | `UserPromptSubmit` | — | Before prompt is processed |
| `beforeMCPExecution` | `PreToolUse` | `"mcp__.*"` | Before any MCP tool |
| `afterMCPExecution` | `PostToolUse` | `"mcp__.*"` | After any MCP tool |
| `beforeReadFile` | `PreToolUse` | `"Read"` | Before file read |

Claude Code additional events (no Cursor equivalent): `PermissionRequest`, `Notification`, `TeammateIdle`, `TaskCompleted`.

## Structure Transform

**Cursor (`hooks.json`):**
```json
{
  "version": 1,
  "hooks": {
    "beforeShellExecution": [
      { "command": ".cursor/hooks/logger.sh" }
    ]
  }
}
```

**Claude Code (inside `settings.json`):**
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": ".claude/hooks/logger.sh" }
        ]
      }
    ]
  }
}
```

Key differences:
- Cursor: flat array of handler objects per event.
- Claude Code: array of **matcher groups**, each containing an inner `hooks` array of handlers.
- `type: "command"` is required in Claude Code (also supports `"prompt"` and `"agent"`).
- `matcher` is a regex; omit to match all occurrences of the event.

## Hook Response Mapping

| Cursor stdout | Claude Code equivalent |
| :--- | :--- |
| `{ "decision": "allow" }` | `exit 0` (allow) |
| `{ "decision": "deny" }` | `exit 2` + error message to stderr |
| `{ "decision": "ask" }` | `hookSpecificOutput.permissionDecision: "ask"` |

Claude Code `PreToolUse` full allow/deny output format:
```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Reason shown to Claude"
  }
}
```
