import { BenchmarkScenario } from "../../lib/types.ts";
import { join } from "@std/path";

const AGENT_PATH = ".cursor/skills/af-plan/SKILL.md";

export const PlanDbFeatureBench: BenchmarkScenario = {
  id: "af-plan-db",
  name: "Plan Database Feature",
  targetAgentPath: AGENT_PATH,

  setup: async (sandboxPath: string) => {
    await Deno.mkdir(join(sandboxPath, "prisma"), { recursive: true });
    await Deno.mkdir(join(sandboxPath, "src"), { recursive: true });
    await Deno.mkdir(join(sandboxPath, "documents"), { recursive: true });

    const schema = `
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
}
`;
    await Deno.writeTextFile(join(sandboxPath, "prisma/schema.prisma"), schema);

    const service = `
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function register(email: string, name: string) {
  return prisma.user.create({
    data: { email, name },
  });
}
`;
    await Deno.writeTextFile(join(sandboxPath, "src/user.service.ts"), service);
  },

  userQuery:
    "Plan adding a 'role' field to the User model. It should be an enum with values 'USER' and 'ADMIN', defaulting to 'USER'. Update the registration flow to support it.",

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
