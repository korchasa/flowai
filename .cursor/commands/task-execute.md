---
description: Execute task in Autonomous Mode using strict TDD with documentation updates
---

# Task Execution

## Overview
Execute a task in Autonomous Mode using strict TDD, keeping documentation updated and the project clean.

## Todo List
1. **Preparation**
   - Read all docs in `./documents`
   - Review the task in `./documents/whiteboard.md`

2. **Implement with TDD**
   - Work incrementally in TDD manner: write a failing test, implement minimal code, make it pass, refactor
   - Continuously update progress in `./documents/whiteboard.md`
   - Add/update comments at file, function, and critical code blocks

3. **Quality gate**
   - Run `./run check` to gather all errors/warnings/lints
   - Fix all issues; repeat until clean

## Checklist
- [ ] Docs read and task reviewed
- [ ] Work done via TDD with incremental code changes
- [ ] Progress reflected in `whiteboard.md`
- [ ] Code/comment quality meets standards
- [ ] `./run check` passes cleanly
