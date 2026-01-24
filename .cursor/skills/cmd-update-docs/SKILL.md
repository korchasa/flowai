---
name: cmd-update-docs
description: Synchronize project documentation with latest code changes
disable-model-invocation: true
---

# Update Documentation

## Overview

Synchronize project documentation in `./documents` with the latest code changes.

## Context

<context>
The documentation serves as the project's memory. It must be kept accurate and concise.
</context>

## Rules & Constraints

<rules>
1. **Conciseness**: Use combined extractive + abstractive summarization.
2. **English Only**: Content must be in English (except `whiteboard.md`).
3. **Planning**: The agent MUST use `todo_write` to track the execution steps.
</rules>

## Instructions

<step_by_step>

1. **Initialize**
   - Use `todo_write` to create a plan based on these steps.
2. **Preparation**
   - Read existing docs and analyze git changes since last commit.
3. **Update docs**
   - Update all docs (except whiteboard) using compact formats (lists, tables,
     Mermaid).
   - Eliminate filler phrases and prioritize direct language. </step_by_step>

## Verification

<verification>
- [ ] All docs (except whiteboard) updated to current state.
- [ ] Facts preserved; content compressed.
- [ ] Compact formats used where possible.
</verification>
