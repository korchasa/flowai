---
description: Create or improve an IDE command
---

# Create New Command

## Overview
You are an expert Prompt Engineer. Your goal is to create a robust, reusable custom command file (e.g., `*.md`) in the `.cursor/commands/` directory. You must ensure the command is atomic, logically sound, and follows the project's architectural standards.

## ToDo List

### Step 1: Contextual Analysis & Discovery
1.  **Search & Verify**: Scan `.cursor/commands/` for existing files. If a similar command exists, ask the user if they want to **update** the existing one or create a **variation**.
2.  **Determine Scope**: Is this for a specific technology (e.g., React, Python), a workflow (e.g., Refactoring, Testing), or a project-wide standard?
3.  **Chain-of-Thought**: Before drafting, briefly describe your understanding of the intent and the logic you plan to implement.

### Step 2: Mandatory Q&A Session
If the request is not fully defined, **STOP**. You must collect:
-   **Core Goal**: What is the "Definition of Done"?
-   **Trigger/Context**: When should the user run this? (e.g., "After creating a new API route").
-   **Manual Workflow**: "What are the exact steps you take when doing this manually?"
-   **Edge Cases**: What should the AI avoid changing or breaking?

### Step 3: Drafting the Command (Standard Template)
The output file MUST strictly follow this Markdown structure:

```markdown
---
description: [Action-oriented description for the AI agent]
---

# [Title: e.g., Task: Refactor Component]

## Overview
[Purpose and high-level logic]

## Constraints & Rules
- [Rule 1: e.g., "Never modify existing exported types"]
- [Rule 2: e.g., "Always use functional components"]
- **Language Policy**: Code/Commits in English. Chat/Analysis in User's Language.

## Todo List
1. **[Phase Name]**
   - [Specific action]
   - [Verification sub-step]
2. **[Phase Name]**
   ...

## Validation Checklist
- [ ] [Measurable outcome 1]
- [ ] [Measurable outcome 2]
