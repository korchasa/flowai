import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * Tests that `plan` never writes an option as a paragraph
 * (FR-UNIVERSAL.QA-FORMAT, FR-PLAN-VARIANT-ARCHETYPES).
 *
 * The defect the user reported: a variant arrives as one block of running
 * text with pros, cons and risks mixed into the prose, so the reader has to
 * reconstruct the comparison sentence by sentence and a missing property is
 * invisible. It shows up on any option, the first one included — it is not a
 * property of later, secondary option sets.
 *
 * The checklist therefore scores every option of every set the reply opens,
 * and fails on the first one written as prose or squeezed into a single line.
 *
 * Do NOT list the secondary decisions in the query. A request that enumerates
 * them, with their candidate answers, hands the agent the structure of the
 * reply — the same runs then pass on the pre-fix text as well, and the
 * scenario stops separating the two.
 *
 * The checklist scores layout only — which properties are labelled and where
 * the trade-offs sit — never the engineering content of the plan.
 */
export const PlanVariantPropertiesLabelledBench = new class
  extends AcceptanceTestScenario {
  id = "plan-variant-properties-labelled";
  name = "Plan Variants - Properties Separately Labelled";
  skill = "plan";
  stepTimeoutMs = 300_000;

  agentsTemplateVars = {
    PROJECT_NAME: "PublicAPI",
    TOOLING_STACK: "- TypeScript\n- Node.js\n- Redis",
  };

  override async setup(sandboxPath: string) {
    await Deno.mkdir(join(sandboxPath, "documents"), { recursive: true });
  }

  userQuery =
    "/plan Plan rate limiting for our public REST API. Context: Node.js/TypeScript service behind a load balancer, 4 stateless instances, Redis already deployed for caching. Traffic is ~2k RPS with occasional abusive clients. We must not break existing paying customers. No paid SaaS. " +
    "Candidate approaches: a per-instance in-memory counter, a shared Redis token bucket, or an API gateway feature we would have to introduce.";

  checklist = [
    {
      id: "no_option_written_as_a_paragraph",
      description:
        "Take EVERY option of EVERY set of alternatives in the reply. Is each option's analysis broken into separate labelled parts, one property per line or bullet? FAIL if ANY option is written as a running paragraph, or as a single line that folds several properties behind commas, semicolons or dashes. This is the defect the scenario exists to catch: prose where a labelled list belongs. It FAILS on the very first option written that way — the first set is not exempt.",
      critical: true,
    },
    {
      id: "all_four_properties_labelled_per_option",
      description:
        "For EVERY option of EVERY set, are all FOUR properties present, each as its own labelled part — pros, cons, risks, and what/whom it is best for? FAIL if any option carries only two or three of them, even when the missing property is arguably obvious, and FAIL if a property is present but only as a clause inside another property's sentence.",
      critical: true,
    },
    {
      id: "cross_variant_tradeoffs_outside_option_properties",
      description:
        "For each set of alternatives, are the cross-option trade-offs stated as their OWN part that follows the option list, rather than folded into one option's properties or omitted?",
      critical: true,
    },
  ];
}();
