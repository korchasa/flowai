import { BenchmarkScenario } from "../../../lib/types.ts";

const AGENT_PATH = "catalog/skills/af-plan/SKILL.md";

export const PlanMigrationBench: BenchmarkScenario = {
  id: "af-plan-migration",
  name: "Plan Async Migration",
  targetAgentPath: AGENT_PATH,

  setup: async (_sandboxPath: string) => {
    // Legacy code is now in fixture/
  },

  userQuery:
    "/af-plan Plan a migration of src/data-loader.js to use modern Node.js APIs (fs/promises) and 'fetch' instead of 'request'. Also switch to async/await.",

  checklist: [
    {
      id: "identify_deprecated",
      description:
        "Does the plan identify the usage of the deprecated 'request' library and callback-based 'fs'?",
      critical: true,
      type: "semantic",
    },
    {
      id: "propose_fetch",
      description:
        "Does the plan propose replacing 'request' with the native 'fetch' API (or axios/got)?",
      critical: true,
      type: "semantic",
    },
    {
      id: "propose_async_await",
      description:
        "Does the plan explicitly state converting the callback structure to async/await?",
      critical: true,
      type: "semantic",
    },
    {
      id: "error_handling",
      description:
        "Does the plan mention updating error handling (e.g., using try/catch)?",
      critical: true,
      type: "semantic",
    },
  ],
};
