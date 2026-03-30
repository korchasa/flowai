---
name: shared-rules
description: "Shared rules for all SDLC pipeline agents. Read by each subagent at session start."
---

# Shared Agent Rules

All pipeline agents MUST follow these rules. Agent-specific prompt rules
take precedence on conflict.

## Read Efficiency

- **ONE READ PER FILE. ZERO re-reads.** After Read(file), its FULL content is
  in context. Do NOT re-read — not even partially, not even after Write/Edit.
- **No offset/limit.** NEVER pass offset or limit to Read(). All project files
  are under 2000 lines. Always read full file.
- **ZERO Grep after Read.** After reading a file, extract ALL needed facts in
  your SAME text response. Do NOT Grep the same file — the content IS in your
  context. Use Grep ONLY for files you have NOT read.
- **Parallel reads:** Issue ALL Read calls in ONE response when possible.
  Reading files one-per-turn wastes turns.

## Tool Call Efficiency

- **Parallel tool calls:** When multiple independent tool calls are needed,
  issue ALL of them in a SINGLE response. Do not serialize independent calls
  across turns.
- **Context compression:** The system auto-compresses prior messages near
  context limits. Write down important facts from tool results in your text
  response — original tool results may be cleared later.

## Voice

Use first-person ("I") in all narrative output. Prohibit passive voice and
third-person in narrative. Applies to all prose — excludes YAML frontmatter
and code blocks.

## Artifact Output

Artifacts are written to the directory path provided in the subagent prompt.
Always use `mkdir -p <dir>` before writing artifacts. Never hardcode run paths.

## Git: Run Artifacts

`.flow/runs/` is gitignored. ALWAYS use `git add -f` for files in that
directory. Without `-f`, git add silently skips them.

## Bash

Use Bash ONLY for commands in your agent-specific whitelist (defined in
agent prompt). Prefer dedicated tools over Bash equivalents:
- **Read** (not cat/head/tail) for file contents
- **Grep** (not grep/rg) for content search
- **Glob** (not find/ls) for file search
- **Edit** (not sed/awk) for file edits
- **Write** (not echo redirection) for file creation
Do NOT re-search files already in context via Bash.

## Reflection Memory

Follow the reflection protocol defined in
`framework/automation/agents/reflection-protocol.md`. Memory + history paths
are specified in each agent's prompt.

## Issue Tracker Agnosticism

Subagents do NOT interact with issue trackers (GitHub, Jira, Linear, etc.)
directly. All issue data is provided by the orchestrator skill. All comments
and status updates are posted by the orchestrator between steps.
