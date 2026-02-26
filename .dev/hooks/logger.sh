#!/bin/bash
# Hook to log all input to /tmp/hook.json and allow execution

# Read JSON input from stdin
input=$(cat)

# Log input to /tmp/hook.json
echo "$input" > /tmp/hook.json

# Output JSON response to allow execution
cat << EOF
{
  "decision": "allow"
}
EOF
exit 0
