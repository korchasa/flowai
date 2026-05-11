import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const PlanUpdatesIndexBench = new class extends AcceptanceTestScenario {
  id = "flowai-skill-plan-updates-index-on-new-fr";
  name = "Plan updates documents/index.md when introducing a new FR";
  skill = "flowai-skill-plan";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  interactive = true;
  userPersona = `You are a developer planning a new feature. Be brief.

When the agent presents implementation variants, pick variant 1 (simplest).
When the agent asks ANY confirmation question, answer "yes, proceed".
Do NOT request changes to the plan structure or to file outputs.`;

  userQuery =
    "/flowai-skill-plan Plan a feature: add an explicit '/flowai-pause' command that lets the user temporarily pause the agent for a specified duration. This introduces a new requirement FR-PAUSE (Pause Command). Frontmatter implements: must list FR-PAUSE.";

  checklist = [
    {
      id: "task_file_created",
      description:
        "Did the agent create a task file in 'documents/tasks/<YYYY-MM-DD>-<slug>.md'?",
      critical: true,
    },
    {
      id: "task_implements_fr_pause",
      description:
        "Read the YAML frontmatter of the created task file. Does the 'implements:' list contain 'FR-PAUSE'?",
      critical: true,
    },
    {
      id: "index_file_created",
      description:
        "Did the agent create or update 'documents/index.md' (file exists at that path after the run)?",
      critical: true,
    },
    {
      id: "index_has_fr_section",
      description:
        "Read 'documents/index.md'. Does it contain a top-level section heading matching '## FR' (or equivalent like '## Functional Requirements') that holds FR rows?",
      critical: true,
    },
    {
      id: "index_row_for_fr_pause",
      description:
        "Read 'documents/index.md'. Does the FR section contain a row referencing FR-PAUSE in GFM-link form? Examples that PASS: '- [FR-PAUSE](requirements.md#fr-pause-...) — <summary> — [ ]', or any line that starts with '- ' and contains both the literal text 'FR-PAUSE' and a markdown link '(requirements.md#...)'. The summary text and exact anchor are not strict; presence of a row IS what matters.",
      critical: true,
    },
    {
      id: "index_row_uses_gfm_link",
      description:
        "Read the FR-PAUSE row in 'documents/index.md'. Does it use a standard markdown link of the form '[<text>](<path>#<anchor>)' pointing into 'requirements.md' (i.e. follows the project's Interconnectedness Principle — GFM links, not bare IDs or wikilinks)?",
      critical: true,
    },
    {
      id: "no_srs_modification",
      description:
        "Did the agent NOT modify 'documents/requirements.md' (SRS) during this run? Plan owns the index, not the SRS — SRS sections are added later in develop/commit.",
      critical: true,
    },
    {
      id: "no_code_changes",
      description:
        "Did the agent NOT modify any source code files? Only the task file and 'documents/index.md' should be created/modified.",
      critical: true,
    },
    {
      id: "no_switch_mode",
      description: "Did the logs NOT contain 'SwitchMode'?",
      critical: true,
    },
  ];
}();
