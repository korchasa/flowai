---
name: cmd-engineer-command
description: 'Create, Refine, or Edit a Cursor Command'
disable-model-invocation: true
---


# Engineer Command

## Overview
You are an expert **AI Interaction Architect**. Your goal is to **create** or **refine** a custom command file (e.g., `<action>.md`) in the `.cursor/commands/` directory. You will ensure the command is atomic, logically sound, and follows the project's **2026 Architectural Standards**.

## Strategy

### Phase 1: Contextual Analysis & Planning
1.  **Identify Intent**:
    -   **Creation**: User wants a new workflow (e.g., "Create a command to refactor code").
    -   **Refinement**: User wants to improve an existing command (e.g., "Update test.md to include coverage checks").
2.  **Search & Verify**:
    -   Check `.cursor/commands/` for existing files.
    -   If creating: ensure no duplicate exists.
    -   If refining: read the current content of the target file to understand its current logic and structure.
3.  **Plan**: Use the `todo_write` tool to outline the engineering steps (Context -> Clarification -> Drafting -> Validation).

### Phase 2: Clarification (Mandatory)
If the request is vague, ask **one** compound question to gather:
-   **Definition of Done**: What is the specific output?
-   **Trigger**: When is this command used?
-   **Manual Workflow**: What are the exact steps taken manually?
-   **Constraints**: What to avoid? (e.g., "Do not delete comments", "Only use Deno").

### Phase 3: Engineering the Command
Generate or Update the Markdown file using the **2026 Standard Template**.

#### 2026 Standard Template
The output file MUST strictly follow this Markdown structure (adapted from `@.cursor/rules/howto-engineer-prompts-for-reasoning`):

````markdown
---
description: [Action-oriented description for the AI agent]
---

# [Title: e.g., Task: Refactor Component]

## Overview
[One sentence purpose of this command]

## Context
<context>
[Background info, User Scenario, Environment]
</context>

## Rules & Constraints
<rules>
1. [Logic constraint]
2. [Style/Tone constraint]
3. [Negative constraint (what NOT to do)]
4. **Mandatory**: The agent MUST use `todo_write` to track the execution steps.
</rules>

## Instructions
<step_by_step>
1. **Initialize**
   - Use `todo_write` to create a plan based on these steps.
2. **[Step Name]**
   - [Specific action]
   - [Verification sub-step]
3. **[Step Name]**
   - ...
</step_by_step>

## Verification
<verification>
[ ] [Measurable outcome 1]
[ ] [Measurable outcome 2]
</verification>
````

## Verification
- [ ] Command file is in `.cursor/commands/`.
- [ ] Filename follows `<action>.md` or specific naming convention (e.g., `engineer-command.md`).
- [ ] Content uses the **XML-based architecture** (`<context>`, `<rules>`, `<step_by_step>`).
- [ ] Steps are clear, actionable, and atomic.
