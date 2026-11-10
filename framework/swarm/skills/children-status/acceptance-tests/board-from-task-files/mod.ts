import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

const T = "documents/tasks/2026/11";

const MANAGER_TASK_MD = `---
date: 2026-11-08
status: to do
---
# Release notes site

## Goal

Users read what changed in each release on one site and can search it.

## Definition of Done

- [ ] The changelog page renders
  - Evidence: \`test -f out/changelog.html\`
- [ ] The search index is built
  - Evidence: \`test -f out/search.json\`
- [ ] The RSS feed is published
  - Evidence: \`test -f out/feed.xml\`
- [ ] Swarm closed: every child row is marked closed and nothing is lost
  - Evidence: no open row under \`## Swarm\`

## Solution

Three independent parts, each done by its own child session.

## Swarm

Rule: every decision or fact sent to children is appended to \`## Decisions\` with its date and recipients; a changed assignment is also written into that child's task file.

- Changelog page — session local_a1; task file ${T}/changelog-page.md; shared checkout, main branch; serves "The changelog page renders"
- Search index — session local_b2; task file ${T}/search-index.md; branch swarm/search-index, worktree .worktrees/search-index; serves "The search index is built"
- RSS feed — session local_c3; task file ${T}/rss-feed.md; shared checkout, main branch; serves "The RSS feed is published"

## Decisions

## Follow-ups
`;

const CHANGELOG_TASK_MD = `---
date: 2026-11-08
status: done
related_tasks: [2026/11/release-notes-site.md]
---
# Changelog page

## Goal

The changelog renders as one page.

## Definition of Done

- [x] \`out/changelog.html\` is written
  - Evidence: \`test -f out/changelog.html\`
- [x] One section per release
  - Evidence: \`grep -c "<h2>" out/changelog.html\`
- [x] Release dates are shown
  - Evidence: \`grep -c "<time" out/changelog.html\`

## Solution

Render site/changelog.md.

## Follow-ups

## Status

- State: done
- Needs from the operator: nothing
- Not verified: nothing
- Branch: main, shared checkout, committed
- Told directly by the operator: nothing
- Updated: 2026-11-09 16:40
`;

const SEARCH_TASK_START_MD = `---
date: 2026-11-08
status: to do
related_tasks: [2026/11/release-notes-site.md]
---
# Search index

## Goal

Every release is searchable.

## Definition of Done

- [ ] Release texts are extracted
  - Evidence: \`test -f out/releases.json\`
- [ ] \`out/search.json\` is built
  - Evidence: \`test -f out/search.json\`
- [ ] The search page loads the index
  - Evidence: \`grep -q search.json out/search.html\`

## Solution

Extract, index, wire the page.

## Follow-ups
`;

const SEARCH_TASK_BRANCH_MD = SEARCH_TASK_START_MD
  .replace("status: to do", "status: in progress")
  .replace(
    "- [ ] Release texts are extracted",
    "- [x] Release texts are extracted",
  ) + `
## Status

- State: blocked on operator
- Needs from the operator: choose the search library — lunr (index built at build time) or pagefind (needs a binary in CI)
- Not verified: nothing
- Branch: swarm/search-index, committed, not pushed
- Told directly by the operator: nothing
- Updated: 2026-11-09 17:05
`;

const RSS_TASK_MD = `---
date: 2026-11-08
status: to do
related_tasks: [2026/11/release-notes-site.md]
---
# RSS feed

## Goal

Readers subscribe to releases.

## Definition of Done

- [ ] \`out/feed.xml\` is written
  - Evidence: \`test -f out/feed.xml\`
- [ ] The feed validates
  - Evidence: \`python3 -c "import xml.dom.minidom as m; m.parse('out/feed.xml')"\`

## Solution

Write the feed from site/changelog.md.

## Follow-ups

- The feed needs absolute URLs, and the site has no setting for its base address yet.

## Status

- State: working
- Needs from the operator: nothing
- Not verified: nothing
- Branch: main, shared checkout
- Told directly by the operator: nothing
- Updated: 2026-11-09 17:20
`;

/**
 * The manager is asked for the state of its children in a session with no
 * history: everything it knows is in the task files. Three children in three
 * states. The search-index child works in its own worktree, and its Status
 * block exists ONLY as a commit on its branch — the copy of its task file on
 * the main branch still shows the state at start — so a board built from the
 * working tree alone gets that child wrong. The sandbox cannot list sessions.
 */
export const ChildrenStatusBoardFromTaskFiles = new class
  extends AcceptanceTestScenario {
  id = "children-status-board-from-task-files";
  name = "Builds the board from task files, reading a worktree child's branch";
  skill = "children-status";
  maxSteps = 40;
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "ReleaseNotes",
    TOOLING_STACK: "- Python 3",
  };

  override async setup(sandboxPath: string) {
    const taskDir = `${sandboxPath}/${T}`;
    await Deno.mkdir(taskDir, { recursive: true });
    await Deno.writeTextFile(`${sandboxPath}/.gitignore`, ".worktrees/\n", {
      append: true,
    });
    await Deno.writeTextFile(
      `${taskDir}/release-notes-site.md`,
      MANAGER_TASK_MD,
    );
    await Deno.writeTextFile(`${taskDir}/changelog-page.md`, CHANGELOG_TASK_MD);
    await Deno.writeTextFile(
      `${taskDir}/search-index.md`,
      SEARCH_TASK_START_MD,
    );
    await Deno.writeTextFile(`${taskDir}/rss-feed.md`, RSS_TASK_MD);
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
    await Deno.writeTextFile(
      `${wt}/${T}/search-index.md`,
      SEARCH_TASK_BRANCH_MD,
    );
    await runGit(wt, ["commit", "-am", "docs: search-index status"]);
  }

  userQuery =
    "/children-status This session is the manager of documents/tasks/2026/11/release-notes-site.md. What state are the child sessions in?";

  checklist = [
    {
      id: "board_has_all_children",
      description:
        "Does the report show all three children — changelog page, search index, RSS feed — each with a state: changelog page `done`, search index `blocked on operator`, RSS feed `working`? (A note that a state is taken by the child's report, or that a working child cannot be told from a stalled one without the host, does not fail this item.)",
      critical: true,
    },
    {
      id: "worktree_child_read_from_branch",
      description:
        "Is the search-index child shown as `blocked on operator` with its open question (which search library: lunr or pagefind)? That state exists only on the branch swarm/search-index (or in the worktree .worktrees/search-index); a report that shows this child as not started, or with 0 items done, read the wrong copy.",
      critical: true,
    },
    {
      id: "done_and_left_counted",
      description:
        "Does the report give, per child, how many Definition-of-Done items are done and left: changelog page 3 of 3, search index 1 of 3, RSS feed 0 of 2?",
      critical: true,
    },
    {
      id: "you_next_block",
      description:
        "Does the report END with a block titled `You next` (at most three items) that tells the operator to answer the search-index child's question about the search library, and names the session to answer in (local_b2 or the search-index child)?",
      critical: true,
    },
    {
      id: "blocked_first",
      description:
        "Does the child that is blocked on the operator come BEFORE the working and the done children in the board?",
      critical: false,
    },
    {
      id: "follow_up_listed",
      description:
        "Does the report mention the RSS child's follow-up (absolute URLs need a base-address setting)?",
      critical: false,
    },
    {
      id: "no_session_list_notice",
      description:
        "Did the agent say in one short statement that it cannot list or query sessions from here, so the states come from the task files (and git)?",
      critical: true,
    },
    {
      id: "read_only",
      description:
        "Did the agent leave the project unchanged — no task file edited, no commit, no branch merged?",
      critical: true,
    },
  ];
}();
