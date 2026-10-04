import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Verifies FR-DOC-TASK-LIFECYCLE intermediate state: when a commit closes
// SOME (but not all) DoD items, status flips `to do` → `in progress`.
//
// Fixture: documents/tasks/2026/04/add-search-page.md with frontmatter
// `status: to do` and 1/3 DoD items already `[x]` (the "renders results"
// test was written and passed in a prior session). The current commit
// closes nothing more — this run just validates derivation given the
// existing fixture state.
//
// Changed 2026-10-03: the fixture used to contradict itself. The task marked
// "renders results" as done and cited `tests/search_page_test.ts`, but the
// component returned only a heading, the test file did not exist, and the
// `<ProductCard>` constraint pointed at a component that was not there. Codex
// stopped on that contradiction (gpt-5.6-terra on 2026-09-02, gpt-6-luna on
// 2026-10-03), which the project rules require; earlier Claude passes had
// committed the false claim. Now `ProductCard` ships in the fixture, the
// component fetches `/api/search` and renders a card per result, and the
// cited test exists and passes — so the only open question is the status.
export const CommitDerivesInProgressBench = new class
  extends AcceptanceTestScenario {
  id = "commit-derives-in-progress-status";
  name = "Task status flips to do → in progress on partial DoD";
  skill = "commit";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override sandboxState = {
    commits: [],
    untracked: ["src/components/SearchPage.ts", "tests/search_page_test.ts"],
    expectedOutcome:
      "Agent commits the new component AND in the same commit flips the task's frontmatter `status` from `to do` to `in progress` because 1 of 3 DoD checkboxes are `[x]`.",
  };

  override async setup(sandboxPath: string) {
    const code =
      `import { type Node, type Product, ProductCard } from "./ProductCard.ts";

export type Fetch = (url: string) => Promise<Response>;

export async function SearchPage(
  query: string,
  fetchFn: Fetch = fetch,
): Promise<Node> {
  const res = await fetchFn(\`/api/search?q=\${encodeURIComponent(query)}\`);
  const products: Product[] = await res.json();
  return {
    tag: "main",
    children: [
      { tag: "h1", text: \`Results for \${query}\` },
      { tag: "section", children: products.map(ProductCard) },
    ],
  };
}
`;
    const test = `import { assertEquals } from "@std/assert";
import { SearchPage } from "../src/components/SearchPage.ts";

Deno.test("renders results", async () => {
  const urls: string[] = [];
  const fakeFetch = (url: string) => {
    urls.push(url);
    const body = [
      { id: "1", title: "Lamp", price: 12 },
      { id: "2", title: "Desk", price: 80.5 },
    ];
    return Promise.resolve(new Response(JSON.stringify(body)));
  };
  const page = await SearchPage("desk lamp", fakeFetch);
  assertEquals(urls, ["/api/search?q=desk%20lamp"]);
  const section = page.children?.[1];
  assertEquals(section?.children?.length, 2);
  assertEquals(section?.children?.[0].children?.[0].text, "Lamp");
  assertEquals(section?.children?.[1].children?.[1].text, "$80.50");
});
`;
    await Deno.mkdir(join(sandboxPath, "src/components"), { recursive: true });
    await Deno.mkdir(join(sandboxPath, "tests"), { recursive: true });
    await Deno.writeTextFile(
      join(sandboxPath, "src/components/SearchPage.ts"),
      code,
    );
    await Deno.writeTextFile(
      join(sandboxPath, "tests/search_page_test.ts"),
      test,
    );
  }

  userQuery =
    "/commit Started the search page (renders results works; pagination + empty-state still TODO). The task at documents/tasks/2026/04/add-search-page.md tracks the work. Commit what we have.";

  checklist = [
    {
      id: "code_committed",
      description: "Is `src/components/SearchPage.ts` present in a commit?",
      critical: true,
    },
    {
      id: "task_status_in_progress",
      description:
        "Read `documents/tasks/2026/04/add-search-page.md` after the commit. Does its frontmatter contain `status: in progress` (NOT `status: to do` and NOT `status: done`)? The DoD has 1/3 boxes checked, so derivation is `in progress`.",
      critical: true,
    },
    {
      id: "task_change_in_commit",
      description:
        "Run `git log -p -- documents/tasks/2026/04/add-search-page.md`. Is there a commit in the agent's session that changes the task's `status` from `to do` to `in progress`? The frontmatter rewrite must be IN A COMMIT.",
      critical: true,
    },
    {
      id: "task_file_not_deleted",
      description:
        "The task file at `documents/tasks/2026/04/add-search-page.md` must NOT have been deleted by cleanup. New-shape tasks are persistent records.",
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
