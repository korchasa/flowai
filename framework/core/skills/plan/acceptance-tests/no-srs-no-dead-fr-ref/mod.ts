import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * A project whose AGENTS.md declares the requirements lifecycle but whose
 * requirements document does not exist yet, and a request that names no FR.
 * Observed 2026-10-06 in `ship-full-cycle-success`: the plan coined
 * `FR-STRING-TRIM`, put it in `implements:` and registered an index row whose
 * reference resolves nowhere. Where the requirement's text goes is the agent's
 * call — ask the user, or record it in a document the project has — but an FR
 * it references must have its text somewhere.
 */
export const PlanNoSrsNoDeadFrRef = new class extends AcceptanceTestScenario {
  id = "plan-no-srs-no-dead-fr-ref";
  name = "Plan references no FR whose text is recorded nowhere";
  skill = "plan";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "StringUtils",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };
  interactive = true;

  userQuery =
    "/plan Add a configurable `trim(input, options?)` helper to strings.ts that supports trimming a custom character set (e.g. trim leading commas + spaces), in addition to the default whitespace-only trim.";

  userPersona = `You are a developer planning a small helper. Be brief.
When the agent presents implementation variants, pick variant 1 (simplest).
When the agent asks where to record a requirement, say it is up to the agent.
When the agent asks any other confirmation question, answer "yes, proceed".
Do not name any requirement ID yourself.`;

  checklist = [
    {
      id: "task_file_created",
      description:
        "Did the agent create a task file in `documents/tasks/<YYYY>/<MM>/<slug>.md`?",
      critical: true,
    },
    {
      id: "no_dead_fr_ref",
      description:
        "Collect every FR-* identifier the agent wrote anywhere — the task file's `implements:` and Definition of Done, a documentation index row, a code comment. Does EACH of them have a section of its own that states the requirement — a heading or entry defining that FR-ID in the README, in a requirements document, or in another project document? The places that only REFERENCE the FR do not count as its record: the task file (frontmatter, Goal, Definition of Done, Solution), a documentation index row, a code comment. Writing no FR-* identifier at all passes. One FR-* identifier that is referenced but defined in no section of its own fails this item.",
      critical: true,
    },
    {
      id: "dod_has_evidence",
      description:
        "Does every `## Definition of Done` item of the task file carry a runnable test or evidence command?",
      critical: false,
    },
    {
      id: "no_code_changes",
      description:
        "Did the agent NOT modify `strings.ts`, `strings_test.ts` or any other source file?",
      critical: true,
    },
  ];
}();
