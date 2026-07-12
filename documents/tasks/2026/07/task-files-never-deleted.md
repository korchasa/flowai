---
date: 2026-07-12
status: done
implements:
  - FR-DOC-TASK-LIFECYCLE
---
# Task files are never deleted by commit (remove deletion behavior)

## Goal

Remove task-file deletion from the `commit` workflow entirely. Task files are
persistent canonical project memory — deleting them (any shape) destroys the
record future sessions rely on. Resolves the standing SRS contradiction where
one requirement mandated deletion while another mandated persistence.

## Overview

### Context

Two SRS requirements conflicted on task-file lifecycle:
- The deletion rule (`FR-WB-CLEANUP`) said `commit` deletes the referenced task
  file once all DoD items are satisfied.
- The persistence rule (`FR-DOC-TASK-LIFECYCLE`) said task files are persistent
  canonical records, never deleted — only their `status` is derived from DoD.

The real implementation had already narrowed deletion to LEGACY flat-path tasks
(`commit` atom step 5), and the two deletion acceptance scenarios exercise a
legacy flat-path fixture. But the deletion Description read unconditionally, so
a reader saw two mutually exclusive rules. Decision (user): deletion is wrong
in all cases — remove it, fix everything that mandates/implements/tests it.
Variant A chosen: remove the behavior cleanly (drop the rule + both tests), keep
the single persistence rule; do NOT invert into a second "never delete" rule
(that duplicates the persistence rule — the very dup-drift class being cured).

### Current State

Deletion is prescribed / implemented / tested in five places:
- SRS `FR-WB-CLEANUP` (`documents/requirements.md`): the deletion rule.
- `framework/atoms/commit.md` step 5 (legacy `git rm` branch) + verification
  checklist line ("completed task files deleted").
- `framework/composites/review-and-commit.md` verification line.
- Acceptance scenarios `task-cleanup` + `task-cleanup-partial` under
  `framework/core/commands/commit/acceptance-tests/`.
- Generated composite `SKILL.md` files (regenerate from atoms/wrappers).
- `documents/index.md` navigation row pointing at the removed FR anchor.

Zero legacy flat-path tasks exist in the project — the deleted path is residual.

### Constraints

- Do NOT touch status-derivation logic (separate concern from deletion).
- Regenerate composites; never hand-edit generated `SKILL.md`.
- Commit that carries the atom change is semantically `feat`/`fix` → triggers a
  framework release → human-gated (do NOT commit `feat`/`fix` autonomously).

## Definition of Done

- [x] FR-DOC-TASK-LIFECYCLE: `commit` atom never deletes task files of any shape
  - Test: existing `commit-flips-task-status` (new-shape persistence unbroken)
  - Evidence: `grep -c 'git rm' framework/atoms/commit.md` returns 0 in the task-cleanup step
- [x] Deletion rule removed from SRS; persistence rule carries the "any shape, never deleted" statement
  - Test: `Benchmark: commit-flips-task-status`
  - Evidence: `grep -c 'wb-cleanup' documents/requirements.md` == 0
- [x] Both deletion scenarios removed
  - Evidence: `find framework -type d -name 'task-cleanup*'` returns nothing
- [x] Composites regenerated; deletion gone from verification checklists
  - Evidence: `grep -rn 'task files deleted\|completed deleted' framework/atoms framework/composites` == 0
- [x] Project check green
  - Evidence: `deno task check` exit 0

## Solution

Variant A — remove the behavior cleanly:
1. `framework/atoms/commit.md` step 5: collapse the two-branch cleanup into one
   rule — task files (any shape) are NEVER deleted; the only lifecycle action is
   the status derivation in step 4.3. Update the verification checklist line.
2. `framework/composites/review-and-commit.md`: update the verification line to
   the never-deleted statement.
3. SRS: remove the `FR-WB-CLEANUP` section; add a one-clause note to
   `FR-DOC-TASK-LIFECYCLE` that task files of ANY shape are never deleted by
   commit (so the persistence invariant has an explicit home after removal).
4. Delete acceptance scenarios `task-cleanup` and `task-cleanup-partial`.
5. Regenerate composites (`deno run -A scripts/generate-skill-composites.ts --write`).
6. `deno task check`; confirm `commit-flips-task-status` family still valid.
