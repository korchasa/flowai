import { BenchmarkSkillScenario } from "@bench/types.ts";

export const PlanAdrFullPlanningShapeBench = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-plan-adr-full-planning-shape";
  name =
    "ADR file contains both rationale (Context/Alternatives/Decision/Consequences) and implementation contract (Definition of Done with FR-Test-Evidence tuples + Solution)";
  skill = "flowai-skill-plan-adr";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  interactive = true;
  userPersona =
    `You are a developer planning a non-trivial architectural change: pick between server-side rendering (Next.js SSR) and static generation (Astro SSG) for the docs site, and capture the implementation plan in the same artifact. You have a mild preference for static generation because the docs are mostly static content and SEO/perf matter more than dynamic interactivity. You acknowledge SSR as a real alternative.

When the agent presents variants, pick "static generation (Astro SSG)" and ask the agent to proceed. Do NOT ask for additional alternatives. Keep replies short. If the agent asks clarifying questions about scope, scale, or stack, give plausible short answers (mid-size docs, ~50 pages, Deno+TypeScript stack). Never write the ADR content yourself — that is the agent's job.`;

  userQuery =
    "/flowai-skill-plan-adr We need to pick the rendering strategy for the new docs site (SSR vs SSG) and plan the migration. Capture the decision and the implementation plan.";

  checklist = [
    {
      id: "adr_file_created",
      description:
        "Did the agent create a file under 'documents/adr/' (path matches 'documents/adr/<YYYY-MM-DD>-<slug>.md')?",
      critical: true,
    },
    {
      id: "frontmatter_complete",
      description:
        "Read the created ADR file. Does its YAML frontmatter contain ALL of: 'id: ADR-NNNN' (4-digit zero-padded), 'status:', 'date:'? Optional 'implements:' and 'tags:' may also be present.",
      critical: true,
    },
    {
      id: "six_sections_in_order",
      description:
        "Read the created ADR file. Does the body contain exactly six top-level (## ) sections in this order: '## Context', '## Alternatives', '## Decision', '## Consequences', '## Definition of Done', '## Solution'? Order matters. Additional minor trailing sections (e.g., '## Follow-ups') are acceptable but the six listed sections MUST appear in the given order.",
      critical: true,
    },
    {
      id: "alternatives_brief",
      description:
        "Read the '## Alternatives' section. Is each alternative entry brief (≤ 8 lines per entry — 1-line description + short Pros + short Cons + optional 'Rejected because:' line)? Long detailed designs of rejected alternatives are a FAIL. Brevity is the requirement.",
      critical: false,
    },
    {
      id: "chosen_alternative_marked",
      description:
        "Read the '## Alternatives' section. Is one alternative explicitly marked as chosen (e.g., '(CHOSEN)' marker, or otherwise unambiguously identified as the selected option)?",
      critical: true,
    },
    {
      id: "rejection_cause_present",
      description:
        "Read the '## Alternatives' section. Does at least one non-chosen alternative carry an explicit rejection rationale (e.g., a 'Rejected because:' line)?",
      critical: true,
    },
    {
      id: "dod_has_tuple_structure",
      description:
        "Read the '## Definition of Done' section. Are DoD items checkboxes ('- [ ]' or '- [x]') AND each item is paired with sub-bullets containing (a) an FR-ID reference (e.g., 'FR-XXX' in the item line) AND (b) a 'Test:' or 'Benchmark:' reference AND (c) an 'Evidence:' reference with a runnable command? At least one DoD item with the full tuple is required.",
      critical: true,
    },
    {
      id: "solution_has_concrete_steps",
      description:
        "Read the '## Solution' section. Does it contain concrete step-by-step implementation guidance for the CHOSEN alternative (files to create/modify, approach, dependencies, verification commands)? Empty placeholder text or 'TBD' is a FAIL.",
      critical: true,
    },
    {
      id: "no_srs_modification",
      description:
        "Did the agent NOT create or modify 'documents/requirements.md' (SRS) during this run?",
      critical: true,
    },
    {
      id: "no_sds_modification",
      description:
        "Did the agent NOT create or modify 'documents/design.md' (SDS) during this run?",
      critical: true,
    },
  ];
}();
