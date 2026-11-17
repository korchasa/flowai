import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

const T = "documents/tasks/2026/11";

const MANAGER_TASK_MD = `---
date: 2026-11-08
status: to do
---
# Release notes site

## Goal

Users read what changed in each release on one site.

## Definition of Done

- [x] The changelog page renders
  - Evidence: \`python3 site/build.py && test -f out/changelog.html\`
- [ ] Swarm closed: every child row is marked closed and nothing is lost
  - Evidence: no open row under \`## Swarm\`

## Solution

One part, done by a child session.

## Swarm

Rule: every decision or fact sent to children is appended to \`## Decisions\` with its date and recipients; a changed assignment is also written into that child's task file.

- Changelog page — session local_a1; task file ${T}/changelog-page.md; shared checkout, main branch; serves "The changelog page renders"

## Decisions

## Follow-ups
`;

const CHILD_TASK_MD = `---
date: 2026-11-08
status: done
related_tasks: [2026/11/release-notes-site.md]
---
# Changelog page

## Goal

The changelog renders as one page.

## Definition of Done

- [x] \`out/changelog.html\` is written
  - Evidence: \`python3 site/build.py && test -f out/changelog.html\`
- [x] One section per release
  - Evidence: \`grep -c "<h2>" out/changelog.html\`

## Solution

Render site/changelog.md.

## Follow-ups

- Release dates are printed in the build machine's time zone; they should be UTC.
- site/build.py has no test.

## Status

- State: done
- Needs from the operator: nothing
- Not verified: the page in a browser narrower than 400 px
- Branch: main, shared checkout, committed
- Told directly by the operator: nothing
- Updated: 2026-11-09 16:40
`;

const BUILD_PY = `import os

os.makedirs("out", exist_ok=True)
with open("site/changelog.md") as src, open("out/changelog.html", "w") as out:
    for line in src:
        if line.startswith("## "):
            out.write("<h2>" + line[3:].strip() + "</h2>\\n")
        elif line.strip():
            out.write("<p>" + line.strip() + "</p>\\n")
`;

const CHANGELOG_MD = `## 1.1.0

Faster search.

## 1.0.0

First release.
`;

/**
 * The only child of the swarm finished in the shared checkout: state `done`,
 * every item ticked, everything committed, no branch of its own. Closing it
 * must carry its two follow-ups into the manager's file (they exist nowhere
 * else once the session is gone), mark the row closed, and — the sandbox has
 * no archive tool — say so in one line. Nothing is left open afterwards, so
 * the "Swarm closed" item can be ticked and the manager is pointed at
 * `finish-session` for its own final check and commit.
 */
export const CloseSwarmCollectsFollowUps = new class
  extends AcceptanceTestScenario {
  id = "close-swarm-collects-follow-ups";
  name = "Moves a finished child's follow-ups into the manager's file";
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
    await Deno.mkdir(`${sandboxPath}/site`, { recursive: true });
    await Deno.writeTextFile(`${sandboxPath}/.gitignore`, "out/\n", {
      append: true,
    });
    await Deno.writeTextFile(`${sandboxPath}/site/build.py`, BUILD_PY);
    await Deno.writeTextFile(`${sandboxPath}/site/changelog.md`, CHANGELOG_MD);
    await Deno.writeTextFile(
      `${taskDir}/release-notes-site.md`,
      MANAGER_TASK_MD,
    );
    await Deno.writeTextFile(`${taskDir}/changelog-page.md`, CHILD_TASK_MD);
    await runGit(sandboxPath, ["add", "-A"]);
    await runGit(sandboxPath, ["commit", "-m", "feat: changelog page"]);
  }

  userQuery =
    "/close-swarm This session is the manager of documents/tasks/2026/11/release-notes-site.md. The changelog child reported that it is done. Close it.";

  checklist = [
    {
      id: "follow_ups_moved",
      description:
        "Does the `## Follow-ups` section of documents/tasks/2026/11/release-notes-site.md now hold BOTH follow-ups of the child (release dates should be UTC; site/build.py has no test), each marked with the child it came from (the changelog page child or its task file)?",
      critical: true,
    },
    {
      id: "row_marked_closed",
      description:
        "Is the changelog child's bullet under `## Swarm` in the manager's file now marked `closed`?",
      critical: true,
    },
    {
      id: "archive_notice",
      description:
        "Did the agent say in one short statement that it cannot archive the child session from here (the operator archives or closes it in the host's interface)?",
      critical: true,
    },
    {
      id: "unverified_kept_visible",
      description:
        "Does the report keep the child's unverified claim visible (the page in a browser narrower than 400 px), or mark what it took on trust as coming from the child's report, instead of presenting everything as verified?",
      critical: false,
    },
    {
      id: "nothing_left_and_finish_session",
      description:
        "Does the report end with a `Still open` statement saying that nothing is left open in the swarm, and point to `finish-session` as the manager session's own final check and commit?",
      critical: true,
    },
    {
      id: "could_be_lost_list",
      description:
        "Does the report contain a list or line explicitly titled `Could be lost` (it may say that nothing could be lost, or name the follow-ups not yet moved)?",
      critical: true,
    },
    {
      id: "no_rework",
      description:
        "Did the agent leave the child's work alone — it did not edit site/build.py, did not write a test, did not fix the time zone, and did not edit the child's Definition-of-Done checkboxes? (Running a read-only command is not rework.)",
      critical: true,
    },
  ];
}();
