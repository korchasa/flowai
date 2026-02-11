import { BenchmarkSkillScenario } from "../../../../scripts/benchmarks/lib/types.ts";

export const ReflectContextBench = new class extends BenchmarkSkillScenario {
  id = "af-reflect-context";
  name = "Reflect on Context Inefficiency";
  skill = "af-reflect";

  userQuery =
    "Analyze the agent's performance in transcript.txt using af-reflect. Focus on context usage inefficiencies.";

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
      type: "semantic" as const,
    },
    {
      id: "identify_repeated_read",
      description:
        "Did the agent identify the repeated read of invoice.ts (read twice without changes)?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "identify_over_reading",
      description:
        "Did the agent identify over-reading (2000-line file read entirely for a single function fix)?",
      critical: false,
      type: "semantic" as const,
    },
    {
      id: "identify_missing_verification",
      description:
        "Did the agent identify missing verification (no tests run after the fix)?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "identify_missing_docs",
      description:
        "Did the agent note that project docs (README, AGENTS.md) were never read to understand discount semantics?",
      critical: false,
      type: "semantic" as const,
    },
    {
      id: "actionable_table",
      description:
        "Did the agent present corrective actions in a structured format (table or categorized list)?",
      critical: false,
      type: "semantic" as const,
    },
  ];
}();
