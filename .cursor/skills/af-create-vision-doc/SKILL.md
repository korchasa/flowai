---
name: af-create-vision-doc
description: Interactive process to create or update Product Vision document
disable-model-invocation: true
---

# Create Product Vision Document

## Overview

Interactive process to create or update the Product Vision document
(`documents/vision.md`) by interviewing the user.

## Context

<context>
The Product Vision document is the North Star for the project, defining target audience, problem statement, and strategic roadmap.
</context>

## Rules & Constraints

<rules>
1. **Template Adherence**: Follow the 7-section vision template strictly.
2. **Interview Mode**: Conduct interview one by one for each section.
3. **Data Safety**: Save current answers to `documents/whiteboard.md` after each step.
4. **Planning**: The agent MUST use `todo_write` to track the execution steps.
</rules>

## Instructions

<step_by_step>

1. **Initialize**
   - Use `todo_write` to create a plan based on these steps.
   - Check if `documents/vision.md` exists and decide whether to update or
     rewrite.
2. **Interview Phase**
   - Conduct interview for each section: Vision Statement, Target Audience,
     Problem Statement, Solution & Differentiators, Business Goals, Strategy &
     Roadmap, Risks & Assumptions.
   - Save progress to `whiteboard.md`.
3. **Drafting Phase**
   - Synthesize answers into the vision template.
   - Present draft to user for review.
4. **Finalization**
   - Incorporate feedback and write to `documents/vision.md`. </step_by_step>

## Verification

<verification>
- [ ] `documents/vision.md` exists.
- [ ] All 7 sections are filled.
- [ ] Vision Statement follows the North Star template.
</verification>
