import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * The plan skill waits for a variant choice before it fills `## Solution`, so
 * the checklist below — schema, migration and service steps — can only be met
 * when a simulated user answers. The persona picks the variant that does what
 * the request says and leaves everything else to the agent.
 *
 * The fixture has no SRS and no README. The question of where a new
 * requirement's text should live must not stop the plan from being written:
 * on 2026-10-07 the agent asked it at step 2 and wrote no task file at all.
 */
export const PlanDbFeatureBench = new class extends AcceptanceTestScenario {
  id = "plan-db";
  name = "Plan Database Feature";
  skill = "plan";
  stepTimeoutMs = 300_000;
  interactive = true;
  userPersona =
    `You are a developer who wants the change exactly as you described it. Be brief.
When the agent presents implementation variants, pick the one that implements your request as stated.
When the agent asks where to record a requirement, say it is up to the agent.
When the agent asks any other question, answer "yes, proceed".
Never ask the agent to implement the change.`;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno\n- Prisma",
  };

  userQuery =
    "/plan Plan adding a 'role' field to the User model. It should be an enum with values 'USER' and 'ADMIN', defaulting to 'USER'. Update the registration flow to support it.";

  checklist = [
    {
      id: "task_file_before_questions",
      description:
        "Did the agent write a task file under 'documents/tasks/' in its FIRST turn, before the user answered any question? An agent whose first turn ends with questions and no task file FAILS this item.",
      critical: true,
    },
    {
      id: "schema_update",
      description:
        "Does the plan include updating 'prisma/schema.prisma' with the new Role enum and field?",
      critical: true,
    },
    {
      id: "migration_step",
      description:
        "Does the plan include a step to create/run the database migration (e.g., 'prisma migrate')?",
      critical: true,
    },
    {
      id: "service_update",
      description:
        "Does the plan include updating 'src/user.service.ts' to accept and handle the optional role parameter?",
      critical: true,
    },
    {
      id: "default_value",
      description:
        "Does the plan mention setting the default value to 'USER' in the schema?",
      critical: true,
    },
  ];
}();
