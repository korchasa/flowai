---
description: Analyze and answer user questions in Autonomous Mode by reading documentation and inspecting codebase
---
# Task Answer

## Overview
Analyze and answer a user's question in Autonomous Mode by carefully reading documentation and inspecting the codebase. For large responses, save detailed analysis to `documents/whiteboard.md`.

## Todo List
1. **Understand the question**
   - Read all available docs in `./documents` (SRS, SDS, file structure, manuals, whiteboard) if they exist
   - Clarify and restate the user's question in a more precise and structured form
   - Ask the user follow-up questions if the task, constraints, or expected output are not fully clear
   - Explicitly list assumptions, missing details, and the intended scope of the answer

2. **Documentation-based analysis**
   - Map the question to relevant requirements in `documents/requirements.md` (SRS)
   - Map the question to relevant design decisions in `documents/design.md` (SDS)
   - Consider architecture, constraints, and interfaces described in the documentation

3. **Code analysis**
   - Locate relevant files, modules, and functions in the codebase
   - Read and understand current implementation and its behavior in the context of the question
   - Cross-check implementation against requirements and design to identify matches, gaps, or inconsistencies

4. **Answer synthesis**
   - Formulate a clear, structured answer in the language of the original question (reports should be in the language of the query unless user explicitly requests otherwise)
   - Explain how the existing code and design relate to the question and requirements
   - Highlight limitations, edge cases, and potential improvements where relevant
   - If critical uncertainties remain, clearly state them and explicitly ask the user for additional input instead of guessing
   - For large responses (>1000 characters), save detailed analysis to `documents/whiteboard.md` and provide summary in chat

5. **Constraints**
   - Do **not** modify any files in the repository except `documents/whiteboard.md` for large responses
   - Do **not** use tools or commands that change the working tree or project configuration
   - Use tools only in read-only ways (e.g., reading files, searching code, inspecting diagnostics) unless saving to whiteboard

## Checklist
- [ ] Documentation read (where available) and question clarified
- [ ] Necessary clarification questions asked to the user (if needed)
- [ ] Relevant code located and analyzed
- [ ] Answer formulated and structured
- [ ] Response saved to `documents/whiteboard.md` if large, otherwise provided directly


