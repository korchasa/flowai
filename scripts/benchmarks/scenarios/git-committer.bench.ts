import { BenchmarkScenario } from "../lib/types.ts";
import { join } from "@std/path";

const AGENT_PATH = ".cursor/agents/git-committer.md";

export const GitCommitterBasicBench: BenchmarkScenario = {
  id: "git-committer-basic",
  name: "Basic Feature Commit",
  targetAgentPath: AGENT_PATH,

  setup: async (sandboxPath: string) => {
    await setupGitRepo(sandboxPath);
    // Create initial file
    await Deno.writeTextFile(join(sandboxPath, "README.md"), "# Test Project");
    await runGit(sandboxPath, ["add", "."]);
    await runGit(sandboxPath, ["commit", "-m", "Initial commit"]);

    // Create the "change"
    await Deno.writeTextFile(
      join(sandboxPath, "utils.ts"),
      "export const add = (a: number, b: number) => a + b; // New feature",
    );
  },

  userQuery:
    "Я добавил функцию сложения в utils.ts. Закоммить это с сообщением 'add sum function'.",

  checklist: [
    {
      id: "git_status_checked",
      description:
        "Did the agent run 'git status' or 'git diff' to check state?",
      critical: false,
    },
    {
      id: "file_committed",
      description: "Is `utils.ts` present in the last commit?",
      critical: true,
    },
    {
      id: "commit_message_match",
      description: "Does the commit message contain 'add sum function'?",
      critical: true,
    },
    {
      id: "conventional_commits",
      description: "Does the commit message follow Conventional Commits?",
      critical: false,
    },
    {
      id: "clean_status",
      description: "Is the final git status clean?",
      critical: true,
    },
  ],
};

export const GitCommitterAtomicDocsBench: BenchmarkScenario = {
  id: "git-committer-atomic-docs",
  name: "Atomic Split: Docs vs Code",
  targetAgentPath: AGENT_PATH,

  setup: async (sandboxPath: string) => {
    await setupGitRepo(sandboxPath);
    await Deno.writeTextFile(join(sandboxPath, "README.md"), "# Old Title");
    await Deno.writeTextFile(
      join(sandboxPath, "main.ts"),
      "console.log('hi');",
    );
    await runGit(sandboxPath, ["add", "."]);
    await runGit(sandboxPath, ["commit", "-m", "Initial commit"]);

    // Change 1: Docs
    await Deno.writeTextFile(join(sandboxPath, "README.md"), "# New Title");
    // Change 2: Code
    await Deno.writeTextFile(
      join(sandboxPath, "main.ts"),
      "console.log('hello');",
    );
  },

  userQuery:
    "Закоммить изменения. Я обновил README.md (доки) и main.ts (код). Раздели документацию и код.",

  checklist: [
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
  ],
};

export const GitCommitterAtomicRefactorBench: BenchmarkScenario = {
  id: "git-committer-atomic-refactor",
  name: "Atomic Split: Refactor vs Feature",
  targetAgentPath: AGENT_PATH,

  setup: async (sandboxPath: string) => {
    await setupGitRepo(sandboxPath);
    await Deno.writeTextFile(
      join(sandboxPath, "math.ts"),
      "export const sum = (a, b) => a + b;",
    );
    await runGit(sandboxPath, ["add", "."]);
    await runGit(sandboxPath, ["commit", "-m", "Initial commit"]);

    // Change 1: Refactor (rename variable) AND Change 2: Feature (new function)
    // Note: Simulating this in one file is tricky for "git add -p" via LLM without interaction.
    // Ideally, we'd use two files to make it easier for the agent, or expect it to use patch.
    // Let's use two files for reliability in this version of the benchmark,
    // as patch adding via text command is hard to simulate/verify blindly.

    // Actually, let's try two files to be fair to the "grouping" logic first.
    // File 1: Refactor
    await Deno.writeTextFile(
      join(sandboxPath, "math.ts"),
      "export const add = (a, b) => a + b; // Renamed from sum",
    );

    // File 2: New Feature
    await Deno.writeTextFile(
      join(sandboxPath, "utils.ts"),
      "export const log = (msg) => console.log(msg);",
    );
  },

  userQuery:
    "Закоммить изменения. Я переименовал функцию в math.ts (рефакторинг) и добавил utils.ts (новая фича). Отдели рефакторинг от новой фичи.",

  checklist: [
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
  ],
};

export const GitCommitterCheckBench: BenchmarkScenario = {
  id: "git-committer-check",
  name: "Pre-flight Check",
  targetAgentPath: AGENT_PATH,

  setup: async (sandboxPath: string) => {
    await setupGitRepo(sandboxPath);
    await Deno.writeTextFile(
      join(sandboxPath, "deno.json"),
      `{ "tasks": { "check": "echo 'checking...'" } }`,
    );
    await Deno.writeTextFile(join(sandboxPath, "file.ts"), "const x = 1;");
    await runGit(sandboxPath, ["add", "."]);
    await runGit(sandboxPath, ["commit", "-m", "Initial commit"]);

    // Make a change
    await Deno.writeTextFile(join(sandboxPath, "file.ts"), "const x = 2;");
  },

  userQuery: "Закоммить изменения в file.ts.",

  checklist: [
    {
      id: "check_executed",
      description: "Did the agent run 'deno task check'?",
      critical: false, // It's in the rules, but maybe not CRITICAL for the commit itself to succeed, but good practice.
    },
    {
      id: "clean_status",
      description: "Is the final git status clean?",
      critical: true,
    },
  ],
};

export const GitCommitterSyncDocsBench: BenchmarkScenario = {
  id: "git-committer-sync-docs",
  name: "Workspace Sync: Docs Update",
  targetAgentPath: AGENT_PATH,

  setup: async (sandboxPath: string) => {
    await setupGitRepo(sandboxPath);
    await Deno.mkdir(join(sandboxPath, "documents"), { recursive: true });
    await Deno.writeTextFile(
      join(sandboxPath, "documents/README.md"),
      "# Docs\nOld content",
    );
    await Deno.writeTextFile(
      join(sandboxPath, "src.ts"),
      "console.log('old');",
    );
    await runGit(sandboxPath, ["add", "."]);
    await runGit(sandboxPath, ["commit", "-m", "Initial commit"]);

    // Change source code
    await Deno.writeTextFile(
      join(sandboxPath, "src.ts"),
      "console.log('new feature');",
    );
  },

  userQuery:
    "Я добавил новую фичу в src.ts. Закоммить изменения, но сначала обнови документацию в documents/README.md, чтобы отразить изменения.",

  checklist: [
    {
      id: "docs_updated",
      description: "Did the agent update 'documents/README.md'?",
      critical: true,
    },
    {
      id: "docs_committed",
      description: "Is the documentation change included in a commit?",
      critical: true,
    },
  ],
};

export const GitCommitterAtomicHunkBench: BenchmarkScenario = {
  id: "git-committer-atomic-hunk",
  name: "Atomic Split: Hunk (Style vs Logic)",
  targetAgentPath: AGENT_PATH,

  setup: async (sandboxPath: string) => {
    await setupGitRepo(sandboxPath);
    await Deno.writeTextFile(
      join(sandboxPath, "code.ts"),
      "function old(){ return 1; }",
    );
    await runGit(sandboxPath, ["add", "."]);
    await runGit(sandboxPath, ["commit", "-m", "Initial commit"]);

    // Change 1: Logic (rename function)
    // Change 2: Style (add spaces)
    // We put them on different lines to make it easier for 'git add -p' or manual hunk selection
    await Deno.writeTextFile(
      join(sandboxPath, "code.ts"),
      "function newName() { return 1; } \n// Added comment for style",
    );
  },

  userQuery:
    "Закоммить изменения. Я переименовал функцию (логика) и добавил комментарий (стиль). Раздели их на два коммита (style и refactor).",

  checklist: [
    {
      id: "multiple_commits",
      description: "Did the agent create at least 2 new commits?",
      critical: true,
    },
    {
      id: "style_commit",
      description: "Is there a commit with type 'style'?",
      critical: true,
    },
    {
      id: "refactor_commit",
      description: "Is there a commit with type 'refactor'?",
      critical: true,
    },
  ],
};

export const GitCommitterDepsBench: BenchmarkScenario = {
  id: "git-committer-deps",
  name: "Atomic Split: Deps vs Logic",
  targetAgentPath: AGENT_PATH,

  setup: async (sandboxPath: string) => {
    await setupGitRepo(sandboxPath);
    await Deno.writeTextFile(
      join(sandboxPath, "deno.json"),
      `{ "version": "1.0.0" }`,
    );
    await Deno.writeTextFile(
      join(sandboxPath, "mod.ts"),
      "export const v = 1;",
    );
    await runGit(sandboxPath, ["add", "."]);
    await runGit(sandboxPath, ["commit", "-m", "Initial commit"]);

    // Change 1: Bump version
    await Deno.writeTextFile(
      join(sandboxPath, "deno.json"),
      `{ "version": "1.1.0" }`,
    );
    // Change 2: Logic
    await Deno.writeTextFile(
      join(sandboxPath, "mod.ts"),
      "export const v = 2;",
    );
  },

  userQuery:
    "Закоммить изменения. Я обновил версию в deno.json и логику в mod.ts. Раздели их.",

  checklist: [
    {
      id: "multiple_commits",
      description: "Did the agent create at least 2 new commits?",
      critical: true,
    },
    {
      id: "chore_commit",
      description:
        "Is there a commit with type 'chore' or 'build' for json change?",
      critical: true,
    },
    {
      id: "feat_fix_commit",
      description: "Is there a commit with type 'feat' or 'fix' for logic?",
      critical: true,
    },
  ],
};

export const GitCommitterCheckFailBench: BenchmarkScenario = {
  id: "git-committer-check-fail",
  name: "Pre-flight Check Failure",
  targetAgentPath: AGENT_PATH,

  setup: async (sandboxPath: string) => {
    await setupGitRepo(sandboxPath);
    // Create a check task that fails
    await Deno.writeTextFile(
      join(sandboxPath, "deno.json"),
      `{ "tasks": { "check": "exit 1" } }`,
    );
    await Deno.writeTextFile(join(sandboxPath, "file.ts"), "const x = 1;");
    await runGit(sandboxPath, ["add", "."]);
    await runGit(sandboxPath, ["commit", "-m", "Initial commit"]);

    // Make a change
    await Deno.writeTextFile(join(sandboxPath, "file.ts"), "const x = 2;");
  },

  userQuery: "Закоммить изменения.",

  checklist: [
    {
      id: "check_executed",
      description: "Did the agent run 'deno task check'?",
      critical: true,
    },
    {
      id: "no_commit_on_fail",
      description: "Did the agent ABORT the commit process (no new commits)?",
      critical: true,
    },
  ],
};

// --- Helpers ---

async function setupGitRepo(path: string) {
  await runGit(path, ["init"]);
  await runGit(path, ["config", "user.name", "Benchmark Bot"]);
  await runGit(path, ["config", "user.email", "bot@example.com"]);
}

async function runGit(cwd: string, args: string[]) {
  const cmd = new Deno.Command("git", {
    args,
    cwd,
    stdout: "null",
    stderr: "null",
  });
  await cmd.output();
}
