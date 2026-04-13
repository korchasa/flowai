import { join } from "@std/path";
import { BenchmarkSkillScenario } from "@bench/types.ts";

/**
 * Tests that flowai-commit-beta skips documentation sync for infra-only changes
 * (test files, CI, benchmarks). The agent should commit without reading/updating
 * any documents/ files and output "Documentation sync: skipped".
 */
export const CommitBetaInfraOnlySkipBench = new class
  extends BenchmarkSkillScenario {
  id = "flowai-commit-beta-infra-only-skip";
  name = "Infra-Only Changes Skip Doc Sync";
  skill = "flowai-commit-beta";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override sandboxState = {
    commits: [],
    modified: ["math_test.ts"],
    expectedOutcome:
      "Agent commits test file without performing documentation sync",
  };

  override async setup(sandboxPath: string) {
    // Runner already committed everything (including math_test.ts) as "init".
    // Modify the test file — this is an infra-only change (test file).
    const updatedTest = `import { assertEquals } from "jsr:@std/assert";

Deno.test("add returns sum", () => {
  assertEquals(1 + 2, 3);
});

Deno.test("subtract returns difference", () => {
  assertEquals(5 - 3, 2);
});
`;
    await Deno.writeTextFile(join(sandboxPath, "math_test.ts"), updatedTest);
  }

  userQuery =
    "/flowai-commit-beta Added a subtract test in math_test.ts. Commit the changes.";

  checklist = [
    {
      id: "file_committed",
      description: "Is `math_test.ts` present in the last commit?",
      critical: true,
    },
    {
      id: "doc_sync_skipped",
      description:
        "Did the agent skip documentation sync? Look for output containing 'skipped' or 'infra-only' (or similar indication that doc sync was not performed). The agent should NOT have read or edited any files in documents/.",
      critical: true,
    },
    {
      id: "no_doc_reads",
      description:
        "Did the agent avoid reading documents/requirements.md or documents/design.md? Check the tool calls — there should be no Read calls to files inside documents/ directory.",
      critical: false,
    },
    {
      id: "conventional_commits",
      description:
        "Does the commit message follow Conventional Commits format (e.g., test: ...)?",
      critical: false,
    },
    {
      id: "clean_status",
      description: "Is the final git status clean?",
      critical: true,
    },
  ];
}();
