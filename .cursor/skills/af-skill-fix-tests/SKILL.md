---
name: af-skill-fix-tests
description: How to fix tests
---

## HOW TO FIX TESTS

1. Analyze errors: Review logs, error messages, and stack traces to identify the
   module or method where the failure occurs.
2. Isolate tests: Run only the failing tests separately to minimize noise and
   focus on the specific scenario.
3. Study tests: Examine the test code, comments, and descriptions to understand
   the expected behavior.
4. Review codebase: Locate the relevant sections of the code being tested and
   consult documentation, READMEs, or comments to grasp the overall
   architecture.
5. Reproduce issue: Create a minimal example that replicates the error to
   determine if it depends on specific data or configuration.
6. Create hypothes: Create the most likely hypothesis about the cause of the
   error.
7. Test hypothes: Methodically test the created hypothesis, making small,
   incremental changes and documenting each step.
8. If the hypothesis is not correct, create a new one and test it again.
9. If the hypothesis is correct, make the minimal changes to the code to fix the
   error.
