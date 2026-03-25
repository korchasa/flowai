import { BenchmarkSkillScenario } from "../../../../../../scripts/benchmarks/lib/types.ts";

export const PlanRefactorBench = new class extends BenchmarkSkillScenario {
  id = "flowai-plan-refactor";
  name = "Plan Refactoring of God Class";
  skill = "flowai-plan";
  stepTimeoutMs = 120_000;

  userQuery =
    "/flowai-plan Plan a refactoring of src/UserManager.ts to separate concerns. It does too much right now.";

  checklist = [
    {
      id: "identify_responsibilities",
      description:
        "Does the plan identify separate responsibilities like Database/Storage, Validation, Email/Notification, and Logging?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "propose_services",
      description:
        "Does the plan propose creating separate classes or services (e.g., UserRepository, EmailService, Logger)?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "dependency_injection",
      description:
        "Does the plan mention using dependency injection or passing dependencies to the UserManager?",
      critical: false,
      type: "semantic" as const,
    },
    {
      id: "test_preservation",
      description:
        "Does the plan mention ensuring functionality is preserved or adding tests before refactoring?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "no_implementation",
      description:
        "Did the agent follow the rule to NOT modify any files except files in documents/whiteboards/?",
      critical: true,
      type: "semantic" as const,
    },
  ];

  simulatedUser = {
    responses: [
      {
        trigger:
          /I will (now|begin to) (apply|implement|modify|update|refactor)/i,
        response:
          "Wait, you are a planner. You must NOT modify any files except files in documents/whiteboards/. Please just finish the plan.",
      },
    ],
  };
}();
