---
description: Write IDE Skill file
---

# Task: Write Skill

## Overview
Transform vague user intentions into high-precision engineering prompts (Skills).

## Context
<context>
"Agentic First" paradigm where prompts are instructions for autonomous agents.
</context>

## Rules & Constraints
<rules>
1. **XML Isolation**: Use XML tags for prompt sections.
2. **Unambiguity**: Avoid metaphors; if not described, it is prohibited.
3. **Planning**: The agent MUST use `todo_write` to track the execution steps.
</rules>

## Instructions
<step_by_step>
1. **Initialize**
   - Use `todo_write` to create a plan based on these steps.
2. **Discovery**
   - Conduct Q&A loop to gather Role, Goal, Inputs, and Tools.
3. **Drafting**
   - Apply R.C.T.F.S. framework and standard template.
   - Include Chain of Thought and Few-Shot examples.
4. **Refinement**
   - Check against constraints and negative prompts.
</step_by_step>

## Verification
<verification>
- [ ] XML tags used for semantic blocks.
- [ ] Chain of Thought is mandatory.
- [ ] Output format strictly defined.
</verification>
