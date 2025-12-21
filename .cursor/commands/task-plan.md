---
description: Create critiqued plan in whiteboard.md with options analysis and Definition of Done
---

# Task Planning

## Overview
Create a clear, critiqued plan in `./documents/whiteboard.md` with options analysis and DoD, then stop for execution.

## Always
- On <STOP> command, MUST stop the planning and MUST wait for user input.
- MUST NOT write any code, test, or documentation during planning phase.
- MUST use the user's query language for all conversation and the plan.
- MUST NOT edit any files in the project except `./documents/whiteboard.md`.

## Todo List
1. **Read all docs in `./documents`**
2. **Analyze and restate the user query**
If the user query contains an internal contradiction, tell the user about it and ask them to resolve it.
3. **Collect all relevant information**
   - Analyze the codebase
   - Make a search on the internet
4. **Ask user for missing information and <STOP> for user input**
Do not ask for insignificant information or information that can be easily found by analysis, in code, documentation, on the internet, and so on.
5. **Plan drafting in `whiteboard.md`**
   - Goal: Why are we performing the task? What is the business goal?
   - Overview: What is happening now? Why did the task arise? What is happening around it?
   - Definition of Done: acceptance criteria (include "`./run check` without errors and notices")
   - Resolution options: Generate 3-5 implementation variants with pros/cons, short/long-term consequences, comparison and selection strategy, optimal option.
6. **Critique the plan and resolution options directly in `whiteboard.md`**
7. **Rewrite the plan and resolution options in `whiteboard.md` considering the critique**
8. **Remove the old version and critique and resolution options from `whiteboard.md`**
9. **Ask user to select the optimal resolution option and <STOP> for user input** Do not select optimal resolution option by yourself, ask user to select it!
10. **<FULL_STOP>**

## Checklist
- [ ] Language set according to user query language
- [ ] Documentation read
- [ ] Query restated
- [ ] Facts gathered from all sources
- [ ] Missing information asked for and user input received
- [ ] Plan drafted with Goal/Overview/DoD/Options
- [ ] Resolution options created with pros/cons, short/long-term consequences, comparison and selection strategy, optimal option
- [ ] Resolution options critiqued and rewritten
- [ ] Optimal resolution option selected by user
- [ ] All other resolution options removed from the file
- [ ] no open questions without answers
- [ ] no unselected resolution options
- [ ] Planning phase completed (stop)
