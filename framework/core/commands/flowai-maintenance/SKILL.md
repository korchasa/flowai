---
name: flowai-maintenance
description: >-
  Two-phase "Lead Engineer" audit: full scan across 8 categories, then interactive issue-by-issue resolution with the user.
---

# Task: Project Maintenance & Health Audit

## Overview

Execute a rigorous 8-category maintenance sweep, then walk the user through each finding interactively. The process has two distinct phases:

- **Scan Phase**: Run all checks silently, collecting findings into an internal list. No fixes during this phase.
- **Resolution Phase**: Present the summary, then iterate through each finding — show details, propose a fix, ask the user for a decision, apply if approved.

## Context

<context>
This command is the "Garbage Collector" and "Building Inspector" for the project. It ensures the codebase remains maintainable, documented, and aligned with architectural standards.

Categories checked:
1.  **Structure**: Files in wrong places.
2.  **Consistency**: Docs vs. Code truth.
3.  **Hygiene**: Dead code, unused imports, weak tests.
4.  **Complexity**: "God objects" and massive functions.
5.  **Debt**: Accumulated TODOs.
6.  **Language**: Inconsistent terminology.
7.  **Doc Coverage**: Missing explanations in code.
8.  **Instruction Coherence**: Contradictions and ambiguities across project instructions.
9.  **Tooling Relevance**: Skills, agents, rules, and hooks that don't match the project.
</context>

## Rules & Constraints

<rules>
1.  **Precision**: Use specific thresholds (e.g., File > 500 lines).
2.  **Constructive**: Every issue must have a proposed fix.
3.  **Holistic**: Scan `documents/`, `.cursor/`, and source code directories.
4.  **Mandatory**: Use a task management tool (e.g., `todo_write`, `todowrite`) to track progress through the phases.
5.  **Language Agnostic**: Adapt checks (imports, syntax, test patterns) to the primary language of the project (TS, JS, Py, Go, etc.).
6.  **No premature fixes**: Do NOT apply any changes during the Scan Phase. Only collect findings.
7.  **User decides**: Every fix requires explicit user approval. Never apply fixes silently.
</rules>

## Instructions

<step_by_step>

### SCAN PHASE

Collect all findings into an internal list. Each finding has: category, file/symbol, problem description, proposed fix, severity (critical/warning).

1. **Initialize & Plan**
   - Use a task management tool (e.g., `todo_write`, `todowrite`) to create a plan covering all scan categories below.
   - Identify project's primary language and source directories.

2. **Category 1: Structural Integrity**
   - **File placement**: Check that all source files reside in expected directories per project conventions (e.g., `src/`, `lib/`, `scripts/`). Flag files at wrong levels.
   - **Dead directories**: Identify empty or orphaned directories with no purpose.
   - **Naming conventions**: Verify file and directory names follow project conventions (case, separators).
   - **Config files**: Ensure project config files (`deno.json`, `package.json`, etc.) are at expected locations.

3. **Category 2: Code Hygiene & Dependencies**
   - **Dead Code**: Identify exported/public symbols in source directories that
     are never imported/called elsewhere.
   - **Unused Imports**: Scan source files for imports/includes that are not
     used in the file body.
   - **Test Quality**: Read test files (e.g., `*.test.*`, `*_test.*`,
     `test_*.py`). Flag tests that:
     - Have no assertions.
     - Use trivial assertions (e.g., `expect(true).toBe(true)`, `assert True`).
     - Are commented out.

4. **Category 3: Complexity & Hotspots**
   - **Files**: Flag any source file exceeding **500 lines**.
   - **Functions**: Scan for functions/methods exceeding **50 lines**.
   - **God Objects**: Identify classes/modules with mixed concerns (e.g.,
     logic + UI + database in one file).

5. **Category 4: Technical Debt Aggregation**
   - **Scan**: Search for `TODO`, `FIXME`, `HACK`, `XXX` tags in the codebase.
   - **Group**: Organize by file/module.
   - **Analysis**: Flag any that look critical or like "temporary" fixes that
     became permanent.

6. **Category 5: Consistency (Docs vs. Code)**
   - **Terminology**: Extract key terms from `README.md` and `documents/`. Check
     if code uses different synonyms (e.g., "User" in docs vs "Customer" in
     code).
   - **Drift**: Pick 3 major claims from `documents/*.md` (e.g., "The system
     handles X asynchronously"). Verify if the code actually does that.

7. **Category 6: Code Documentation Coverage**
   - **Rule**: Every file, class, method, and exported function MUST have
     documentation (JSDoc, Docstring, Rustdoc, etc.).
   - **Check**:
     - **Responsibility**: Does the comment explain _what_ it does?
     - **Nuances**: For complex logic (cyclomatic complexity > 5 or > 20 lines),
       are there examples or edge case warnings?
   - **Scan**: primary source directories.
   - **Report**: List undocumented symbols.

8. **Category 7: Instruction Coherence**
   - **Scope**: Read all instruction files that guide agent/developer behavior:
     `CLAUDE.md` (root and nested), `AGENTS.md` files, `documents/requirements.md`,
     `documents/design.md`, and any rules/conventions files.
   - **Contradictions**: Identify mutually exclusive rules across or within files
     (e.g., "use tabs" in one section vs. "use 2 spaces" in another; "never mock"
     vs. "mock freely").
   - **Ambiguities**: Flag vague or open-ended instructions that could be
     interpreted in conflicting ways by different agents or sessions.
   - **Redundancy**: Note duplicated rules across files that may diverge over time.
   - **Scope conflicts**: Check that nested instruction files (`subdir/CLAUDE.md`)
     don't silently override root-level rules without explicit justification.
   - **Coherence verdict**: For each issue, state which files/sections conflict and
     propose a resolution (keep one, merge, or clarify).

9. **Category 8: Tooling Relevance**
   - **Scope**: Inventory all installed skills (`.claude/skills/`, `.cursor/skills/`),
     agents/subagents (`.claude/agents/`, `.cursor/agents/`), hooks (`.claude/hooks/`,
     `.cursor/hooks/`, `.husky/`), and rules files.
   - **Stack match**: Compare each item against the project's declared tooling stack
     (from `AGENTS.md` or `CLAUDE.md`) and actual source files. Flag items designed
     for a different tech stack (e.g., Django skill in a TypeScript project, Python
     linting hook in a Deno project).
   - **Domain match**: Flag agents/skills targeting a domain absent from the project
     (e.g., Kubernetes deployer agent in a project with no K8s manifests or Dockerfiles).
   - **Stale tooling**: Identify skills/agents/hooks that reference tools, commands,
     or frameworks not present in the project (e.g., hook calling `flake8` when no
     Python files exist).
   - **Verdict**: For each mismatch, state what the item expects vs. what the project
     actually uses, and propose a fix (remove, replace with stack-appropriate
     alternative, or add justification).

### RESOLUTION PHASE

10. **Present Summary**
    - Output the full findings list, grouped by category. Use plain-text category labels (not markdown `#` headings). Skip any category with no findings.
    - Each issue line follows the shape: `- [N] <file/symbol>: <problem>. (Fix: <proposed fix>)`
    - Number every finding sequentially across all categories (e.g., [1], [2], ..., [N]).
    - At the end of the summary, show the total count per category and overall.
    - Example:
      ```
      1. Structural Issues
      - [1] src/oldfile.ts: located in root, should be in src/utils/. (Fix: Move file)

      2. Hygiene & Quality
      - [2] utils.ts: unused export `myFunc`. (Fix: Delete)
      - [3] main.ts: 550 lines, exceeds 500-line limit. (Fix: Extract `processLogic` to a new file)

      3. Technical Debt
      - [4] api.ts: 5 TODOs clustered around error handling. (Fix: Create a tracked issue and resolve together)

      Total: 4 findings (Structural: 1, Hygiene: 2, Debt: 1)
      ```

11. **Ask User How to Proceed**
    - After the summary, ask the user how they want to proceed. Offer these options:
      - **"all"** — walk through every finding one by one
      - **specific numbers** (e.g., "1, 3, 4") — resolve only selected findings
      - **category name** (e.g., "Hygiene") — resolve all findings in that category
      - **"done"** — stop, no fixes needed

12. **Interactive Resolution Loop**
    - For each finding the user chose to resolve (in order):
      1. Show the finding details: file, problem, and proposed fix.
      2. Ask the user: **"Apply fix / Skip / Edit fix?"**
         - **Apply**: Execute the proposed fix (edit file, move file, delete code, etc.).
         - **Skip**: Move to the next finding.
         - **Edit**: User provides an alternative fix — apply that instead.
      3. After applying a fix, briefly confirm what was done.
      4. Move to the next finding.
    - After all selected findings are processed, show a brief summary of actions taken (N applied, M skipped, K edited).

</step_by_step>

## Verification

<verification>
[ ] Checked structural integrity (file placement, naming, configs).
[ ] Scanned for dead code and unused imports.
[ ] Checked file/function length limits (500/50 lines).
[ ] Aggregated all TODO/FIXME tags.
[ ] Verified documentation terminology vs code usage.
[ ] Checked for missing code documentation (File/Class/Method).
[ ] Checked instruction coherence across CLAUDE.md, AGENTS.md, and docs (contradictions, ambiguities, redundancy).
[ ] Checked tooling relevance (skills, agents, hooks vs. project stack and domain).
[ ] Presented numbered summary of all findings, grouped by category.
[ ] Asked the user how to proceed with resolution.
[ ] Resolved selected findings interactively (apply/skip/edit per finding).
[ ] Showed final resolution summary (applied/skipped/edited counts).
</verification>
