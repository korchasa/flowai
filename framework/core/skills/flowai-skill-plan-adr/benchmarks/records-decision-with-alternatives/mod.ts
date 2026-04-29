import { BenchmarkSkillScenario } from "@bench/types.ts";

export const PlanAdrRecordsDecisionBench = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-plan-adr-records-decision-with-alternatives";
  name = "ADR records decision with alternatives";
  skill = "flowai-skill-plan-adr";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  interactive = true;
  userPersona =
    `You are a developer who has already decided to use SQLite over PostgreSQL for a small CLI tool's local cache. Reasoning: zero-ops, single-file, sufficient for the workload (<10MB, single-user). PostgreSQL was considered but rejected because the operational overhead is not justified for a single-user CLI. DuckDB was also briefly considered but rejected because analytical queries are not needed.

When the agent shows you a draft ADR, briefly approve it ("looks good, write it") without requesting major changes. Do NOT ask the agent to add new alternatives or change the chosen path. Keep replies short. If the agent asks "should I proceed?" after you already approved, just say "yes, write it".`;

  userQuery =
    "/flowai-skill-plan-adr Record our decision to use SQLite for the local cache instead of PostgreSQL.";

  checklist = [
    {
      id: "adr_file_created",
      description:
        "Did the agent create a file under 'documents/adr/' (path matches 'documents/adr/<YYYY-MM-DD>-<slug>.md')?",
      critical: true,
    },
    {
      id: "frontmatter_id_assigned",
      description:
        "Read the created ADR file. Does its YAML frontmatter contain a line matching 'id: ADR-NNNN' (4-digit zero-padded number, e.g., 'id: ADR-0001')?",
      critical: true,
    },
    {
      id: "frontmatter_status",
      description:
        "Read the created ADR file. Does its frontmatter contain 'status:' with one of: proposed | accepted | rejected | superseded | deprecated?",
      critical: true,
    },
    {
      id: "four_madr_sections_in_order",
      description:
        "Read the created ADR file. Does the body contain exactly four top-level (## ) sections in this order: '## Context', '## Alternatives', '## Decision', '## Consequences'? Order matters.",
      critical: true,
    },
    {
      id: "chosen_alternative_marked",
      description:
        "Read the '## Alternatives' section of the ADR. Is one alternative explicitly marked as chosen (e.g., '(CHOSEN)' marker, or otherwise unambiguously identified as the selected option)?",
      critical: true,
    },
    {
      id: "rejection_cause_present",
      description:
        "Read the '## Alternatives' section. Does at least one non-chosen alternative carry an explicit rejection rationale (e.g., a 'Rejected because:' line or equivalent sentence stating WHY it was not chosen)?",
      critical: true,
    },
    {
      id: "no_srs_modification",
      description:
        "Did the agent NOT create or modify 'documents/requirements.md' (SRS) during this run?",
      critical: true,
    },
    {
      id: "no_sds_modification",
      description:
        "Did the agent NOT create or modify 'documents/design.md' (SDS) during this run?",
      critical: true,
    },
    {
      id: "no_code_changes",
      description:
        "Did the agent NOT modify any source code files (only the ADR file and any task-tracking artifacts)?",
      critical: true,
    },
  ];
}();
