import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const WriteGodsTasksTriggerPos1 = new class
  extends AcceptanceTestScenario {
  id = "write-gods-tasks-trigger-pos-1";
  name = "GODS-format task draft";
  skill = "write-gods-tasks";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  /**
   * The work to write up is named in the query. It was not until 2026-08-20:
   * the old wording asked to "write up tomorrow's work" without saying what
   * tomorrow's work was, so the agent listed the project and then stopped to
   * ask what should go in the file. That is a malformed scenario — it measures
   * nothing about this skill's description — and it is the fourth of its kind
   * found in this suite in one day.
   *
   * With a subject supplied the scenario measures something, and it is red:
   * 0/3 the same evening with 13, 16 and 27 tool calls — the agent writes the
   * GODS file itself. The format is in AGENTS.md, which the sandbox always
   * mounts, so the model has no reason to open a skill that teaches it. Still
   * open, and the question it raises is whether this skill earns its keep
   * beside the project template rather than how its description is worded.
   */
  userQuery =
    "Tomorrow I'm adding retry-with-backoff to our HTTP client — three attempts, exponential delay, no retry on 4xx. Write it up in our usual GODS format: goal, overview, DoD, solution.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `write-gods-tasks` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `write-gods-tasks`.",
    critical: true,
  }];
}();
