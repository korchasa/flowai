import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { join } from "@std/path";

export const CommitAtomicRefactorBench = new class
  extends AcceptanceTestScenario {
  id = "commit-atomic-refactor";
  name = "Atomic Split: Refactor vs Feature";
  skill = "commit";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override sandboxState = {
    commits: [],
    modified: ["math.ts"],
    untracked: ["utils.ts"],
    expectedOutcome:
      "Agent splits changes into at least 2 commits: refactor and feat",
  };

  override async setup(sandboxPath: string) {
    // Runner already committed everything as "init".
    // File 1: Refactor
    await Deno.writeTextFile(
      join(sandboxPath, "math.ts"),
      // Typed and newline-terminated: implicit-any parameters made the agent
      // ask for types instead of committing (sweep of 2026-09-02).
      "export const add = (a: number, b: number): number => a + b; // Renamed from sum\n",
    );

    // File 2: New Feature
    await Deno.writeTextFile(
      join(sandboxPath, "utils.ts"),
      "export const log = (msg: string): void => console.log(msg);\n",
    );
  }

  userQuery =
    "/commit Commit changes. I renamed a function in math.ts (refactoring) and added utils.ts (new feature). Separate refactoring from the new feature.";

  checklist = [
    {
      id: "multiple_commits",
      description: "Did the agent create at least 2 new commits?",
      critical: true,
    },
    {
      id: "refactor_commit",
      description: "Is there a commit with type 'refactor'?",
      critical: true,
    },
    {
      id: "feat_commit",
      description: "Is there a commit with type 'feat'?",
      critical: true,
    },
  ];
}();
