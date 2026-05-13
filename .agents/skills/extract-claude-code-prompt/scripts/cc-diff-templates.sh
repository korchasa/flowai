#!/usr/bin/env bash
# Diff two Claude Code prompt templates, highlighting section-level changes.
# Usage: cc-diff-templates.sh <old-template.txt> <new-template.txt>
#
# Shows:
# 1. Header differences (version, build time)
# 2. Section-level summary (added/removed/changed)
# 3. Full unified diff

set -euo pipefail

OLD="${1:?Usage: cc-diff-templates.sh <old-template.txt> <new-template.txt>}"
NEW="${2:?Usage: cc-diff-templates.sh <old-template.txt> <new-template.txt>}"

if [[ ! -f "$OLD" ]]; then echo "Error: file not found: $OLD" >&2; exit 1; fi
if [[ ! -f "$NEW" ]]; then echo "Error: file not found: $NEW" >&2; exit 1; fi

echo "=== Version comparison ==="
echo "Old: $(head -2 "$OLD")"
echo "New: $(head -2 "$NEW")"
echo ""

echo "=== Section headers ==="
echo "--- Old sections ---"
grep -E '^(#|== )' "$OLD" | head -40
echo ""
echo "--- New sections ---"
grep -E '^(#|== )' "$NEW" | head -40
echo ""

# Sections only in old
OLD_SECTIONS=$(grep -E '^(#|== )' "$OLD" | sort)
NEW_SECTIONS=$(grep -E '^(#|== )' "$NEW" | sort)

REMOVED=$(comm -23 <(echo "$OLD_SECTIONS") <(echo "$NEW_SECTIONS"))
ADDED=$(comm -13 <(echo "$OLD_SECTIONS") <(echo "$NEW_SECTIONS"))

if [[ -n "$REMOVED" ]]; then
    echo "=== Sections REMOVED ==="
    echo "$REMOVED"
    echo ""
fi

if [[ -n "$ADDED" ]]; then
    echo "=== Sections ADDED ==="
    echo "$ADDED"
    echo ""
fi

echo "=== Size comparison ==="
echo "Old: $(wc -l < "$OLD") lines, $(wc -c < "$OLD" | tr -d ' ') bytes"
echo "New: $(wc -l < "$NEW") lines, $(wc -c < "$NEW" | tr -d ' ') bytes"
echo ""

echo "=== Full diff ==="
diff -u "$OLD" "$NEW" || true
