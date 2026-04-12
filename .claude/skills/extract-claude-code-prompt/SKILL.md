---
name: extract-claude-code-prompt
description: >-
  Extract Claude Code system prompt from its source code or compiled Bun binary
  into a structured template file. Produces a document mirroring the real API
  request with exact prompt text, ant-only variants, feature-gated sections,
  and minified-variable mappings. Use when extracting, documenting, or comparing
  Claude Code prompt versions.
---

# Extract Claude Code Prompt

Procedure for recovering the complete Claude Code LLM request template from source code (`/Users/korchasa/www/sandbox/claude-code`) or the installed Bun binary (`~/.local/share/claude/versions/<ver>`).

## When to Use

- Extracting system prompt after a Claude Code update
- Comparing prompt changes between versions
- Documenting ant-only vs external user differences
- Creating reference templates for framework development

## Inputs

| Input | Required | Description |
|-------|----------|-------------|
| Source code | One of these | `/Users/korchasa/www/sandbox/claude-code` |
| Binary | One of these | `~/.local/share/claude/versions/<ver>` (Bun Mach-O arm64) |
| Output path | Yes | Where to write the template `.txt` file |

## Key Source Files

| File | Contents |
|------|----------|
| `constants/prompts.ts` | All prompt section functions, `getSystemPrompt()` entry point |
| `constants/system.ts` | CLI prefix variants, attribution header |
| `constants/cyberRiskInstruction.ts` | `CYBER_RISK_INSTRUCTION` constant |
| `utils/api.ts` | `splitSysPromptPrefix()` — how blocks become TextBlockParam[] |
| `services/api/claude.ts` | `buildSystemPromptBlocks()`, `paramsFromContext()`, final API call |
| `context.ts` | `getSystemContext()` (git status), `getUserContext()` (CLAUDE.md, date) |

## Claude Code Prompt Architecture

The system prompt is an **array of strings** assembled by `getSystemPrompt()` in `constants/prompts.ts`.

Before sending to the API, `splitSysPromptPrefix()` in `utils/api.ts` joins them into **3 TextBlockParam objects**:

1. **system[0]**: Attribution header (`x-anthropic-billing-header: ...`) — no cache
2. **system[1]**: Prefix (`"You are Claude Code, Anthropic's official CLI for Claude."`) — cache_control: ephemeral
3. **system[2]**: All remaining sections joined with `\n\n` — cache_control: ephemeral

Additionally, `appendSystemContext()` appends git status as one more element before joining.

User context (CLAUDE.md, date) is sent as **messages[0]** via `prependUserContext()`, wrapped in `<system-reminder>`.

### Section Order (from `getSystemPrompt()`)

Static (globally cacheable):
1. Intro — `getSimpleIntroSection()` — CYBER_RISK + URL warning
2. System — `getSimpleSystemSection()` — tool permissions, hooks, compression
3. Doing tasks — `getSimpleDoingTasksSection()` — code style, security, help
4. Actions — `getActionsSection()` — reversibility, confirmation rules
5. Using tools — `getUsingYourToolsSection()` — dedicated tools vs Bash, TodoWrite
6. Tone and style — `getSimpleToneAndStyleSection()` — emoji, conciseness, format
7. Output efficiency — `getOutputEfficiencySection()` — brevity rules

Dynamic boundary marker: `__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__`

Dynamic (per-session):
8. Session guidance — `getSessionSpecificGuidanceSection()` — Agent, Skill, Explore
9. Memory — `loadMemoryPrompt()` — CLAUDE.md contents
10. Environment — `computeSimpleEnvInfo()` — CWD, platform, model, cutoff
11. Language — optional, from `settings.language`
12. Output Style — optional, from `outputStyleConfig`
13. MCP Instructions — optional, from connected MCP servers
14. Scratchpad — optional, if enabled
15. Function Result Clearing — optional, if CACHED_MICROCOMPACT enabled
16. Summarize Tool Results — always present
17. Git status — from `appendSystemContext()`

### Conditional Variants

| Condition | Gate | Affects |
|-----------|------|---------|
| Anthropic employee | `process.env.USER_TYPE === 'ant'` | Doing tasks, Using tools, Tone, Output style, Session guidance, numeric_length_anchors |
| Opus 4.6 + ant | `quiet_salted_ember` in clientDataCache | Additional `anti_verbosity` section |
| Feature flags | `feature('FLAG_NAME')` | TOKEN_BUDGET, KAIROS/BRIEF, CACHED_MICROCOMPACT, EXPERIMENTAL_SKILL_SEARCH |
| Non-interactive | `getIsNonInteractiveSession()` | Prefix variant, `! <command>` hint removed |
| Fork subagent | `isForkSubagentEnabled()` | Agent tool guidance rewritten |

## Procedure

### Phase 1: Locate Prompt Functions

**From source code:**

1. Read `constants/prompts.ts` — find `getSystemPrompt()` (the entry point returning the string array).
2. Trace each section function it calls.
3. Read `constants/cyberRiskInstruction.ts` for the `CYBER_RISK_INSTRUCTION` constant.
4. Read `utils/api.ts:splitSysPromptPrefix()` to understand how blocks are joined.

**From binary:**

1. Extract strings:
   ```bash
   strings ~/.local/share/claude/versions/<ver> > /tmp/binary-strings.txt
   ```
2. Find prompt anchors:
   ```
   grep -n "You are an interactive agent" /tmp/binary-strings.txt
   grep -n "Executing actions with care" /tmp/binary-strings.txt
   grep -n "# Doing tasks" /tmp/binary-strings.txt
   ```
3. Two forms exist in the binary:
   - **Minified JS** (template literals with variable refs) — preserves assembly logic
   - **Standalone constants** (expanded but fragmented) — easier to read
4. Find the minified prompt functions (one long line with multiple `function` definitions):
   ```
   grep -n "function.*Executing actions with care" /tmp/binary-strings.txt
   ```

### Phase 2: Resolve Minified Variables

Claude Code binary is bundled by Bun — all names are minified.

1. Find tool name assignments:
   ```bash
   grep -o 'var [A-Za-z0-9_]*="Bash"' /tmp/binary-strings.txt
   grep -o 'var [A-Za-z0-9_]*="Read"' /tmp/binary-strings.txt
   # repeat for Edit, Write, Glob, Grep, Agent, Skill, AskUserQuestion, TodoWrite, TaskCreate
   ```
2. Match function names by unique content inside each function.
3. Find feature gate strings:
   ```bash
   grep "quiet_salted_ember\|USER_TYPE\|feature(" /tmp/binary-strings.txt | head -20
   ```

### Phase 3: Extract and Assemble

1. Extract exact text of each section (both default and ant-only variants).
2. Assemble into the output format — see [references/output-format.md](references/output-format.md).
3. Header: `time: <build_time>\nversion: <version>` only.
4. Show JSON skeleton of the API request, then the actual content of each `system[N]` block.
5. Prompt sections flow continuously (joined with `\n\n`), no artificial dividers.
6. Use `{{PLACEHOLDER}}` for runtime values, `{{[ANT-ONLY] ...}}` for ant variants, `{{If condition:}}` for optional sections.

### Phase 4: Verify

1. Compare 3+ anchor strings against the live system prompt in the current conversation.
2. Check version matches: `claude --version` vs template header.
3. Verify tool names resolved correctly by comparing against tool definitions in the current session.

## Checklist

- [ ] All 17 sections extracted in order
- [ ] Dynamic boundary identified
- [ ] Ant-only variants documented for each affected section
- [ ] Opus 4.6 `anti_verbosity` section captured
- [ ] Tool names resolved from minified variables
- [ ] Messages[0] prepended context format documented
- [ ] Git status appended to system prompt
- [ ] API parameters (model, max_tokens, thinking) documented
- [ ] Cross-verified against live prompt
