import { BenchmarkSkillScenario } from "@bench/types.ts";

export const ReflectRescuesDecisionAsAdrBench = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-reflect-rescues-decision-as-adr";
  name = "Reflect surfaces decision passages and recommends ADR capture";
  skill = "flowai-skill-reflect";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  userQuery =
    "/flowai-skill-reflect Analyze the task file 'documents/tasks/2026-04-30-cache-strategy.md' for durable findings — in particular, any architectural decision with weighed alternatives that should be captured persistently.";

  checklist = [
    {
      id: "task_file_read",
      description:
        "Did the agent read 'documents/tasks/2026-04-30-cache-strategy.md'?",
      critical: true,
    },
    {
      id: "decision_detected",
      description:
        "Did the agent's chat output explicitly identify a decision passage in the task file — referencing the cache backend choice (in-memory LRU over Redis / DynamoDB) or its weighed alternatives?",
      critical: true,
    },
    {
      id: "adr_skill_recommended",
      description:
        "Did the agent's chat output explicitly recommend invoking 'flowai-skill-plan-adr' (by that exact skill name, or via '/flowai-skill-plan-adr' command form) to record the decision as an ADR?",
      critical: true,
    },
    {
      id: "no_adr_file_written",
      description:
        "Did the agent NOT itself create an ADR file? Reflect must NOT write under 'documents/adr/' — that is owned by 'flowai-skill-plan-adr'. Pass if the directory 'documents/adr/' is empty or missing AND no ADR-shaped markdown file was created in this run.",
      critical: true,
    },
    {
      id: "no_file_changes",
      description:
        "Did the agent NOT modify any project files? Reflect is analysis-only; the rescue pass produces chat recommendations, not edits. Allowed: agent may CREATE its own scratch/todo artifacts via the task management tool, but no project files should be written.",
      critical: true,
    },
    {
      id: "no_srs_modification",
      description:
        "Did the agent NOT create or modify 'documents/requirements.md'?",
      critical: true,
    },
    {
      id: "no_sds_modification",
      description: "Did the agent NOT create or modify 'documents/design.md'?",
      critical: true,
    },
  ];
}();
