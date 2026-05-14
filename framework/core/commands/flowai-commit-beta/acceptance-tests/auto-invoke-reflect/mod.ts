import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const CommitBetaAutoInvokeReflectBench = new class
  extends AcceptanceTestScenario {
  id = "flowai-commit-beta-auto-invoke-reflect";
  name = "Auto-invoke /flowai-reflect after error-prone session";
  skill = "flowai-commit-beta";
  stepTimeoutMs = 420_000;
  maxSteps = 30;
  agentsTemplateVars = {
    PROJECT_NAME: "UtilsProject",
    TOOLING_STACK: "- TypeScript",
  };

  override sandboxState = {
    commits: [],
    modified: ["utils.ts"],
    expectedOutcome:
      "Agent commits utils.ts, detects session complexity signals, and auto-invokes /flowai-reflect (actually executes the reflect workflow, not merely suggests it)",
  };

  override async setup(sandboxPath: string) {
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
    "/flowai-commit-beta I had to fix the parse function after several failed attempts — parseInt was silently returning NaN, tests kept failing, and you suggested the wrong approach twice before I corrected you. The new version throws on invalid input. Commit this fix.";

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
      id: "reflect_auto_invoked",
      description:
        "At any point during the workflow (before or after the commit), did the agent AUTO-INVOKE /flowai-reflect — meaning it actually started executing the reflect workflow (e.g., creating a reflection plan, analyzing the session for behavioral/technical/context issues, listing concrete findings or proposed improvements)? Merely printing a one-line suggestion like 'Consider running /flowai-reflect' is NOT sufficient — the agent must have actually run the reflect workflow.",
      critical: true,
    },
    {
      id: "reflect_not_asking_permission",
      description:
        "Did the agent proceed autonomously (without asking the user 'should I run /flowai-reflect?' or waiting for confirmation) once it detected session-complexity signals?",
      critical: false,
    },
  ];
}();
