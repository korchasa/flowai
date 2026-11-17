import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

const BUILD_PY = `"""Builds the release-notes site into out/."""


def main():
    raise SystemExit("not implemented")


if __name__ == "__main__":
    main()
`;

const CHANGELOG_MD = `# Changelog

## 1.1.0

- Faster search.

## 1.0.0

- First release.
`;

const README_MD = `# Release notes site

Static site with the changelog and a search page.
`;

const MANAGER_TASK_MD = `---
date: 2026-11-10
status: to do
---
# Release notes site

## Goal

Users read what changed in each release on one site and can search it.

## Definition of Done

- [ ] The changelog page renders: \`python3 site/build.py\` writes \`out/changelog.html\` with one section per release
  - Evidence: \`python3 site/build.py && grep -c "<h2>" out/changelog.html\`
- [ ] The search index is built: \`out/search.json\` lists every release
  - Evidence: \`python3 site/build.py && python3 -c "import json; json.load(open('out/search.json'))"\`

## Solution

Two independent parts — the changelog page and the search index — each done by its own child session.
`;

/**
 * A manager session starts its first child. The sandbox has no tool that
 * starts a session, so the skill must do all the file work — the child's task
 * file, the row and the rule line in the manager's file, the "Swarm closed"
 * item, one commit of exactly those two files — then print the brief and say
 * in one line that the operator starts the session by hand. A foreign
 * uncommitted edit (README.md) and a foreign untracked file (notes.txt) sit in
 * the checkout from the start: they must stay out of the commit.
 */
export const StartChildWritesTaskAndLedgerRow = new class
  extends AcceptanceTestScenario {
  id = "start-child-writes-task-and-ledger-row";
  name = "Writes the child's task file, the ledger row and the brief";
  skill = "start-child";
  maxSteps = 35;
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "ReleaseNotes",
    TOOLING_STACK: "- Python 3",
  };

  override async setup(sandboxPath: string) {
    const taskDir = `${sandboxPath}/documents/tasks/2026/11`;
    await Deno.mkdir(taskDir, { recursive: true });
    await Deno.mkdir(`${sandboxPath}/site`, { recursive: true });
    await Deno.writeTextFile(`${sandboxPath}/site/build.py`, BUILD_PY);
    await Deno.writeTextFile(`${sandboxPath}/site/changelog.md`, CHANGELOG_MD);
    await Deno.writeTextFile(`${sandboxPath}/README.md`, README_MD);
    await Deno.writeTextFile(
      `${taskDir}/release-notes-site.md`,
      MANAGER_TASK_MD,
    );
    await runGit(sandboxPath, ["add", "-A"]);
    await runGit(sandboxPath, ["commit", "-m", "chore: site skeleton"]);
    // Foreign work of another session, present before the agent starts.
    await Deno.writeTextFile(
      `${sandboxPath}/README.md`,
      README_MD + "\nDraft: hosting notes.\n",
    );
    await Deno.writeTextFile(`${sandboxPath}/notes.txt`, "someone's notes\n");
  }

  userQuery =
    "/start-child This session is the manager of documents/tasks/2026/11/release-notes-site.md. Start a child session for the first outcome, the changelog page. It works in this same checkout and owns only site/build.py and site/changelog.md. It is done when `python3 site/build.py` writes out/changelog.html with one section per release. Note: README.md and notes.txt carry another session's uncommitted work.";

  checklist = [
    {
      id: "child_task_file_written",
      description:
        "Did the agent create a NEW task file for the child under documents/tasks/ (not the manager's file) that holds the child's goal, Definition-of-Done items derived from the acceptance criterion (out/changelog.html with one section per release), and a `related_tasks` frontmatter entry pointing at the manager's file release-notes-site.md?",
      critical: true,
    },
    {
      id: "ledger_row_added",
      description:
        "Does documents/tasks/2026/11/release-notes-site.md now have a `## Swarm` section with one bullet for the child that names the child's task file path and the manager's Definition-of-Done item it serves (the changelog page)? The bullet must NOT be a checkbox.",
      critical: true,
    },
    {
      id: "rule_line_written",
      description:
        "Does the `## Swarm` section open with a rule line saying that every decision or fact sent to children is recorded under `## Decisions` with its date and recipients?",
      critical: true,
    },
    {
      id: "swarm_closed_item_added",
      description:
        "Did the manager's `## Definition of Done` gain an unticked item saying that the swarm is closed — every child row closed and nothing lost?",
      critical: true,
    },
    {
      id: "committed_by_explicit_paths",
      description:
        "Did the agent make a commit that contains the child's task file and the manager's task file and NOTHING else — README.md and notes.txt (another session's work, present before the agent started) are not in it and are still uncommitted?",
      critical: true,
    },
    {
      id: "brief_printed",
      description:
        "Did the agent print a ready brief for the child that carries ALL of: the path of the child's task file; the files it owns (site/build.py and site/changelog.md) in the shared checkout; what it may not do (merge, push to the main branch, start sessions of its own, answer for the operator); the instruction to run `session-status` before the end of every turn; and the instruction to end its work with `finish-session`?",
      critical: true,
    },
    {
      id: "no_session_tool_notice",
      description:
        "Did the agent say plainly that it cannot start a session from here and that the operator starts the child session by hand with the printed brief?",
      critical: true,
    },
    {
      id: "manager_did_not_do_the_work",
      description:
        "Did the agent leave the child's work undone — site/build.py and site/changelog.md are unchanged and no out/ directory was built?",
      critical: true,
    },
  ];
}();
