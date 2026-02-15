---
name: flow-skill-analyze-context
description: Analyze token usage in the current context, identifying heavy files, duplicates, and distribution by component. Use when the user asks about token usage, context limits, or optimizing context.
---

# Analyze Context Token Usage

## Instructions

1.  **Identify Context Sources**:
    - List currently open files.
    - List recently viewed files (from your system prompt info).
    - Check the `terminals/` directory for active terminal outputs.

2.  **Estimate Tokens**:
    - Run the provided Python script on the identified files to get estimated token counts.
    - The script uses a heuristic: ~4 chars/token for Code/English, ~1.6 chars/token for Russian/Unicode.

    ```bash
    python3 catalog/skills/flow-skill-analyze-context/scripts/estimate_tokens.py "path/to/file1" "path/to/file2" ...
    ```

3.  **Analyze Findings**:
    - **Heavy Files**: Identify the top 5 files consuming the most tokens.
    - **Duplicates**: The script identifies exact content matches. Also look for *logical* duplicates (e.g., `src/main.ts` vs `dist/main.js`, or `README.md` vs `docs/index.md`).
    - **Garbage/Low Value**: Identify files that likely shouldn't be in context:
        - Lock files (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`)
        - Minified code (`.min.js`, `.map`)
        - Large data files (`.json`, `.csv`, `.xml` > 10KB)
        - Build artifacts (`dist/`, `build/`, `.next/`)
    - **Logical Garbage (Task Irrelevance)**: Compare files against the user's current goal.
        - *Unrelated Domains*: e.g., `auth.service.ts` when working on `billing.component.ts`.
        - *Excessive Documentation*: Full `README.md` or `design.md` when fixing a small bug.
        - *Old Context*: Files from previous tasks that are no longer relevant.
        - *Tests*: Test files when only exploring implementation (or vice versa).
    - **Terminal Output**: Check the size of files in `terminals/`. These are often overlooked context consumers.

4.  **Report**:
    - Present a summary table of token usage.
    - Highlight "Quick Wins" (files to close/ignore to save space).
    - Show distribution by file type (e.g., "TypeScript: 40%", "Markdown: 30%").

## Examples

**User:** "Why is my context full?"
**Action:**
1. Collect paths of all open and recent files.
2. Run `estimate_tokens.py`.
3. Report:
   "Your context is ~120k tokens.
   - **Heavy hitters:** `huge_log.txt` (50k), `package-lock.json` (30k).
   - **Duplicates:** `main.js` is a build artifact of `main.ts`.
   - **Recommendation:** Close `huge_log.txt` and add `package-lock.json` to `.cursorignore`."
