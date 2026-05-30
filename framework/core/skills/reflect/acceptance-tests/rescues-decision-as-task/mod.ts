import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Verifies FR-DOC-RESCUE: reflect detects decision passages in
// the source task file and recommends `/plan` as
// the canonical-record writer. Reflect itself MUST NOT write any files.
export const ReflectRescuesDecisionAsTaskBench = new class
  extends AcceptanceTestScenario {
  id = "reflect-rescues-decision-as-task";
  name =
    "Reflect surfaces decision passages and recommends task capture via /plan";
  skill = "reflect";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  userQuery =
    "/reflect Analyze the task file 'documents/tasks/2026/04/cache-strategy.md' for durable findings — in particular, any architectural decision with weighed alternatives that should be captured persistently as its own task record.";

  checklist = [
    {
      id: "task_file_read",
      description:
        "Did the agent read 'documents/tasks/2026/04/cache-strategy.md'?",
      critical: true,
    },
    {
      id: "decision_detected",
      description:
        "Did the agent's chat output explicitly identify a decision passage in the task file — referencing the cache backend choice (in-memory LRU over Redis / DynamoDB) or its weighed alternatives?",
      critical: true,
    },
    {
      id: "plan_skill_recommended",
      description:
        "Did the agent's chat output explicitly recommend invoking '/plan' (by that exact slash-command form) to record the decision as a persistent task? The literal token '/plan' MUST appear on the Recommended action line.",
      critical: true,
    },
    {
      id: "no_old_adr_skill_recommended",
      description:
        "Did the agent NOT recommend the deprecated '/plan-adr' or removed '/plan-exp-permanent-tasks' command on its '**Recommended action:**' line? The rescue contract now points to '/plan' exclusively. Pass if the only Recommended action line(s) in the rescue block name '/plan'.",
      critical: true,
    },
    {
      id: "no_task_file_written_by_reflect",
      description:
        "Did the agent NOT itself create a NEW task file? Reflect must NOT write under 'documents/tasks/' — that is owned by '/plan'. Pass if the only file present in 'documents/tasks/' is the pre-existing fixture 'cache-strategy.md'; the agent did NOT create any other task or write a sibling task file.",
      critical: true,
    },
    {
      id: "no_adr_file_written",
      description:
        "Did the agent NOT create any file under 'documents/adr/'? That directory is being phased out and reflect must not write there. Pass if 'documents/adr/' is empty or missing.",
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
