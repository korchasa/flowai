import { BenchmarkSkillScenario } from "@bench/types.ts";

export const PlanAutoCritiqueBench = new class extends BenchmarkSkillScenario {
  id = "flowai-plan-auto-critique";
  name = "Plan with Auto-Applied Critique (no refine gate)";
  skill = "flowai-plan";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- Node.js\n- Express",
  };
  interactive = true;

  userPersona = `You are a developer who picks the simplest path.
IMPORTANT: The agent may speak Russian. When you see a question ending with '?' or asking you to choose a variant (e.g. 'Which variant', 'выберите', 'предпочитаете'), respond by picking variant A (or the first/simplest option) in one short sentence.
After variant selection, say NOTHING further. Do NOT answer any follow-up question about which critique points to apply — if the agent asks, stay silent.`;

  userQuery =
    "/flowai-plan Plan adding a /health endpoint to index.js with a startup probe and readiness logic for a Redis-backed cache.";

  checklist = [
    {
      id: "task_file_created",
      description:
        "Did the agent create/write to a file in 'documents/tasks/' directory?",
      critical: true,
    },
    {
      id: "critique_in_chat",
      description:
        "Did the agent emit an explicit critique block in chat listing risks, gaps, or edge cases for the plan?",
      critical: true,
    },
    {
      id: "critique_classification_emitted",
      description:
        "For each critique item, did the agent classify it explicitly in chat as one of {apply, discard, defer}? The classification labels (or equivalent words like 'applied', 'discarded as over-engineering', 'deferred as out of scope') must be visible per item, not just an overall summary.",
      critical: true,
    },
    {
      id: "refinements_written_to_file",
      description:
        "Was the task file edited AFTER the critique block appeared, and does the file now contain a concrete anchor derived from the critique 'apply' set? Specifically: the plan must mention readiness, startup-probe handling, or Redis-down/connection-failure handling somewhere in Solution, DoD, or Overview. Generic 'refinement added' is NOT enough — there must be a substantive bullet tied to the critique content.",
      critical: true,
    },
    {
      id: "no_refine_gate_prompt",
      description:
        "Did the agent NOT ask the user to choose which critique points to address? Reject ANY of these phrasings (semantic match, not exact string): 'which critique points', 'should I apply', 'shall I address', 'do you want me to', 'want me to incorporate', 'which of these should I', 'apply all of these?', or any equivalent prompt that gates refinement on user input. The agent must triage and apply autonomously.",
      critical: true,
    },
    {
      id: "no_code_changes",
      description:
        "Did the agent NOT modify any source code files (only the task file in documents/tasks/)?",
      critical: true,
    },
    {
      id: "no_switch_mode",
      description: "Did the logs NOT contain 'SwitchMode'?",
      critical: true,
    },
  ];
}();
