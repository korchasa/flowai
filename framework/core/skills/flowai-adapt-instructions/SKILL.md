---
name: flowai-adapt-instructions
description: Use when AGENTS.md is out of sync with the installed template (after `flowai sync` reports it changed, or user asks to re-adapt/realign AGENTS.md). Reads {ide}/assets/AGENTS.template.md, proposes a merge preserving project sections, writes on approval. Do NOT trigger on small edits.
---

# Task: Re-adapt AGENTS.md from Updated Template

## Overview

The project root `AGENTS.md` is derived from a pack-level template distributed with flowai. When the template changes upstream (new rule, renamed section, tightened guidance), the project copy drifts out of sync. This skill brings the project copy back into alignment without losing project-specific content.

## Context

<context>
flowai installs the AGENTS.md template as an asset into the IDE config dir:
- Project mode: `.{ide}/assets/AGENTS.template.md` (e.g. `.claude/assets/AGENTS.template.md`)
- Global mode: `~/.{ide}/assets/AGENTS.template.md` (e.g. `~/.claude/assets/AGENTS.template.md`)

The project artifact at `<cwd>/AGENTS.md` was generated from the template and then customized by the user (project-specific sections: vision, stack, decisions, planning rules). Framework-originated sections (TDD flow, documentation rules, verification rules) MAY be updated upstream; user sections MUST be preserved verbatim.

This skill is the inverse of `flowai-init`: `flowai-init` creates AGENTS.md from scratch; `flowai-adapt-instructions` re-aligns an existing AGENTS.md with an updated template.
</context>

## Rules & Constraints

<rules>
1. **Do NOT duplicate the template inside this skill.** The template lives in `{ide}/assets/AGENTS.template.md`. Read it from there — never inline it.
2. **Do NOT overwrite silently.** Show the diff (or before/after summary) and ask for explicit user confirmation before writing.
3. **Preserve project-specific content.** Sections describing the project's stack, vision, key decisions, and planning rules are user-owned. Touch framework-originated sections only.
4. **Fail loudly on missing template.** If `{ide}/assets/AGENTS.template.md` does not exist, stop and tell the user to run `flowai sync` first.
5. **Cross-IDE path resolution.** Detect which IDE config dir(s) exist and read the template from the first available one. If multiple IDEs have the same template, they should match — if they don't, pick the newest mtime and warn.
6. **Mandatory tracking.** Use the task tracker (todo write, TodoWrite, etc.) to record each step.
</rules>

## Instructions

<step_by_step>

1. **Locate the template.**
   - Check these paths in order and pick the first that exists:
     - `.claude/assets/AGENTS.template.md`
     - `.cursor/assets/AGENTS.template.md`
     - `.opencode/assets/AGENTS.template.md`
     - `.codex/assets/AGENTS.template.md`
     - (global mode) `~/.claude/assets/AGENTS.template.md`, `~/.cursor/assets/AGENTS.template.md`, `~/.config/opencode/assets/AGENTS.template.md`, `~/.codex/assets/AGENTS.template.md`
   - If none exist: tell the user "Template not found. Run `flowai sync` to install the pack assets, then re-run." and stop.

2. **Read the template and the project artifact.**
   - Read the template file content.
   - Read `<cwd>/AGENTS.md`. If it does not exist, tell the user to run `/flowai-init` instead and stop — this skill only re-adapts an existing artifact.

3. **Compute the diff.**
   - Run `git diff --no-index --exit-code <(echo "$template") <(echo "$artifact")` OR in-process string diff via `diff` tool.
   - Identify framework-originated sections that changed: TDD flow, documentation rules, verification rules, coding rules. Use section headers (`## `, `### `) as boundaries.

4. **Classify each diff hunk.**
   - **Framework section changed upstream, not customized in project** → propose replacement with template version.
   - **Framework section changed upstream, also customized in project** → propose merge (take template structure, keep project customizations). Show both versions side by side.
   - **Project-specific section (vision, stack, decisions, planning, etc.)** → leave untouched.
   - **New section in template** → propose addition.
   - **Section removed from template** → ask user whether to keep or remove.

5. **Show the proposed merge.**
   - Print a clean unified diff of proposed changes to AGENTS.md.
   - List, per section, the classification and the action taken.
   - Explain WHY each change is recommended (e.g. "Template adds a CHECK step to TDD flow — aligns with new verification rule.").

6. **Ask for confirmation.**
   - "Apply this merge to AGENTS.md? (y/n/per-section)"
   - If `y`: write the merged content to `<cwd>/AGENTS.md`.
   - If `per-section`: walk hunks one by one, ask approve/skip for each.
   - If `n`: report no-op and stop.

7. **Verify.**
   - After writing, run `diff` again to confirm only intended changes landed.
   - Tell the user: "AGENTS.md re-adapted from `{ide}/assets/AGENTS.template.md`. Review and commit."

</step_by_step>

## Output

End with a one-line status:
- `AGENTS.md re-adapted. N sections updated; M preserved.`
- or `AGENTS.md unchanged. Template and artifact already in sync.`
- or `Aborted by user. AGENTS.md untouched.`
