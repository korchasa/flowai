#!/bin/bash
# PostToolUse hook: auto-validate SKILL.md structure after edits
# Input: JSON on stdin with tool_input.file_path
# Output: JSON with additionalContext on validation errors, empty stdout if valid

input=$(cat)

# Extract file_path from tool_input
file_path=$(echo "$input" | jq -r '.tool_input.file_path // .tool_input.file // empty' 2>/dev/null)
if [ -z "$file_path" ]; then
  exit 0
fi

# Only validate SKILL.md files inside a skills directory
basename=$(basename "$file_path")
if [ "$basename" != "SKILL.md" ]; then
  exit 0
fi

# Verify path contains /skills/ (framework or installed skills)
if ! echo "$file_path" | grep -qE '/skills/[^/]+/SKILL\.md$'; then
  exit 0
fi

# Get the skill directory (parent of SKILL.md)
skill_dir=$(dirname "$file_path")

# Check if deno is available
if ! command -v deno &>/dev/null; then
  exit 0
fi

# Find validate_skill.ts — check common locations
script=""
for candidate in \
  "framework/devtools/skills/flowai-skill-engineer-skill/scripts/validate_skill.ts" \
  ".claude/skills/flowai-skill-engineer-skill/scripts/validate_skill.ts" \
  ".cursor/skills/flowai-skill-engineer-skill/scripts/validate_skill.ts" \
  ".opencode/skills/flowai-skill-engineer-skill/scripts/validate_skill.ts"; do
  if [ -f "$candidate" ]; then
    script="$candidate"
    break
  fi
done

if [ -z "$script" ]; then
  exit 0
fi

# Run validation
output=$(deno run -A "$script" "$skill_dir" 2>&1)
exit_code=$?

if [ $exit_code -ne 0 ]; then
  json_errors=$(echo "$output" | jq -Rs .)
  cat <<EOF
{"additionalContext": $json_errors}
EOF
fi

exit 0
