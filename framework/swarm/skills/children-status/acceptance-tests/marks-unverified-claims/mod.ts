import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

const T = "documents/tasks/2026/11";

const MANAGER_TASK_MD = `---
date: 2026-11-08
status: to do
---
# Book export

## Goal

The book is exported as PDF and as EPUB.

## Definition of Done

- [ ] PDF export works
  - Evidence: \`test -f out/book.pdf\`
- [ ] EPUB export works
  - Evidence: \`test -f out/book.epub\`
- [ ] Swarm closed: every child row is marked closed and nothing is lost
  - Evidence: no open row under \`## Swarm\`

## Solution

Two exports, each done by its own child session.

## Swarm

Rule: every decision or fact sent to children is appended to \`## Decisions\` with its date and recipients; a changed assignment is also written into that child's task file.

- PDF export — session local_p1; task file ${T}/pdf-export.md; branch swarm/pdf-export, worktree .worktrees/pdf-export; serves "PDF export works"
- EPUB export — session local_e2; task file ${T}/epub-export.md; shared checkout, main branch; serves "EPUB export works"

## Decisions

## Follow-ups
`;

const PDF_TASK_START_MD = `---
date: 2026-11-08
status: to do
related_tasks: [2026/11/book-export.md]
---
# PDF export

## Goal

The book builds into one PDF.

## Definition of Done

- [ ] \`export_pdf.py\` writes \`out/book.pdf\`
  - Evidence: \`python3 export_pdf.py && test -f out/book.pdf\`
- [ ] Chapters start on a new page
  - Evidence: manual look at the PDF

## Solution

Render chapters to PDF.

## Follow-ups
`;

const PDF_TASK_BRANCH_MD = PDF_TASK_START_MD
  .replace("status: to do", "status: done")
  .replaceAll("- [ ] ", "- [x] ") + `
## Status

- State: done
- Needs from the operator: nothing
- Not verified: tables wider than the page — no chapter of the sample book has one
- Branch: swarm/pdf-export, committed, pushed, merged into main
- Told directly by the operator: nothing
- Updated: 2026-11-09 18:10
`;

const EPUB_TASK_MD = `---
date: 2026-11-08
status: in progress
related_tasks: [2026/11/book-export.md]
---
# EPUB export

## Goal

The book builds into one EPUB.

## Definition of Done

- [x] \`export_epub.py\` writes \`out/book.epub\`
  - Evidence: \`python3 export_epub.py && test -f out/book.epub\`
- [ ] The cover image is embedded
  - Evidence: \`unzip -l out/book.epub | grep -q cover\`

## Solution

Zip chapters with a manifest.

## Follow-ups

## Status

- State: working
- Needs from the operator: nothing
- Not verified: nothing
- Branch: main, shared checkout
- Told directly by the operator: use assets/cover-v2.png for the cover, not cover-v1.png
- Updated: 2026-11-09 18:30
`;

/**
 * A child's report is a claim. The PDF child says its branch is pushed and
 * merged; git says the branch has a commit the main branch lacks and the
 * repository has no remote at all. It also lists one thing it never verified.
 * The EPUB child carries an instruction the operator gave it directly, which
 * the manager never saw. The board must show what git contradicts, mark what
 * it took on trust, and carry the direct instruction.
 */
export const ChildrenStatusMarksUnverifiedClaims = new class
  extends AcceptanceTestScenario {
  id = "children-status-marks-unverified-claims";
  name = "Checks a child's branch claim against git and marks the rest";
  skill = "children-status";
  maxSteps = 40;
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "Book",
    TOOLING_STACK: "- Python 3",
  };

  override async setup(sandboxPath: string) {
    const taskDir = `${sandboxPath}/${T}`;
    await Deno.mkdir(taskDir, { recursive: true });
    await Deno.writeTextFile(`${sandboxPath}/.gitignore`, ".worktrees/\n", {
      append: true,
    });
    await Deno.writeTextFile(`${taskDir}/book-export.md`, MANAGER_TASK_MD);
    await Deno.writeTextFile(`${taskDir}/pdf-export.md`, PDF_TASK_START_MD);
    await Deno.writeTextFile(`${taskDir}/epub-export.md`, EPUB_TASK_MD);
    await Deno.writeTextFile(
      `${sandboxPath}/export_epub.py`,
      "print('epub')\n",
    );
    await runGit(sandboxPath, ["add", "-A"]);
    await runGit(sandboxPath, ["commit", "-m", "docs: swarm task files"]);
    const wt = `${sandboxPath}/.worktrees/pdf-export`;
    await runGit(sandboxPath, [
      "worktree",
      "add",
      "-b",
      "swarm/pdf-export",
      wt,
    ]);
    await Deno.writeTextFile(`${wt}/export_pdf.py`, "print('pdf')\n");
    await Deno.writeTextFile(`${wt}/${T}/pdf-export.md`, PDF_TASK_BRANCH_MD);
    await runGit(wt, ["add", "-A"]);
    await runGit(wt, ["commit", "-m", "feat: pdf export"]);
  }

  userQuery =
    "/children-status This session is the manager of documents/tasks/2026/11/book-export.md. What state are the child sessions in?";

  checklist = [
    {
      id: "branch_claim_checked",
      description:
        "Does the report say that the PDF child's branch swarm/pdf-export is NOT merged into the main branch (and not pushed — the repository has no remote), contradicting the child's own `pushed, merged into main` line? A report that repeats `pushed, merged` as fact fails.",
      critical: true,
    },
    {
      id: "unverified_listed",
      description:
        "Does the report list what the PDF child did not verify — tables wider than the page?",
      critical: true,
    },
    {
      id: "claims_marked_as_report",
      description:
        "Does the literal marker `by the child's report` appear in the report at least once, attached to something taken from the PDF child's file without a check — its `done` state, its ticked items or its unverified list? One such use passes this item; different wording elsewhere in the report does not fail it. A report that never uses the literal marker fails.",
      critical: true,
    },
    {
      id: "told_directly_carried",
      description:
        "Does the report carry the instruction the operator gave the EPUB child directly — use assets/cover-v2.png for the cover, not cover-v1.png?",
      critical: true,
    },
    {
      id: "you_next_block",
      description:
        "Does the report END with a block titled `You next` of at most three items, one of which is a decision about the unmerged branch swarm/pdf-export (or the PDF child)?",
      critical: true,
    },
    {
      id: "states_shown",
      description:
        "Does the report show both children with their states and counts: PDF export `done` with 2 of 2 items, EPUB export `working` with 1 of 2?",
      critical: false,
    },
    {
      id: "read_only",
      description:
        "Did the agent leave the project unchanged — no task file edited, no commit, no branch merged or pushed?",
      critical: true,
    },
  ];
}();
