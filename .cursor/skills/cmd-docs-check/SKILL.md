---
name: cmd-docs-check
description: Analyze documentation and code to identify contradictions and inconsistencies.
disable-model-invocation: true
---


# Task: Check Consistency (Code vs. Docs)

## Overview
Perform a deep analysis of the project's documentation and source code to identify areas where the implementation deviates from the specified design, requirements, or architecture.

## Context
<context>
Codebases often drift from their documentation over time. This command is designed to audit the alignment between "what is written" (docs) and "what is built" (code). The goal is to catch outdated documentation or incorrect implementations by highlighting contradictions.
Target directories for docs usually include `documents/` or root `*.md` files.
</context>

## Rules & Constraints
<rules>
1. **Evidence-Based**: You must cite specific lines from both the documentation and the code to prove a contradiction.
2. **Deep Analysis**: Do not just check for matching keywords. specific logic, data structures, and workflows must be compared.
3. **No Hallucinations**: If you are unsure if a contradiction exists, state it as a "potential discrepancy" rather than a definite error.
4. **Mandatory**: The agent MUST use `todo_write` to track the execution steps.
5. **Output Format**: Group findings by "High Confidence Contradictions" and "Potential Ambiguities".
</rules>

## Instructions
<step_by_step>
1. **Initialize & Plan**
   - Use `todo_write` to create a plan.
   - Identify which documentation files are relevant (e.g., `documents/requirements.md`, `design.md`, `README.md`).
   - Identify key source code directories.

2. **Extract Claims**
   - Read the documentation to extract specific "claims" or "specifications" (e.g., "The user must be logged in to view X", "Data is stored in format Y").
   - Create a list of these verifiable claims.

3. **Verify Implementation**
   - For each key claim, search the codebase using `codebase_search` or `grep` to find the corresponding implementation.
   - Analyze specific logic flow or data structure definitions.

4. **Compare & Detect**
   - Compare the documented behavior with the actual code behavior.
   - Look for:
     - Missing features mentioned in docs.
     - Features implemented differently than described.
     - Deprecated terminology or architectural patterns in docs that no longer exist in code.

5. **Report Findings**
   - Generate a report listing the contradictions.
   - Format:
     - **Documentation Claim**: [Quote] (File: ...)
     - **Code Reality**: [Quote/Logic] (File: ...)
     - **Analysis**: Why this is a contradiction.
</step_by_step>

## Verification
<verification>
[ ] Identified at least one documentation file to check.
[ ] Extracted specific claims to verify.
[ ] Cited code evidence for every reported contradiction.
[ ] Grouped findings by confidence level.
</verification>
