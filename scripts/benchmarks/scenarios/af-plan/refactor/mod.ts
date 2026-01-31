import { BenchmarkScenario } from "../../../lib/types.ts";

const AGENT_PATH = "catalog/skills/af-plan/SKILL.md";

export const PlanRefactorBench: BenchmarkScenario = {
  id: "af-plan-refactor",
  name: "Plan Refactoring of God Class",
  targetAgentPath: AGENT_PATH,

  setup: async (_sandboxPath: string) => {
    // God class is now in fixture/
  },

  userQuery:
    "/af-plan Plan a refactoring of src/UserManager.ts to separate concerns. It does too much right now.",

  checklist: [
    {
      id: "identify_responsibilities",
      description:
        "Does the plan identify separate responsibilities like Database/Storage, Validation, Email/Notification, and Logging?",
      critical: true,
      type: "semantic",
    },
    {
      id: "propose_services",
      description:
        "Does the plan propose creating separate classes or services (e.g., UserRepository, EmailService, Logger)?",
      critical: true,
      type: "semantic",
    },
    {
      id: "dependency_injection",
      description:
        "Does the plan mention using dependency injection or passing dependencies to the UserManager?",
      critical: false,
      type: "semantic",
    },
    {
      id: "test_preservation",
      description:
        "Does the plan mention ensuring functionality is preserved or adding tests before refactoring?",
      critical: true,
      type: "semantic",
    },
  ],
};
