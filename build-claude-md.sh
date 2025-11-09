#!/bin/bash
set -e

RULES_DIR=".cursor/rules"
OUTPUT_FILE="CLAUDE.md"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Building CLAUDE.md from ${RULES_DIR}/*.mdc files...${NC}\n"

# 1. Validate input
if [ ! -d "$RULES_DIR" ]; then
    echo -e "${RED}Error: Directory ${RULES_DIR} does not exist${NC}"
    exit 1
fi

mdc_count=$(find "$RULES_DIR" -maxdepth 1 -name "*.mdc" 2>/dev/null | wc -l)
if [ "$mdc_count" -eq 0 ]; then
    echo -e "${RED}Error: No .mdc files found in ${RULES_DIR}${NC}"
    exit 1
fi

# 2. Process files
remove_frontmatter() {
    local file="$1"
    awk '
        BEGIN { in_frontmatter=0; after_frontmatter=0 }
        /^---$/ {
            if (NR == 1) { in_frontmatter=1; next }
            if (in_frontmatter) { in_frontmatter=0; after_frontmatter=1; next }
        }
        { if (!in_frontmatter && after_frontmatter) print }
        { if (NR > 1 && !in_frontmatter && !after_frontmatter) print }
    ' "$file"
}

# Initialize output file
echo "# Project Instructions" > "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Track categories and files
declare -A categories
categories["main"]=0
categories["rules"]=0
categories["howto"]=0
categories["docs"]=0
categories["commands"]=0
categories["other"]=0

# 3. Categorize files
main_file=""
declare -a rules_files=()
declare -a howto_files=()
declare -a docs_files=()
commands_file=""
declare -a other_files=()

for file in "$RULES_DIR"/*.mdc; do
    [ -f "$file" ] || continue
    basename=$(basename "$file")

    if [ "$basename" = "main.mdc" ]; then
        main_file="$file"
        categories["main"]=1
    elif [[ "$basename" == rules-*.mdc ]]; then
        rules_files+=("$file")
        categories["rules"]=1
    elif [[ "$basename" == howto-*.mdc ]]; then
        howto_files+=("$file")
        categories["howto"]=1
    elif [[ "$basename" == docs-*.mdc ]]; then
        docs_files+=("$file")
        categories["docs"]=1
    elif [ "$basename" = "run-commands.mdc" ]; then
        commands_file="$file"
        categories["commands"]=1
    else
        other_files+=("$file")
        categories["other"]=1
    fi
done

# Sort arrays
IFS=$'\n' rules_files=($(sort <<<"${rules_files[*]}"))
IFS=$'\n' howto_files=($(sort <<<"${howto_files[*]}"))
IFS=$'\n' docs_files=($(sort <<<"${docs_files[*]}"))
IFS=$'\n' other_files=($(sort <<<"${other_files[*]}"))
unset IFS

# 4. Build CLAUDE.md

# Main section
if [ -n "$main_file" ]; then
    echo -e "${BLUE}Processing main.mdc...${NC}"
    remove_frontmatter "$main_file" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
fi

# Rules section
if [ ${#rules_files[@]} -gt 0 ]; then
    echo -e "${BLUE}Processing ${#rules_files[@]} rules files...${NC}"
    echo "## Rules" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    for file in "${rules_files[@]}"; do
        basename=$(basename "$file" .mdc)
        echo "### ${basename#rules-}" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
        remove_frontmatter "$file" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
    done
fi

# How-To section
if [ ${#howto_files[@]} -gt 0 ]; then
    echo -e "${BLUE}Processing ${#howto_files[@]} howto files...${NC}"
    echo "## How-To Guides" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    for file in "${howto_files[@]}"; do
        basename=$(basename "$file" .mdc)
        echo "### ${basename#howto-}" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
        remove_frontmatter "$file" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
    done
fi

# Docs section
if [ ${#docs_files[@]} -gt 0 ]; then
    echo -e "${BLUE}Processing ${#docs_files[@]} docs files...${NC}"
    echo "## Documentation Standards" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    for file in "${docs_files[@]}"; do
        basename=$(basename "$file" .mdc)
        echo "### ${basename#docs-}" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
        remove_frontmatter "$file" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
    done
fi

# Commands section
if [ -n "$commands_file" ]; then
    echo -e "${BLUE}Processing run-commands.mdc...${NC}"
    echo "## Commands" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    remove_frontmatter "$commands_file" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
fi

# Other section
if [ ${#other_files[@]} -gt 0 ]; then
    echo -e "${BLUE}Processing ${#other_files[@]} additional files...${NC}"
    echo "## Additional Rules" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    for file in "${other_files[@]}"; do
        basename=$(basename "$file" .mdc)
        echo "### $basename" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
        remove_frontmatter "$file" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
    done
fi

# 5. Report
echo ""
echo -e "${GREEN}✓ CLAUDE.md successfully generated!${NC}"
echo ""
echo "Processed files:"
[ -n "$main_file" ] && echo "  • Main: main.mdc"
[ ${#rules_files[@]} -gt 0 ] && echo "  • Rules: ${#rules_files[@]} files"
[ ${#howto_files[@]} -gt 0 ] && echo "  • How-To: ${#howto_files[@]} files"
[ ${#docs_files[@]} -gt 0 ] && echo "  • Docs: ${#docs_files[@]} files"
[ -n "$commands_file" ] && echo "  • Commands: run-commands.mdc"
[ ${#other_files[@]} -gt 0 ] && echo "  • Additional: ${#other_files[@]} files"
echo ""
total=$((${categories["main"]} + ${#rules_files[@]} + ${#howto_files[@]} + ${#docs_files[@]} + ${categories["commands"]} + ${#other_files[@]}))
echo "Total: $total files processed"
echo "Output: ./$OUTPUT_FILE"
