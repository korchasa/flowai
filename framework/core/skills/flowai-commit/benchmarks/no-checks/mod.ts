import { join } from "@std/path";
import { BenchmarkSkillScenario } from "@bench/types.ts";

export const CommitNoChecksBench = new class extends BenchmarkSkillScenario {
  id = "flowai-commit-no-checks";
  name = "Commit must NOT run project checks (review's responsibility)";
  skill = "flowai-commit";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override sandboxState = {
    commits: [],
    modified: ["file.ts"],
    expectedOutcome:
      "Agent commits file.ts WITHOUT running 'deno task check' — verification is review's responsibility, not commit's",
  };

  override async setup(sandboxPath: string) {
    await Deno.writeTextFile(join(sandboxPath, "file.ts"), "const x = 2;");
  }

  userQuery = "/flowai-commit Commit changes in file.ts.";

  checklist = [
    {
      id: "no_check_executed",
      description:
        "Did the agent skip running 'deno task check' (or any project verification command)? Commit must NOT run checks — that is review's responsibility.",
      critical: true,
    },
    {
      id: "file_committed",
      description: "Is `file.ts` present in the last commit?",
      critical: true,
    },
    {
      id: "clean_status",
      description: "Is the final git status clean?",
      critical: true,
    },
  ];
}();
