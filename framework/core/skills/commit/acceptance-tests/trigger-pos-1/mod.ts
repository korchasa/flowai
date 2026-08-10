import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Positive: a real uncommitted change exists and the user (or an autonomous
// agent) wants it committed — `commit` should activate without being named.
// The init commit happens BEFORE setup(), so a file written here stays
// uncommitted, giving the commit skill something real to act on.
export const CommitTriggerPos1 = new class extends AcceptanceTestScenario {
  id = "commit-trigger-pos-1";
  name = "ready-to-commit request";
  skill = "commit";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };

  override sandboxState = {
    commits: [],
    untracked: ["rate_limiter.ts"],
    expectedOutcome:
      "Agent loads the commit skill and commits rate_limiter.ts as a conventional commit",
  };

  override async setup(sandboxPath: string) {
    // Leave a genuine uncommitted change so committing is warranted.
    await Deno.writeTextFile(
      `${sandboxPath}/rate_limiter.ts`,
      "export function rateLimit(count: number, max: number): boolean {\n" +
        "  return count <= max;\n}\n",
    );
  }

  userQuery =
    "The rate-limiter fix is done and the tests pass. Commit the changes as atomic, conventional commits and keep the docs in sync.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `commit` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `commit`.",
    critical: true,
  }];
}();
