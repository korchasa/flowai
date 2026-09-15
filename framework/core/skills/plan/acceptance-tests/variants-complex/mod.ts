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
      id: "variants_are_options_of_one_question",
      description:
        "Were the variants presented AS THE LABELLED OPTIONS OF ONE NUMBERED QUESTION (e.g. a numbered question whose options are tagged A. / B. / C. or 1) / 2) / 3)), rather than as standalone sections (`### Variant 1`, `## Option A`, bold headers) followed later by a separate 'which variant do you prefer?' prompt? FAIL if the same variants are described once in their own blocks and then listed again in the question — each variant must be described exactly ONCE, inside the question's own option list.",
      critical: true,
    },
    {
      id: "selection_question_self_contained",
      description:
        "Is the selection question answerable from the question and its options ALONE, without scrolling back to earlier text? It must name what is being decided (which authentication approach to build) in its own words. FAIL if it refers back to material the reader has not been shown inside the question itself — phrasings like 'which of the above', 'which variant do you prefer?' with no restatement, 'the options I listed', or a bare 'Your choice?'.",
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
