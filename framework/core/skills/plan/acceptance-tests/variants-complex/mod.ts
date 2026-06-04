import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const PlanVariantsComplexBench = new class
  extends AcceptanceTestScenario {
  id = "plan-variants-complex";
  name = "Plan Variants - Complex Task";
  skill = "plan";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "FinApp",
    TOOLING_STACK: "- TypeScript\n- Node.js\n- PostgreSQL",
  };

  async setup(sandboxPath: string) {
    await Deno.mkdir(join(sandboxPath, "documents"), { recursive: true });
  }

  userQuery =
    "/plan Plan a user authentication system for a high-load financial application. Context: The app is a fintech startup 'FinApp'. Users are retail investors. Load: 10k RPS. Security is paramount (SOC2 compliance). We use Node.js/TypeScript. Database is PostgreSQL. No existing auth system. We need to choose between JWT, Session, or OAuth2 (Google/GitHub). Constraints: Must be implemented in-house or using standard libraries, no paid auth providers like Auth0.";

  checklist = [
    {
      id: "task_file_created",
      description:
        "Did the agent create/write to a file in 'documents/tasks/' directory (as required by the planning process)?",
      critical: true,
    },
    {
      id: "quick_fix_archetype",
      description:
        "Did the agent present a QUICK-FIX archetype — a minimal-scope variant that solves the immediate problem with the least change, explicitly acknowledging it may incur tech debt? Judge by intent, not exact wording (labels like 'quick fix', 'minimal', 'fast', 'tactical' all qualify).",
      critical: true,
    },
    {
      id: "architecturally_correct_archetype",
      description:
        "Did the agent present an ARCHITECTURALLY-CORRECT archetype — a variant that is a proper, correct design WITHIN the task's current constraints/scope (not just the fastest)? Judge by intent, not exact wording.",
      critical: true,
    },
    {
      id: "long_term_archetype",
      description:
        "Did the agent present a BEST-LONG-TERM / strategic archetype — a variant optimizing maintainability over the horizon that MAY exceed current scope (e.g. a refactor or larger investment)? Judge by intent, not exact wording (labels like 'long-term', 'strategic', 'ideal', 'future-proof' all qualify). If the agent explicitly states this archetype collapses into the architecturally-correct one for this task, it must still surface a distinct third option and say so.",
      critical: true,
    },
    {
      id: "tradeoffs_discussed",
      description:
        "Did the agent give Pros/Cons/Risks per variant AND analyze trade-offs ACROSS the variants (e.g. speed vs correctness vs longevity)?",
      critical: true,
    },
  ];
}();
