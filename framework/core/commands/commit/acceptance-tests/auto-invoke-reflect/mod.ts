import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const CommitBetaAutoInvokeReflectBench = new class
  extends AcceptanceTestScenario {
  id = "commit-auto-invoke-reflect";
  name = "Auto-invoke /reflect after error-prone session";
  skill = "commit";
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
      "Agent commits utils.ts, detects session complexity signals, and auto-invokes /reflect (actually executes the reflect workflow, not merely suggests it)",
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
    "/commit I had to fix the parse function after several failed attempts — parseInt was silently returning NaN, tests kept failing, and you suggested the wrong approach twice before I corrected you. The new version throws on invalid input. Commit this fix.";

  // Interactive since 2026-08-16. Step 6c of the commit atom collects ONE
  // approval before reflect runs — not permission to run it, but a decision
  // about the edits reflect may make to the user's own AGENTS.md / CLAUDE.md.
  // Without an emulated user to answer, the workflow correctly waits and
  // reflect never runs, which read as this scenario's own failure.
  interactive = true;
  userPersona =
    `You are a developer who just had a rough session with retries and two
corrected approaches. Answer briefly and affirmatively. If asked whether to
apply edits reflect proposes to the instruction files, reply: 'apply'. If asked
what went wrong, say the parse helper returned NaN silently and the first two
approaches were wrong. Never volunteer instructions about running /reflect.`;

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
        "At any point during the workflow (before or after the commit), did the agent AUTO-INVOKE /reflect — meaning it actually started executing the reflect workflow (e.g., creating a reflection plan, analyzing the session for behavioral/technical/context issues, listing concrete findings or proposed improvements)? Merely printing a one-line suggestion like 'Consider running /reflect' is NOT sufficient — the agent must have actually run the reflect workflow.",
      critical: true,
    },
    {
      id: "reflect_not_asking_permission",
      description:
        "Did the agent decide to RUN reflect on its own — never asking 'should I run /reflect?' and never waiting for permission to start it? The single approval it is supposed to collect first is a DIFFERENT question, about what happens to edits reflect may propose to AGENTS.md / CLAUDE.md ('apply' vs 'report only'); asking that one, and waiting for the answer, is correct and must NOT fail this item.",
      critical: false,
    },
  ];
}();
