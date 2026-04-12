---
name: extract-claude-code-prompt
description: >-
  Extract Claude Code system prompt from its compiled Bun binary into a
  structured template file. Produces a document mirroring the real API request
  with exact prompt text, ant-only variants, feature-gated sections, and
  minified-variable mappings. Use when extracting, documenting, or comparing
  Claude Code prompt versions.
---

# Extract Claude Code Prompt

Procedure for recovering the complete Claude Code LLM request template from the Bun binary.

## When to Use

- Extracting system prompt after a Claude Code update
- Comparing prompt changes between versions
- Documenting ant-only vs external user differences

## Inputs

| Input | Required | Description |
|-------|----------|-------------|
| Binary path | Yes | Bun Mach-O arm64, ~200MB. Find via: `which claude` → follow symlink → `~/.local/share/claude/versions/<ver>` |
| Output path | Yes | Where to write the template `.txt` file |

## Claude Code Prompt Architecture

The system prompt is an **array of strings** assembled internally.

Before sending to the API, they are joined into **3 TextBlockParam objects**:

1. **system[0]**: Attribution header (`x-anthropic-billing-header: ...`) — no cache
2. **system[1]**: Prefix (`"You are Claude Code, Anthropic's official CLI for Claude."`) — cache_control: ephemeral
3. **system[2]**: All remaining sections joined with `\n\n` — cache_control: ephemeral

Additionally, git status is appended as one more element before joining.

User context (CLAUDE.md, date) is sent as **messages[0]**, wrapped in `<system-reminder>`.

### Section Order

Static (globally cacheable):
1. Intro — CYBER_RISK + URL warning
2. System — tool permissions, hooks, compression
3. Doing tasks — code style, security, help
4. Actions — reversibility, confirmation rules
5. Using tools — dedicated tools vs Bash, TodoWrite
6. Tone and style — emoji, conciseness, format
7. Output efficiency — brevity rules

Dynamic boundary marker: `__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__`

Dynamic (per-session):
8. Session guidance — Agent, Skill, Explore
9. Memory — CLAUDE.md contents
10. Environment — CWD, platform, model, cutoff
11. Language — optional, from `settings.language`
12. Output Style — optional, from `outputStyleConfig`
13. MCP Instructions — optional, from connected MCP servers
14. Scratchpad — optional, if enabled
15. Function Result Clearing — optional, if CACHED_MICROCOMPACT enabled
16. Summarize Tool Results — always present
17. Git status — appended last

### Conditional Variants

| Condition | Gate | Affects |
|-----------|------|---------|
| Anthropic employee | `USER_TYPE === 'ant'` | Doing tasks, Using tools, Tone, Output style, Session guidance, numeric_length_anchors |
| Opus 4.6 + ant | `quiet_salted_ember` in clientDataCache | Additional `anti_verbosity` section |
| Feature flags | `feature('FLAG_NAME')` | TOKEN_BUDGET, KAIROS/BRIEF, CACHED_MICROCOMPACT, EXPERIMENTAL_SKILL_SEARCH |
| Non-interactive | `isNonInteractiveSession()` | Prefix variant, `! <command>` hint removed |
| Fork subagent | `isForkSubagentEnabled()` | Agent tool guidance rewritten |

## Procedure

### Phase 1: Extract Strings from Binary

1. Find the binary:
   ```bash
   which claude                 # → ~/.local/bin/claude (symlink)
   ls -la $(which claude)       # → follow to ~/.local/share/claude/versions/<ver>
   claude --version             # → e.g. 2.1.104
   ```
2. Extract all strings (~350K lines for a ~200MB binary):
   ```bash
   strings ~/.local/share/claude/versions/<ver> > /tmp/binary-strings.txt
   wc -l /tmp/binary-strings.txt
   ```
3. Find prompt anchors:
   ```bash
   grep -n "You are an interactive agent" /tmp/binary-strings.txt
   grep -n "Executing actions with care" /tmp/binary-strings.txt
   grep -n "# Doing tasks" /tmp/binary-strings.txt
   ```

### Phase 2: Navigate the Binary Strings

Strings exist in **two forms** — choose the right one:

| Form | Location | Pros | Cons |
|------|----------|------|------|
| **Minified JS** | ~line 139K | Complete assembly logic, all conditionals visible | Variable names mangled, one huge line |
| **Standalone constants** | ~line 200K | Already expanded, human-readable | Fragmented — tool names replaced by empty strings, sections split across lines |

**Prefer the minified JS form** — it preserves the complete assembly logic including conditional branches. Use standalone constants only for cross-referencing.

To find the minified JS block, look for very long lines containing multiple function definitions:
```bash
grep -n "function.*Executing actions with care" /tmp/binary-strings.txt
```

The prompt functions typically cluster in one line of 5000+ characters. Check line sizes to confirm:
```bash
sed -n '<line_number>p' /tmp/binary-strings.txt | wc -c
```

### Phase 3: Extract Metadata

Find the MACRO object containing version and build time:
```bash
grep -o 'VERSION:"[^"]*"' /tmp/binary-strings.txt | head -3
grep -o 'BUILD_TIME:"[^"]*"' /tmp/binary-strings.txt | head -3
```

This yields the header values: `time: <BUILD_TIME>`, `version: <VERSION>`.

### Phase 4: Resolve Minified Variables

1. Find tool name assignments:
   ```bash
   grep -o 'var [A-Za-z0-9_]*="Bash"' /tmp/binary-strings.txt
   grep -o 'var [A-Za-z0-9_]*="Read"' /tmp/binary-strings.txt
   # repeat for Edit, Write, Glob, Grep, Agent, Skill, AskUserQuestion, TodoWrite, TaskCreate
   ```
2. Match function names by unique content inside each function body.
3. Find ant-only gate — search for the `quiet_salted_ember` string:
   ```bash
   grep "quiet_salted_ember" /tmp/binary-strings.txt | head -5
   ```
   The function that checks this value (e.g., `wJH(H)`) is the ant-detection gate — trace its usage to find all ant-only branches.

### Phase 5: Extract and Assemble

1. Extract exact text of each section (both default and ant-only variants).
2. Assemble into the output format — see [references/output-format.md](references/output-format.md).
3. Header: `time: <build_time>\nversion: <version>` only.
4. Show JSON skeleton of the API request, then the actual content of each `system[N]` block.
5. Prompt sections flow continuously (joined with `\n\n`), no artificial dividers.
6. Use `{{PLACEHOLDER}}` for runtime values, `{{[ANT-ONLY] ...}}` for ant variants, `{{If condition:}}` for optional sections.

### Phase 6: Verify

We are analyzing the binary **from outside** — there is no live Claude Code session to compare against.

1. **Internal consistency**: all 17 sections present and ordered, no gaps between anchors.
2. **Tool name completeness**: every minified variable used in prompt functions has a resolved mapping. Search for unresolved short vars (2-3 chars) in extracted text.
3. **Version match**: `claude --version` (installed) vs MACRO object in binary — confirm they are the same binary.
4. **Compare against previous template**: if a prior version's template exists in `tmp/`, diff to identify changes and verify nothing was accidentally dropped.
5. **Section count**: standalone constants region should contain the same anchor strings (`# System`, `# Doing tasks`, etc.) as the minified JS — cross-reference both forms.

## Checklist

- [ ] Binary found and version confirmed via MACRO object
- [ ] All 17 sections extracted in order
- [ ] Dynamic boundary identified
- [ ] Ant-only variants documented for each affected section
- [ ] Opus 4.6 `anti_verbosity` section captured (via `quiet_salted_ember`)
- [ ] All tool name variables resolved (no unresolved short vars in output)
- [ ] Metadata (version, build time) extracted from MACRO object
- [ ] Messages[0] prepended context format documented
- [ ] Git status appended to system prompt
- [ ] API parameters (model, max_tokens, thinking) documented
- [ ] Cross-referenced minified JS vs standalone constants for consistency
