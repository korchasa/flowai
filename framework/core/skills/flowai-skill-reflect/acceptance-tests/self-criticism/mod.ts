import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const ReflectSelfCriticismBench = new class
  extends AcceptanceTestScenario {
  id = "flowai-skill-reflect-self-criticism";
  name = "Reflect with Self-Criticism and Revision";
  skill = "flowai-skill-reflect";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "PricingService",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  userQuery =
    "Analyze the agent's performance in transcript.txt using flowai-skill-reflect. Identify issues and evaluate your own analysis before presenting the final report.";

  checklist = [
    {
      id: "read_transcript",
      description: "Did the agent read transcript.txt?",
      critical: true,
    },
    {
      id: "initial_findings",
      description:
        "Did the agent identify at least two issues from the transcript (e.g., modifying tests to match code instead of fixing code, unrequested try/catch addition)?",
      critical: true,
    },
    {
      id: "self_criticism_present",
      description:
        "Did the agent perform an explicit self-criticism step — questioning the validity, proportionality, or completeness of its own analysis before presenting the final report?",
      critical: true,
    },
    {
      id: "revision_visible",
      description:
        "Did the agent revise, refine, or adjust at least one of its initial findings based on the self-criticism (e.g., downgrade severity, remove a false positive, add a missed issue, or clarify a vague recommendation)?",
      critical: true,
    },
    {
      id: "proportionality_check",
      description:
        "Did the self-criticism evaluate whether proposed fixes are proportional to problem severity (e.g., questioning if a minor issue warrants a heavy process change)?",
      critical: false,
    },
    {
      id: "blind_spot_check",
      description:
        "Did the self-criticism check for blind spots or missed categories of problems in the initial analysis?",
      critical: false,
    },
    {
      id: "no_file_changes",
      description:
        "Did the agent NOT modify any project files (reflect is analysis-only)?",
      critical: true,
    },
  ];
}();
