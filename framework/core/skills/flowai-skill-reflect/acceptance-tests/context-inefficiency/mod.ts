import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const ReflectContextBench = new class extends AcceptanceTestScenario {
  id = "flowai-skill-reflect-context";
  name = "Reflect on Context Inefficiency";
  skill = "flowai-skill-reflect";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "BillingService",
    TOOLING_STACK: "- TypeScript",
  };

  userQuery =
    "Analyze the agent's performance in transcript.txt using flowai-skill-reflect. Focus on context usage inefficiencies.";

  checklist = [
    {
      id: "read_transcript",
      description: "Did the agent read transcript.txt?",
      critical: true,
    },
    {
      id: "identify_redundant_reads",
      description:
        "Did the agent identify redundant file reads (auth.service.ts, email.ts are unrelated to billing bug)?",
      critical: true,
    },
    {
      id: "identify_repeated_read",
      description:
        "Did the agent identify the repeated read of invoice.ts (read twice without changes)?",
      critical: true,
    },
    {
      id: "identify_over_reading",
      description:
        "Did the agent identify over-reading (2000-line file read entirely for a single function fix)?",
      critical: false,
    },
    {
      id: "identify_missing_verification",
      description:
        "Did the agent identify missing verification (no tests run after the fix)?",
      critical: true,
    },
    {
      id: "identify_missing_docs",
      description:
        "Did the agent note that project docs (README, AGENTS.md) were never read to understand discount semantics?",
      critical: false,
    },
    {
      id: "actionable_table",
      description:
        "Did the agent present corrective actions in a structured format (table or categorized list)?",
      critical: false,
    },
    {
      id: "narrative_what_happened",
      description:
        "Does each corrective action include a 'What happened' section that tells the full story — what the agent was doing, what actions it took, and what went wrong — with enough detail that a reader who never saw the transcript understands the complete situation?",
      critical: true,
    },
    {
      id: "narrative_impact",
      description:
        "Does each corrective action include an 'Impact' section with measurable cost — tokens/lines wasted, time lost, errors introduced, or downstream consequences — not just a generic statement like '500 lines wasted'?",
      critical: true,
    },
    {
      id: "fix_has_where_and_draft",
      description:
        "Does each corrective action's proposed fix specify an exact file path + section ('Where') AND include ready-to-paste draft content (rule text, code comment, or hook config) — not just a vague action like 'add a rule'?",
      critical: true,
    },
    {
      id: "no_file_changes",
      description:
        "Did the agent NOT modify any project files (reflect is analysis-only, no changes to agent instructions/rules)?",
      critical: true,
    },
    {
      id: "specific_references",
      description:
        "Did the agent cite specific files or commands when suggesting improvements?",
      critical: false,
    },
  ];
}();
