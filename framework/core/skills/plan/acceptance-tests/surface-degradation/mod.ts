import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * Degradation path (loop5 critic round 1 objection 3): when the environment
 * has NO pre-declared agents (e.g. a Codex install without `[agents.*]`
 * declarations, or a user-pruned agent dir), the surface discipline must not
 * silently disappear — the plan degrades to inline enumeration AND writes a
 * visible degradation line under `## Follow-ups` so the human knows the
 * independent cross-check did not run.
 *
 * setup() deletes the installed agents dir AFTER the framework copy
 * (runner order: fixtures → framework → setup), simulating the no-subagent
 * environment inside the sandbox.
 */
export const PlanSurfaceDegradationBench = new class
  extends AcceptanceTestScenario {
  id = "plan-surface-degradation";
  name = "Plan degrades visibly when no subagents are available";
  skill = "plan";
  stepTimeoutMs = 420_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  async setup(sandboxPath: string) {
    await Deno.mkdir(join(sandboxPath, "documents"), { recursive: true });
    // Simulate a no-subagent environment: remove installed agent templates.
    for (const dir of [".codex/agents", ".claude/agents", ".cursor/agents"]) {
      try {
        await Deno.remove(join(sandboxPath, dir), { recursive: true });
      } catch (e) {
        if (!(e instanceof Deno.errors.NotFound)) throw e;
      }
    }
  }

  userQuery =
    "/plan Bug report: email notification subjects cut multi-byte emoji in half. Product spec: " +
    "(1) subject truncation must respect grapheme boundaries (never split a surrogate pair); " +
    "(2) every truncated subject must end with the single ellipsis character '…'. Plan the fix.";

  checklist = [
    {
      id: "task_file_created",
      description:
        "Did the agent create/write a task file in the 'documents/tasks/' directory?",
      critical: true,
    },
    {
      id: "inline_enumeration_still_present",
      description:
        "Does the plan still enumerate the affected surface inline (task file or chat lists the code sites the change touches), i.e. the discipline did not vanish together with the missing agent?",
      critical: true,
    },
    {
      id: "degradation_line_written",
      description:
        "Does the task file contain a visible degradation note (e.g. under '## Follow-ups') stating that the independent surface cross-check (surface-scout) did not run because the environment provides no subagent support? Silence about the missing cross-check is a FAIL.",
      critical: true,
    },
    {
      id: "no_failed_dispatch_loop",
      description:
        "Did the agent NOT repeatedly retry dispatching a missing subagent (at most one failed attempt is acceptable before falling back)?",
      critical: false,
    },
  ];
}();
