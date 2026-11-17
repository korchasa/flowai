import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

const T = "documents/tasks/2026/11";

const MANAGER_TASK_MD = `---
date: 2026-11-08
status: to do
---
# Release notes site

## Goal

Users read what changed in each release on one site, can search it and can subscribe to it.

## Definition of Done

- [x] The changelog page renders
  - Evidence: \`test -f site/changelog.py\`
- [ ] The search index is built
  - Evidence: \`test -f site/index.py\`
- [ ] The RSS feed is published
  - Evidence: \`test -f site/feed.py\`
- [ ] Swarm closed: every child row is marked closed and nothing is lost
  - Evidence: no open row under \`## Swarm\`

## Solution

Three independent parts, each done by its own child session.

## Swarm

Rule: every decision or fact sent to children is appended to \`## Decisions\` with its date and recipients; a changed assignment is also written into that child's task file.

- Changelog page — session local_a1; task file ${T}/changelog-page.md; branch swarm/changelog, worktree .worktrees/changelog; serves "The changelog page renders"
- Search index — session local_b2; task file ${T}/search-index.md; shared checkout, main branch; serves "The search index is built"
- RSS feed — session local_c3; task file ${T}/rss-feed.md; branch swarm/rss, worktree .worktrees/rss; serves "The RSS feed is published"

## Decisions

## Follow-ups
`;

function childTask(
  title: string,
  item: string,
  ticked: boolean,
  status: string,
): string {
  return `---
date: 2026-11-08
status: ${ticked ? "done" : "to do"}
related_tasks: [2026/11/release-notes-site.md]
---
# ${title}

## Goal

${title} for the release notes site.

## Definition of Done

- [${ticked ? "x" : " "}] ${item}
  - Evidence: manual look

## Solution

Write it.

## Follow-ups
${status}`;
}

const CHANGELOG_START = childTask(
  "Changelog page",
  "`site/changelog.py` renders the page",
  false,
  "",
);
const CHANGELOG_DONE = childTask(
  "Changelog page",
  "`site/changelog.py` renders the page",
  true,
  `
## Status

- State: done
- Needs from the operator: nothing
- Not verified: nothing
- Branch: swarm/changelog, committed, merged into main
- Told directly by the operator: nothing
- Updated: 2026-11-09 15:00
`,
);
const SEARCH_BLOCKED = childTask(
  "Search index",
  "`site/index.py` builds the index",
  false,
  `
## Status

- State: blocked on operator
- Needs from the operator: choose the search library — lunr or pagefind
- Not verified: nothing
- Branch: main, shared checkout
- Told directly by the operator: nothing
- Updated: 2026-11-09 17:05
`,
);
const RSS_START = childTask(
  "RSS feed",
  "`site/feed.py` writes the feed",
  false,
  "",
);
const RSS_WORKING = childTask(
  "RSS feed",
  "`site/feed.py` writes the feed",
  false,
  `
## Status

- State: working
- Needs from the operator: nothing
- Not verified: nothing
- Branch: swarm/rss, committed in part
- Told directly by the operator: nothing
- Updated: 2026-11-09 17:20
`,
);

/**
 * "Close everything that can be closed" over three children:
 *  - the changelog child is done and its branch is merged, but its worktree
 *    is still on disk → closed, worktree removed;
 *  - the search-index child waits for the operator → never closed or archived;
 *  - the RSS child is still working, its branch is unmerged and its worktree
 *    holds an uncommitted file → left open, and the uncommitted file is named
 *    so that it is not lost.
 * The run must end with the list of what is still open and must not tick the
 * manager's "Swarm closed" item.
 */
export const CloseSwarmListsLeftovers = new class
  extends AcceptanceTestScenario {
  id = "close-swarm-lists-leftovers";
  name = "Closes what is finished and lists everything still open";
  skill = "close-swarm";
  maxSteps = 50;
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "ReleaseNotes",
    TOOLING_STACK: "- Python 3",
  };

  override async setup(sandboxPath: string) {
    const taskDir = `${sandboxPath}/${T}`;
    await Deno.mkdir(taskDir, { recursive: true });
    await Deno.mkdir(`${sandboxPath}/site`, { recursive: true });
    await Deno.writeTextFile(`${sandboxPath}/.gitignore`, ".worktrees/\n", {
      append: true,
    });
    await Deno.writeTextFile(`${sandboxPath}/site/__init__.py`, "");
    await Deno.writeTextFile(
      `${taskDir}/release-notes-site.md`,
      MANAGER_TASK_MD,
    );
    await Deno.writeTextFile(`${taskDir}/changelog-page.md`, CHANGELOG_START);
    await Deno.writeTextFile(`${taskDir}/search-index.md`, SEARCH_BLOCKED);
    await Deno.writeTextFile(`${taskDir}/rss-feed.md`, RSS_START);
    await runGit(sandboxPath, ["add", "-A"]);
    await runGit(sandboxPath, ["commit", "-m", "docs: swarm task files"]);

    // Changelog child: finished on its branch, merged, worktree left behind.
    const wtA = `${sandboxPath}/.worktrees/changelog`;
    await runGit(sandboxPath, [
      "worktree",
      "add",
      "-b",
      "swarm/changelog",
      wtA,
    ]);
    await Deno.writeTextFile(
      `${wtA}/site/changelog.py`,
      'import os\n\nos.makedirs("out", exist_ok=True)\nopen("out/changelog.html", "w").write("<h2>1.0.0</h2>\\n")\n',
    );
    await Deno.writeTextFile(`${wtA}/${T}/changelog-page.md`, CHANGELOG_DONE);
    await runGit(wtA, ["add", "-A"]);
    await runGit(wtA, ["commit", "-m", "feat: changelog page"]);
    await runGit(sandboxPath, [
      "merge",
      "--no-ff",
      "-m",
      "merge: changelog page",
      "swarm/changelog",
    ]);

    // RSS child: still working, unmerged, one file not committed.
    const wtC = `${sandboxPath}/.worktrees/rss`;
    await runGit(sandboxPath, ["worktree", "add", "-b", "swarm/rss", wtC]);
    await Deno.writeTextFile(`${wtC}/${T}/rss-feed.md`, RSS_WORKING);
    await runGit(wtC, ["commit", "-am", "docs: rss status"]);
    await Deno.writeTextFile(`${wtC}/site/feed.py`, "print('feed draft')\n");
  }

  userQuery =
    "/close-swarm This session is the manager of documents/tasks/2026/11/release-notes-site.md. Close the swarm: everything that can be closed.";

  checklist = [
    {
      id: "merged_child_closed",
      description:
        "Is the changelog child closed: its bullet under `## Swarm` in the manager's file is marked `closed`, and its worktree .worktrees/changelog is removed (its branch was already merged into the main branch)?",
      critical: true,
    },
    {
      id: "blocked_child_not_closed",
      description:
        "Did the agent refuse to close or archive the search-index child because it is `blocked on operator` (it waits for the choice of the search library), leaving its row not closed?",
      critical: true,
    },
    {
      id: "working_child_not_closed_and_intact",
      description:
        "Is the RSS child left open and untouched: its row is not marked closed, and the worktree .worktrees/rss, the branch swarm/rss and the uncommitted file site/feed.py inside that worktree are all still there?",
      critical: true,
    },
    {
      id: "uncommitted_work_named",
      description:
        "Does the report name the uncommitted file in the RSS child's worktree (site/feed.py in .worktrees/rss) in a list explicitly titled `Could be lost`?",
      critical: true,
    },
    {
      id: "leftovers_listed",
      description:
        "Does the report close with a list explicitly titled `Still open` that holds: the two rows not closed (search index, RSS feed), the unmerged branch swarm/rss and the remaining worktree .worktrees/rss? Only short closing lines may follow the list — about `finish-session`, the `Swarm closed` item, or a prompt for the operator's answer; they do not fail this item.",
      critical: true,
    },
    {
      id: "unfinished_child_sent_to_finish_session",
      description:
        "Does the report say that the unfinished RSS child ends its own work by running `finish-session` (and that the agent could not send it that request from here, or that the operator passes it on)?",
      critical: false,
    },
    {
      id: "swarm_closed_item_not_ticked",
      description:
        "Is the manager's Definition-of-Done item `Swarm closed` still UNTICKED?",
      critical: true,
    },
  ];
}();
