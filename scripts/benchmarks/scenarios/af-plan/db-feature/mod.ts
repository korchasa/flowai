import { BenchmarkScenario } from "../../../lib/types.ts";

const AGENT_PATH = "catalog/skills/af-plan/SKILL.md";

export const PlanDbFeatureBench: BenchmarkScenario = {
  id: "af-plan-db",
  name: "Plan Database Feature",
  targetAgentPath: AGENT_PATH,

  setup: async (_sandboxPath: string) => {
    // Initial state is automatically loaded from 'fixture/' directory.
    // Use this function only for dynamic setup (e.g., git init, complex mocks).
  },

  userQuery:
    "/af-plan Plan adding a 'role' field to the User model. It should be an enum with values 'USER' and 'ADMIN', defaulting to 'USER'. Update the registration flow to support it.",

  checklist: [
    {
      id: "schema_update",
      description:
        "Does the plan include updating 'prisma/schema.prisma' with the new Role enum and field?",
      critical: true,
      type: "semantic",
    },
    {
      id: "migration_step",
      description:
        "Does the plan include a step to create/run the database migration (e.g., 'prisma migrate')?",
      critical: true,
      type: "semantic",
    },
    {
      id: "service_update",
      description:
        "Does the plan include updating 'src/user.service.ts' to accept and handle the optional role parameter?",
      critical: true,
      type: "semantic",
    },
    {
      id: "default_value",
      description:
        "Does the plan mention setting the default value to 'USER' in the schema?",
      critical: true,
      type: "semantic",
    },
  ],
};
