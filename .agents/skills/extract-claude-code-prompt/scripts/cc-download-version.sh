#!/usr/bin/env bash
# Download a specific Claude Code version and detect its artifact type.
# Usage: cc-download-version.sh <version> [output-dir]
# Example: cc-download-version.sh 2.1.0 /tmp/claude-code-2.1.0
#
# Outputs:
#   - Downloads and extracts the npm package
#   - Prints artifact type (js-bundle or bun-binary) and path

set -euo pipefail

VERSION="${1:?Usage: cc-download-version.sh <version> [output-dir]}"
OUTPUT_DIR="${2:-/tmp/claude-code-${VERSION}}"

echo "Downloading @anthropic-ai/claude-code@${VERSION}..."
mkdir -p "$OUTPUT_DIR"
cd "$OUTPUT_DIR"

npm pack "@anthropic-ai/claude-code@${VERSION}" --quiet 2>/dev/null
TARBALL=$(ls anthropic-ai-claude-code-*.tgz 2>/dev/null | head -1)

if [[ -z "$TARBALL" ]]; then
    echo "Error: failed to download version ${VERSION}" >&2
    exit 1
fi

tar xzf "$TARBALL"
rm -f "$TARBALL"

# Detect artifact type
if [[ -f "package/cli.js" ]]; then
    FILE_TYPE=$(file "package/cli.js")
    if echo "$FILE_TYPE" | grep -q "Mach-O"; then
        ARTIFACT_TYPE="bun-binary"
        ARTIFACT_PATH="$OUTPUT_DIR/package/cli.js"
    elif echo "$FILE_TYPE" | grep -q "script\|text"; then
        ARTIFACT_TYPE="js-bundle"
        ARTIFACT_PATH="$OUTPUT_DIR/package/cli.js"
    else
        ARTIFACT_TYPE="unknown"
        ARTIFACT_PATH="$OUTPUT_DIR/package/cli.js"
    fi
elif [[ -f "package/cli" ]]; then
    ARTIFACT_TYPE="bun-binary"
    ARTIFACT_PATH="$OUTPUT_DIR/package/cli"
else
    echo "Error: no cli binary found in package" >&2
    exit 1
fi

echo ""
echo "=== Result ==="
echo "Version:  ${VERSION}"
echo "Type:     ${ARTIFACT_TYPE}"
echo "Path:     ${ARTIFACT_PATH}"
echo "Size:     $(du -h "$ARTIFACT_PATH" | cut -f1)"

# Extract metadata
echo ""
echo "=== Metadata ==="
grep -o 'VERSION:"[^"]*"' "$ARTIFACT_PATH" 2>/dev/null | head -1 || echo "VERSION: (not found in strings)"
grep -o 'BUILD_TIME:"[^"]*"' "$ARTIFACT_PATH" 2>/dev/null | head -1 || echo "BUILD_TIME: (not found in strings)"
