#!/bin/bash
# PostToolUse hook: auto-lint ts/js/py files after Write/Edit
# Input: JSON on stdin with tool_input.file_path
# Output: JSON with additionalContext on lint errors, empty stdout if clean

input=$(cat)

# Extract file_path from tool_input
file_path=$(echo "$input" | jq -r '.tool_input.file_path // .tool_input.file // empty' 2>/dev/null)
if [ -z "$file_path" ] || [ ! -f "$file_path" ]; then
  exit 0
fi

# Determine file extension
ext="${file_path##*.}"

errors=""

case "$ext" in
  ts|tsx|js|jsx)
    # Check if deno is available
    if ! command -v deno &>/dev/null; then
      exit 0
    fi
    # Run formatter check and linter
    fmt_out=$(deno fmt --check "$file_path" 2>&1) || errors="Format issues:\n$fmt_out"
    lint_out=$(deno lint "$file_path" 2>&1) || errors="${errors:+$errors\n\n}Lint issues:\n$lint_out"
    ;;
  py)
    # Check if ruff is available
    if ! command -v ruff &>/dev/null; then
      exit 0
    fi
    lint_out=$(ruff check "$file_path" 2>&1) || errors="Lint issues:\n$lint_out"
    ;;
  *)
    # Not a supported file type
    exit 0
    ;;
esac

if [ -n "$errors" ]; then
  # Return errors as additionalContext for the agent to see and fix
  json_errors=$(echo -e "$errors" | jq -Rs .)
  cat <<EOF
{"additionalContext": $json_errors}
EOF
fi

exit 0
