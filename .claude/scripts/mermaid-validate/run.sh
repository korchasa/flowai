#!/bin/bash
# PostToolUse hook: auto-validate Mermaid diagrams after .md/.mmd edits
# Input: JSON on stdin with tool_input.file_path
# Output: JSON with additionalContext on validation errors, empty stdout if valid

input=$(cat)

# Extract file_path from tool_input
file_path=$(echo "$input" | jq -r '.tool_input.file_path // .tool_input.file // empty' 2>/dev/null)
if [ -z "$file_path" ]; then
  exit 0
fi

# Only check .md and .mmd files
ext="${file_path##*.}"
case "$ext" in
  md)
    # Check if file contains mermaid blocks
    if ! grep -q '```mermaid' "$file_path" 2>/dev/null; then
      exit 0
    fi
    ;;
  mmd)
    # .mmd files are always mermaid
    ;;
  *)
    exit 0
    ;;
esac

# Check if deno is available
if ! command -v deno &>/dev/null; then
  exit 0
fi

# Find validate.ts — check common locations
script=""
for candidate in \
  "framework/engineering/skills/flowai-skill-draw-mermaid-diagrams/scripts/validate.ts" \
  ".claude/skills/flowai-skill-draw-mermaid-diagrams/scripts/validate.ts" \
  ".cursor/skills/flowai-skill-draw-mermaid-diagrams/scripts/validate.ts" \
  ".opencode/skills/flowai-skill-draw-mermaid-diagrams/scripts/validate.ts"; do
  if [ -f "$candidate" ]; then
    script="$candidate"
    break
  fi
done

if [ -z "$script" ]; then
  exit 0
fi

# Run validation
output=$(deno run --allow-run --allow-read --allow-write --allow-env "$script" "$file_path" 2>&1)
exit_code=$?

if [ $exit_code -ne 0 ]; then
  json_errors=$(echo "$output" | jq -Rs .)
  cat <<EOF
{"additionalContext": $json_errors}
EOF
fi

exit 0
