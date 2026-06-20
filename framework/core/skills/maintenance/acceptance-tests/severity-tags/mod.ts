import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const MaintenanceSeverityTagsBench = new class
  extends AcceptanceTestScenario {
  id = "maintenance-surfaces-severity-tags";
  name = "Maintenance tags every finding with a severity level";
  skill = "maintenance";
  stepTimeoutMs = 900_000;
  totalTimeoutMs = 1_800_000;
  interactive = true;
  userPersona =
    'You are a developer who wants the audit but will skip every fix. When asked how to proceed, say "done". Be brief.';
  agentsTemplateVars = {
    PROJECT_NAME: "SeverityDemo",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  userQuery = `/maintenance. Use only standard CLI tools like cat, ls, grep, rg.

REPORT LANGUAGE — IMPORTANT for this audit, overrides any global language preference: render the findings summary in **English**, with severity tags as the literal English strings '[Critical]', '[High]', '[Medium]', '[Low]'. Reasoning: severity tags are technical identifiers consumed downstream by filters and dashboards; translation collapses distinct severity tiers (e.g. 'High' and 'Medium' may both become a single Russian word). Keep tags in English verbatim.`;

  checklist = [
    {
      id: "severity_tag_present_on_every_finding",
      description:
        "Did EVERY numbered finding line in the Resolution Phase summary carry exactly one severity tag — one of '[Critical]', '[High]', '[Medium]', '[Low]' — placed IMMEDIATELY after the bracketed number and BEFORE the file/symbol site? Example shape: '- [1] [Critical] src/foo.ts: silent catch. (Fix: ...)'. FAIL if any finding line is missing a tag or if the tag is placed elsewhere (e.g., after the site, in the category header, or as a separate column). [verified false] lines from the gate are exempt (they have no severity).",
      critical: true,
    },
    {
      id: "per_severity_counters_in_summary",
      description:
        "Did the closing total line of the findings summary report per-severity counters in addition to the existing per-category counters? Acceptable forms include: 'Total: N findings — Critical: a, High: b, Medium: c, Low: d', or a 'Severity totals: Critical X, High Y, ...' bullet, or any structured tally that lists at least three of the four tiers seen in the report. A bare 'Total: N findings' without severity breakdown is FAIL.",
      critical: true,
    },
    {
      id: "findings_sorted_within_category",
      description:
        "Within any category that contains BOTH a Critical-tagged and a non-Critical-tagged finding in this report, did Critical-tagged findings appear BEFORE non-Critical ones (i.e., sort order Critical → High → Medium → Low, ties stable by issue number)? If no category mixes severity tiers in this scan, mark this item PASS by default.",
      critical: false,
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
        "Did the agent ask the user how to proceed after the summary (offering options like 'all', specific numbers, category name, severity name, or 'done')?",
      critical: true,
    },
    {
      id: "no_premature_fixes",
      description:
        "Did the agent NOT apply any fixes during the scan phase? Files in the fixture should be unchanged when the user answers 'done'.",
      critical: true,
    },
  ];
}();
