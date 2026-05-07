import { join } from "@std/path";
import { BenchmarkSkillScenario } from "@bench/types.ts";

// Verifies FR-DOC-TASK-LIFECYCLE intermediate state: when a commit closes
// SOME (but not all) DoD items, status flips `to do` → `in progress`.
//
// Fixture: documents/tasks/2026/04/20/add-search-page.md with frontmatter
// `status: to do` and 1/3 DoD items already `[x]` (the "renders results"
// test was written and passed in a prior session). The current commit
// closes nothing more — this run just validates derivation given the
// existing fixture state.
export const CommitDerivesInProgressBench = new class
  extends BenchmarkSkillScenario {
  id = "flowai-commit-derives-in-progress-status";
  name = "Task status flips to do → in progress on partial DoD";
  skill = "flowai-commit";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override sandboxState = {
    commits: [],
    untracked: ["src/components/SearchPage.ts"],
    expectedOutcome:
      "Agent commits the new component AND in the same commit flips the task's frontmatter `status` from `to do` to `in progress` because 1 of 3 DoD checkboxes are `[x]`.",
  };

  override async setup(sandboxPath: string) {
    const code = `export function SearchPage(query: string) {
  return { tag: "main", children: [{ tag: "h1", text: "Results for " + query }] };
}
`;
    await Deno.mkdir(join(sandboxPath, "src/components"), { recursive: true });
    await Deno.writeTextFile(
      join(sandboxPath, "src/components/SearchPage.ts"),
      code,
    );
  }

  userQuery =
    "/flowai-commit Started the search page (renders results works; pagination + empty-state still TODO). The task at documents/tasks/2026/04/20/add-search-page.md tracks the work. Commit what we have.";

  checklist = [
    {
      id: "code_committed",
      description: "Is `src/components/SearchPage.ts` present in a commit?",
      critical: true,
    },
    {
      id: "task_status_in_progress",
      description:
        "Read `documents/tasks/2026/04/20/add-search-page.md` after the commit. Does its frontmatter contain `status: in progress` (NOT `status: to do` and NOT `status: done`)? The DoD has 1/3 boxes checked, so derivation is `in progress`.",
      critical: true,
    },
    {
      id: "task_change_in_commit",
      description:
        "Run `git log -p -- documents/tasks/2026/04/20/add-search-page.md`. Is there a commit in the agent's session that changes the task's `status` from `to do` to `in progress`? The frontmatter rewrite must be IN A COMMIT.",
      critical: true,
    },
    {
      id: "task_file_not_deleted",
      description:
        "The task file at `documents/tasks/2026/04/20/add-search-page.md` must NOT have been deleted by cleanup. New-shape tasks are persistent records.",
      critical: true,
    },
    {
      id: "dod_items_unchanged",
      description:
        "Read the task file. Is the DoD section unchanged (3 items: 1 `[x]`, 2 `[ ]`)? The agent must NOT have edited DoD content — only the frontmatter `status` line.",
      critical: false,
    },
  ];
}();
