import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";
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
    // The runner's baseline is a one-line README and `console.log("hi")`, and
    // the two edits below have to be UNRELATED for the split to be the right
    // answer. Two earlier fixtures failed that test in opposite ways: a quote
    // rewrite read as `style:` rather than feat/fix/refactor, and a retitled
    // README next to a new function read as one story — the agent committed
    // both together as "add greet function and update project title", which is
    // correct atomic-commit behaviour for changes that belong together
    // (2026-08-13). So: a docs-only correction that no code change explains,
    // and a code change no doc line mentions.
    await Deno.writeTextFile(
      join(sandboxPath, "README.md"),
      `# Old Title

## Requirements

Deno 1.30 or newer.
`,
    );
    await runGit(sandboxPath, ["add", "README.md"]);
    await runGit(sandboxPath, ["commit", "-m", "Document requirements"]);

    // Change 1: docs only — the stated minimum version was wrong. Nothing in
    // the code moves with it.
    await Deno.writeTextFile(
      join(sandboxPath, "README.md"),
      `# Old Title

## Requirements

Deno 2.0 or newer.
`,
    );
    // Change 2: code only — a new exported function the README never mentions.
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
