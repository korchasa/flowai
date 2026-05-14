import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const CommitSuggestReflectBench = new class
  extends AcceptanceTestScenario {
  id = "flowai-commit-suggest-reflect";
  name = "Suggest /flowai-reflect after error-prone session";
  skill = "flowai-commit";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "UtilsProject",
    TOOLING_STACK: "- TypeScript",
  };

  override sandboxState = {
    commits: [],
    modified: ["utils.ts"],
    expectedOutcome:
      "Agent commits utils.ts and suggests running /flowai-reflect",
  };

  override async setup(sandboxPath: string) {
    // Runner already committed everything as "init".
    // Modify utils.ts — simulates a fix after errors
    await Deno.writeTextFile(
      join(sandboxPath, "utils.ts"),
      [
        "export function parse(input: string): number {",
        "  const result = Number(input);",
        "  if (isNaN(result)) throw new Error(`Invalid number: ${input}`);",
        "  return result;",
        "}",
        "",
      ].join("\n"),
    );
  }

  userQuery =
    "/flowai-commit I had to fix the parse function after several failed attempts — parseInt was silently returning NaN. The new version throws on invalid input. Commit this fix.";

  checklist = [
    {
      id: "file_committed",
      description: "Is `utils.ts` present in the last commit?",
      critical: true,
    },
    {
      id: "conventional_commits",
      description: "Does the commit message follow Conventional Commits?",
      critical: true,
    },
    {
      id: "suggest_reflect",
      description:
        "At any point during the workflow (before or after the commit), does the agent suggest running `/flowai-reflect` (or mention reflect) based on the session having errors/retries/workarounds?",
      critical: true,
    },
  ];
}();
