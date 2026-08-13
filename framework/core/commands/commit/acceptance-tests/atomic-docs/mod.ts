import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { join } from "@std/path";

export const CommitAtomicDocsBench = new class extends AcceptanceTestScenario {
  id = "commit-atomic-docs";
  name = "Atomic Split: Docs vs Code";
  skill = "commit";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override sandboxState = {
    commits: [],
    modified: ["README.md", "main.ts"],
    expectedOutcome:
      "Agent splits changes into at least 2 commits: docs and code",
  };

  override async setup(sandboxPath: string) {
    // Runner already committed everything as "init".
    // Change 1: Docs
    await Deno.writeTextFile(join(sandboxPath, "README.md"), "# New Title");
    // Change 2: Code. A real function, not a reworded string — the baseline is
    // `console.log("hi");`, and rewriting it to `console.log('hello');` changes
    // the quotes and the text at once. The agent read the quotes, committed
    // `style:`, and failed a checklist that asks for feat/fix/refactor
    // (2026-08-13). This scenario tests the docs-vs-code split, so the code
    // side has to be unambiguously code.
    await Deno.writeTextFile(
      join(sandboxPath, "main.ts"),
      `export function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

console.log(greet("world"));
`,
    );
  }

  userQuery =
    "/commit Commit changes. I updated README.md (docs) and main.ts (code). Split documentation and code.";

  checklist = [
    {
      id: "multiple_commits",
      description: "Did the agent create at least 2 new commits?",
      critical: true,
    },
    {
      id: "docs_commit",
      description: "Is there a commit with type 'docs'?",
      critical: true,
    },
    {
      id: "feat_fix_commit",
      description: "Is there a commit with type 'feat', 'fix', or 'refactor'?",
      critical: true,
    },
    {
      id: "clean_status",
      description: "Is the final git status clean?",
      critical: true,
    },
  ];
}();
