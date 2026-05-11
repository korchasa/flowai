import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const MaintenanceDocHealthBench = new class
  extends AcceptanceTestScenario {
  id = "flowai-skill-maintenance-detects-doc-health-issues";
  name = "Maintenance flags broken/orphan/stale doc references";
  skill = "flowai-skill-maintenance";
  stepTimeoutMs = 420_000;
  interactive = true;
  userPersona =
    'You are a developer who wants the audit but will skip every fix. When asked how to proceed, say "done". Be brief.';
  agentsTemplateVars = {
    PROJECT_NAME: "DemoProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  userQuery =
    `/flowai-skill-maintenance. Use only standard CLI tools like cat, ls, grep, rg.

REPORT LANGUAGE — IMPORTANT for this audit, overrides any global language preference: render the findings summary in **English**, with category labels as their literal English strings ('Structural Integrity', 'Code Hygiene', 'Documentation Coverage', 'Documentation Health', etc.). Reasoning: the category labels are technical identifiers consumed downstream (the FR-DOC-LINT verifier looks for the exact English token). Translation collapses distinct categories — for example, 'Documentation Health' and 'Consistency (Docs vs Code)' both become 'Согласованность документации' in Russian, which silently merges two semantically separate audit tracks (doc-vs-doc integrity vs. doc-vs-code drift). Keeping the labels in English preserves the distinction.`;

  checklist = [
    {
      id: "documentation_health_category_present",
      description:
        "Did the agent's findings summary include a DEDICATED grouping header for this audit's doc-system findings (broken GFM links, stale FRs, orphan FRs, SRS-SDS contradictions, index drift)? The header must be a NEW category not present in the existing 8 (Structural Integrity, Code Hygiene, Complexity & Hotspots, Technical Debt, Consistency / Docs vs Code, Documentation Coverage, Instruction Coherence, Tooling Relevance) — translations of the existing 8 do NOT count. Acceptable header forms include the literal English 'Documentation Health' / 'Doc Health' / 'Documentation Hygiene', a Cyrillic translation that is unambiguously about doc-system integrity (e.g. 'Здоровье документации', 'Гигиена документации', 'Целостность документации', 'Doc-Link Hygiene'), or any other clear DEDICATED label that does NOT collapse into 'Drift' / 'Consistency' / 'Documentation Coverage'. FAIL if the doc-link / orphan-FR / stale-acceptance findings are folded into any of the existing 8 categories.",
      critical: true,
    },
    {
      id: "broken_link_detected",
      description:
        "Did the findings include an entry under Documentation Health that flags the broken GFM link in 'src/cache.ts' pointing to '#fr-missing-no-such-anchor' or 'FR-MISSING' (the anchor / FR does not exist in 'documents/requirements.md')?",
      critical: true,
    },
    {
      id: "second_doc_issue_detected",
      description:
        "In addition to the broken link, did the findings include AT LEAST ONE more Documentation Health entry — either: (a) FR-AUTH flagged as an orphan (marked [x] in SRS but with no GFM-link reference in source code); (b) a stale-acceptance finding noting that the test paths in '**Acceptance:**' fields (e.g., 'tests/cache_test.ts', 'tests/auth_test.ts') do not exist in the project; or (c) any other concrete doc-health issue from the fixture's SRS or source.",
      critical: true,
    },
    {
      id: "constructive_fix_for_doc_issue",
      description:
        "Does each Documentation Health finding carry a '(Fix: …)' proposal or recommendation (e.g., 'remove broken link', 'add code reference', 'create the test file', 'flip status to [ ]')?",
      critical: true,
    },
    {
      id: "numbered_summary",
      description:
        "Did the agent present a numbered summary of findings (e.g., [1], [2], …) grouped by category, before asking the user how to proceed?",
      critical: true,
    },
    {
      id: "asks_how_to_proceed",
      description:
        "Did the agent ask the user how to proceed after the summary (offering options like 'all', specific numbers, category name, or 'done')?",
      critical: true,
    },
    {
      id: "no_premature_fixes",
      description:
        "Did the agent NOT apply any fixes during the scan phase? Files in the fixture (the SRS, the broken-link code comment) should be unchanged when the user answers 'done'.",
      critical: true,
    },
  ];
}();
