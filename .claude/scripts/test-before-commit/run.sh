#!/bin/bash
# PreToolUse hook: run tests before git commit
# Input: JSON on stdin with tool_input.command
# Output: exit 0 = allow, exit 2 = block commit
# Timeout: 600s (10 min)

input=$(cat)

# Extract the command being executed
command=$(echo "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)
if [ -z "$command" ]; then
  exit 0
fi

# Only intercept git commit commands
if ! echo "$command" | grep -qE 'git\s+commit'; then
  exit 0
fi

# Detect test runner and run tests
if [ -f "deno.json" ] || [ -f "deno.jsonc" ]; then
  if command -v deno &>/dev/null; then
    if deno task check 2>&1; then
      exit 0
    else
      echo "Tests failed. Fix issues before committing." >&2
      exit 2
    fi
  fi
elif [ -f "package.json" ]; then
  if command -v npm &>/dev/null; then
    if npm test 2>&1; then
      exit 0
    else
      echo "Tests failed. Fix issues before committing." >&2
      exit 2
    fi
  fi
elif [ -f "Makefile" ]; then
  if command -v make &>/dev/null; then
    if make test 2>&1; then
      exit 0
    else
      echo "Tests failed. Fix issues before committing." >&2
      exit 2
    fi
  fi
fi

# No test runner found — don't block
exit 0
