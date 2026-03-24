import { BenchmarkSkillScenario } from "../../../../../scripts/benchmarks/lib/types.ts";

export const PlanDbFeatureBench = new class extends BenchmarkSkillScenario {
  id = "flow-plan-db";
  name = "Plan Database Feature";
  skill = "flow-plan";
  stepTimeoutMs = 120_000;

  userQuery =
    "/flow-plan Plan adding a 'role' field to the User model. It should be an enum with values 'USER' and 'ADMIN', defaulting to 'USER'. Update the registration flow to support it.";

  checklist = [
    {
      id: "schema_update",
      description:
        "Does the plan include updating 'prisma/schema.prisma' with the new Role enum and field?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "migration_step",
      description:
        "Does the plan include a step to create/run the database migration (e.g., 'prisma migrate')?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "service_update",
      description:
        "Does the plan include updating 'src/user.service.ts' to accept and handle the optional role parameter?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "default_value",
      description:
        "Does the plan mention setting the default value to 'USER' in the schema?",
      critical: true,
      type: "semantic" as const,
    },
  ];
}();
