import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * A project whose AGENTS.md declares the requirements lifecycle but whose
 * requirements document does not exist yet, and a request that names no FR.
 * Observed 2026-10-06 in `ship-full-cycle-success`: the plan coined
 * `FR-STRING-TRIM`, put it in `implements:` and registered an index row whose
 * reference resolves nowhere; every later gate then bound to an FR that had
 * no section to live in. Creating the requirements document is `init`'s job.
 */
export const PlanNoSrsNoCoinedFr = new class extends AcceptanceTestScenario {
  id = "plan-no-srs-no-coined-fr";
  name = "Plan coins no FR when the project has no requirements document";
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
When the agent asks ANY confirmation question, answer "yes, proceed".
Do not name any requirement ID yourself, and do not ask for documents to be created.`;

  checklist = [
    {
      id: "task_file_created",
      description:
        "Did the agent create a task file in `documents/tasks/<YYYY>/<MM>/<slug>.md`?",
      critical: true,
    },
    {
      id: "implements_empty",
      description:
        "Read the YAML frontmatter of the created task file. Is `implements:` present and EMPTY (`[]` or no items)? Any FR-* identifier listed there fails this item: the project has no requirements document, and the user named no FR.",
      critical: true,
    },
    {
      id: "no_index_fr_row",
      description:
        "Did the agent NOT add an FR row to a documentation index (`documents/index.md` absent after the run, or present with no FR-* row)?",
      critical: true,
    },
    {
      id: "no_srs_created",
      description:
        "Did the agent NOT create `documents/requirements.md` or any other requirements document?",
      critical: true,
    },
    {
      id: "dod_has_evidence",
      description:
        "Does every `## Definition of Done` item of the task file still carry a runnable test or evidence command (it may omit an FR-ID)?",
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
