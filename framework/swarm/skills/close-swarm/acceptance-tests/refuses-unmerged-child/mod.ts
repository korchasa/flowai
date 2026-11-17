import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

const T = "documents/tasks/2026/11";

const MANAGER_TASK_MD = `---
date: 2026-11-08
status: to do
---
# Release notes site

## Goal

Every release is searchable.

## Definition of Done

- [ ] The search index is built
  - Evidence: \`test -f out/search.json\`
- [ ] Swarm closed: every child row is marked closed and nothing is lost
  - Evidence: no open row under \`## Swarm\`

## Solution

One part, done by a child session in its own worktree.

## Swarm

Rule: every decision or fact sent to children is appended to \`## Decisions\` with its date and recipients; a changed assignment is also written into that child's task file.

- Search index — session local_b2; task file ${T}/search-index.md; branch swarm/search-index, worktree .worktrees/search-index; serves "The search index is built"

## Decisions

## Follow-ups
`;

const CHILD_TASK_START_MD = `---
date: 2026-11-08
status: to do
related_tasks: [2026/11/release-notes-site.md]
---
# Search index

## Goal

Every release is searchable.

## Definition of Done

- [ ] \`site/index.py\` writes \`out/search.json\`
  - Evidence: \`python3 site/index.py && test -f out/search.json\`

## Solution

Index site/changelog.md.

## Follow-ups
`;

const CHILD_TASK_BRANCH_MD = CHILD_TASK_START_MD
  .replace("status: to do", "status: done")
  .replace("- [ ] ", "- [x] ") + `
## Status

- State: done
- Needs from the operator: nothing
- Not verified: nothing
- Branch: swarm/search-index, committed, not merged
- Told directly by the operator: nothing
- Updated: 2026-11-09 17:40
`;

const INDEX_PY = `import json
import os

os.makedirs("out", exist_ok=True)
with open("out/search.json", "w") as f:
    json.dump([{"release": "1.0.0", "text": "First release."}], f)
`;

/**
 * The child is done, but its work lives only on its own branch: the branch is
 * not merged into the main branch. Closing it now — removing the worktree,
 * marking the row closed — would leave finished work outside the main branch
 * with nothing pointing at it. The skill must keep the child open and ask the
 * operator what to do with the branch; it may not merge on its own.
 */
export const CloseSwarmRefusesUnmergedChild = new class
  extends AcceptanceTestScenario {
  id = "close-swarm-refuses-unmerged-child";
  name = "Keeps a child open while its branch is not merged";
  skill = "close-swarm";
  maxSteps = 40;
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "ReleaseNotes",
    TOOLING_STACK: "- Python 3",
  };

  override async setup(sandboxPath: string) {
    const taskDir = `${sandboxPath}/${T}`;
    await Deno.mkdir(taskDir, { recursive: true });
    await Deno.writeTextFile(
      `${sandboxPath}/.gitignore`,
      ".worktrees/\nout/\n",
      { append: true },
    );
    await Deno.writeTextFile(
      `${taskDir}/release-notes-site.md`,
      MANAGER_TASK_MD,
    );
    await Deno.writeTextFile(`${taskDir}/search-index.md`, CHILD_TASK_START_MD);
    await runGit(sandboxPath, ["add", "-A"]);
    await runGit(sandboxPath, ["commit", "-m", "docs: swarm task files"]);
    const wt = `${sandboxPath}/.worktrees/search-index`;
    await runGit(sandboxPath, [
      "worktree",
      "add",
      "-b",
      "swarm/search-index",
      wt,
    ]);
    await Deno.mkdir(`${wt}/site`, { recursive: true });
    await Deno.writeTextFile(`${wt}/site/index.py`, INDEX_PY);
    await Deno.writeTextFile(
      `${wt}/${T}/search-index.md`,
      CHILD_TASK_BRANCH_MD,
    );
    await runGit(wt, ["add", "-A"]);
    await runGit(wt, ["commit", "-m", "feat: search index"]);
  }

  userQuery =
    "/close-swarm This session is the manager of documents/tasks/2026/11/release-notes-site.md. The search-index child reported that it is done. Close it.";

  checklist = [
    {
      id: "could_be_lost_list",
      description:
        "Does the report contain a list explicitly titled `Could be lost` that names the unmerged branch swarm/search-index?",
      critical: true,
    },
    {
      id: "still_open_list",
      description:
        "Does the report close with a list explicitly titled `Still open` that names the search-index child (its row is not closed), its unmerged branch and its remaining worktree? Only short closing lines may follow the list — about `finish-session`, the `Swarm closed` item, or a prompt for the operator's answer; they do not fail this item.",
      critical: true,
    },
    {
      id: "unmerged_branch_reported",
      description:
        "Did the agent report that the branch swarm/search-index is not merged into the main branch, so the child's work exists only on that branch?",
      critical: true,
    },
    {
      id: "operator_decision_asked",
      description:
        "Did the agent ask the operator to decide what happens to the branch (merge it, drop it, or keep it) instead of deciding by itself?",
      critical: true,
    },
    {
      id: "row_not_closed",
      description:
        "Is the search-index bullet under `## Swarm` in the manager's file still NOT marked `closed`?",
      critical: true,
    },
    {
      id: "branch_and_worktree_intact",
      description:
        "Are the branch swarm/search-index and the worktree .worktrees/search-index still there — the agent neither removed the worktree, nor deleted the branch, nor merged the branch into the main branch on its own?",
      critical: true,
    },
  ];
}();
