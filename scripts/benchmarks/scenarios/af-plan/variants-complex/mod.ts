import { join } from "@std/path";
import { BenchmarkScenario } from "../../../lib/types.ts";

const AGENT_PATH = "catalog/skills/af-plan/SKILL.md";

export const PlanVariantsComplexBench: BenchmarkScenario = {
  id: "af-plan-variants-complex",
  name: "Plan Variants - Complex Task",
  targetAgentPath: AGENT_PATH,
  skillName: "af-plan",

  setup: async (sandboxPath: string) => {
    await Deno.mkdir(join(sandboxPath, "documents"), { recursive: true });
  },

  userQuery:
    "/af-plan Plan a user authentication system for a high-load financial application. Context: The app is a fintech startup 'FinApp'. Users are retail investors. Load: 10k RPS. Security is paramount (SOC2 compliance). We use Node.js/TypeScript. Database is PostgreSQL. No existing auth system. We need to choose between JWT, Session, or OAuth2 (Google/GitHub). Constraints: Must be implemented in-house or using standard libraries, no paid auth providers like Auth0.",

  checklist: [
    {
      id: "whiteboard_created",
      description:
        "Did the agent create/write to 'documents/whiteboard.md' (as required by the planning process)?",
      critical: true,
    },
    {
      id: "multiple_variants",
      description:
        "Did the agent present MULTIPLE (2 or more) implementation variants in the chat?",
      critical: true,
      type: "semantic",
    },
    {
      id: "tradeoffs_discussed",
      description:
        "Did the agent discuss pros/cons/trade-offs for the variants?",
      critical: true,
      type: "semantic",
    },
  ],
};
