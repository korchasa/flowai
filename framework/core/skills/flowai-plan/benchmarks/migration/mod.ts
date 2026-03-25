import { BenchmarkSkillScenario } from "../../../../../../scripts/benchmarks/lib/types.ts";

export const PlanMigrationBench = new class extends BenchmarkSkillScenario {
  id = "flowai-plan-migration";
  name = "Plan Async Migration";
  skill = "flowai-plan";
  stepTimeoutMs = 120_000;

  userQuery =
    "/flowai-plan Plan a migration of src/data-loader.js to use modern Node.js APIs (fs/promises) and 'fetch' instead of 'request'. Also switch to async/await.";

  checklist = [
    {
      id: "identify_deprecated",
      description:
        "Does the plan identify the usage of the deprecated 'request' library and callback-based 'fs'?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "propose_fetch",
      description:
        "Does the plan propose replacing 'request' with the native 'fetch' API (or axios/got)?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "propose_async_await",
      description:
        "Does the plan explicitly state converting the callback structure to async/await?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "error_handling",
      description:
        "Does the plan mention updating error handling (e.g., using try/catch)?",
      critical: true,
      type: "semantic" as const,
    },
  ];
}();
