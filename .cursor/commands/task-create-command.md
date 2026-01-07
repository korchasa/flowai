---
description: Interactive process to create custom command files following project structure
---

# Create New Command

## Overview
Interactive process to create a custom command file (e.g., `task-*.md`) based on user needs, following the project's standard command structure.

## Todo List

1. **Analyze Request & Context**
   - Understand what the user wants to automate.
   - Check if a similar command already exists in `.cursor/commands/` to avoid duplicates.
   - Identify the scope (personal vs. project-wide).

2. **Conduct Q&A Session (If Needed)**
   - If the user's request is vague or missing details, **STOP** and ask clarifying questions.
   - Key information needed:
     - **Goal**: What is the primary purpose?
     - **Steps**: What are the specific actionable steps?
     - **Validation**: How do we know it's done? (Checklist items)
     - **Constraints**: Any specific rules or restricted actions?
     - **Output**: specific format required?
   - *Example Question*: "What are the exact steps you usually take to perform this task manually?"

3. **Draft Command Structure**
   - The command **MUST** follow this standard template:
     ```markdown
     ---
     description: [Active verb] [Action description]
     ---

     # [Command Title]

     ## Overview
     [Brief description of the command's purpose]

     ## Constraints
     - [Constraint 1]
     - [Constraint 2]

     ## Todo List
     1. **[Step 1 Name]**
        - [Action detail]
        - [Action detail]
     2. **[Step 2 Name]**
        ...

     ## Checklist
     - [ ] [Verification item 1]
     - [ ] [Verification item 2]
     ```

4. **Evaluate and Refine (Prompt Engineering Check)**
   - Critique the draft against these criteria before saving:
     - **Positive Constraints**: Rephrase "Do not X" to "Keep X unchanged" or "Use Y only".
     - **Cognitive Load**: Ensure steps are atomic and don't require complex "mental math".
     - **Language Policy**:
       - Code, Commits, Documentation: **English**.
       - Chat, Plans, Analysis: **User's Language** (or Hybrid).
     - **No Hidden Rules**: All constraints must be in the "Todo List" or a dedicated "Constraints" section, not hidden in body text.
     - **Technical Abstraction**: Move low-level shell commands (like `mkdir`, `git`) to tools or scripts; keep the prompt focused on logic/decisions.
   - Adjust the draft to fix any violations.

5. **Finalize**
   - Create the file in the appropriate directory (default: `.cursor/commands/`).
   - Inform the user of the command name and how to use it (e.g., "Run by opening the file or typing `@.cursor/commands/task-name.md`").

## Checklist
- [ ] User's intent is clearly understood (Q&A performed if needed).
- [ ] Command file structure matches the standard project template (Frontmatter, Overview, Todo List, Checklist).
- [ ] Filename uses kebab-case `task-name.md` convention.
- [ ] **Prompt Engineering Audit Passed**:
  - [ ] No unnecessary negative constraints.
  - [ ] No hidden instructions.
  - [ ] No cognitive overload.
- [ ] File created.
