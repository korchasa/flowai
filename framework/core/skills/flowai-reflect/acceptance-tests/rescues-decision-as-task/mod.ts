import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Verifies FR-DOC-RESCUE: flowai-reflect detects decision passages in
// the source task file and recommends `/flowai-plan-exp-permanent-tasks` as
// the canonical-record writer. Reflect itself MUST NOT write any files.
export const ReflectRescuesDecisionAsTaskBench = new class
  extends AcceptanceTestScenario {
  id = "flowai-reflect-rescues-decision-as-task";
  name =
    "Reflect surfaces decision passages and recommends task capture via /flowai-plan-exp-permanent-tasks";
  skill = "flowai-reflect";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  userQuery =
    "/flowai-reflect Analyze the task file 'documents/tasks/2026/04/cache-strategy.md' for durable findings — in particular, any architectural decision with weighed alternatives that should be captured persistently as its own task record.";

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
      id: "plan_exp_skill_recommended",
      description:
        "Did the agent's chat output explicitly recommend invoking '/flowai-plan-exp-permanent-tasks' (by that exact slash-command form) to record the decision as a persistent task? The literal token '/flowai-plan-exp-permanent-tasks' MUST appear on the Recommended action line.",
      critical: true,
    },
    {
      id: "no_old_adr_skill_recommended",
      description:
        "Did the agent NOT recommend the deprecated '/flowai-plan-adr' command on its '**Recommended action:**' line? The rescue contract now points to '/flowai-plan-exp-permanent-tasks' exclusively. Pass if the only Recommended action line(s) in the rescue block name '/flowai-plan-exp-permanent-tasks' (the agent may MENTION 'flowai-plan-adr' elsewhere as historical context, e.g. quoting old AGENTS.md text — that is allowed; the failing condition is recommending it as the action to invoke).",
      critical: true,
    },
    {
      id: "no_task_file_written_by_reflect",
      description:
        "Did the agent NOT itself create a NEW task file? Reflect must NOT write under 'documents/tasks/' — that is owned by '/flowai-plan-exp-permanent-tasks'. Pass if the only file present in 'documents/tasks/' is the pre-existing fixture 'cache-strategy.md'; the agent did NOT create any other task or write a sibling task file.",
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
