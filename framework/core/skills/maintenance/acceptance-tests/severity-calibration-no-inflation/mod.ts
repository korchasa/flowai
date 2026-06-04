import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const MaintenanceSeverityCalibrationBench = new class
  extends AcceptanceTestScenario {
  id = "maintenance-severity-calibration-no-inflation";
  name = "Maintenance calibrates severity tiers without Critical inflation";
  skill = "maintenance";
  stepTimeoutMs = 420_000;
  interactive = true;
  userPersona =
    'You are a developer who wants the audit but will skip every fix. When asked how to proceed, say "done". Be brief.';
  agentsTemplateVars = {
    PROJECT_NAME: "CalibrationDemo",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  userQuery = `/maintenance. Use only standard CLI tools like cat, ls, grep, rg.

REPORT LANGUAGE — IMPORTANT, overrides any global language preference: render the findings summary in **English** with severity tags as the literal English strings '[Critical]', '[High]', '[Medium]', '[Low]'.`;

  checklist = [
    {
      id: "critical_share_within_thirty_five_percent",
      description:
        "Of all numbered findings in the Resolution Phase summary, how many carry the '[Critical]' tag? Count Critical lines and divide by total finding lines (exclude any '[verified false]' lines from the gate, since those are dropped findings, not graded ones). FAIL if the Critical share exceeds 35% (0.35). The fixture is intentionally calibrated so the rubric-correct Critical share is well under 20%; an inflated result is a calibration regression.",
      critical: true,
    },
    {
      id: "at_least_one_each_tier_present",
      description:
        "Does the summary contain at least one finding tagged with each of '[Critical]', '[High]', '[Medium]', and '[Low]'? The fixture is seeded so all four tiers should appear when the rubric is applied honestly. FAIL if any tier is missing — that signals tier collapse (the agent flattening to two or three tiers).",
      critical: true,
    },
    {
      id: "severity_tag_present_on_every_finding",
      description:
        "Did EVERY numbered finding line carry one of '[Critical]', '[High]', '[Medium]', '[Low]' (excluding '[verified false]' drops)?",
      critical: true,
    },
    {
      id: "numbered_summary",
      description:
        "Did the agent present a numbered summary of findings (e.g., [1], [2], …) grouped by category, before asking the user how to proceed?",
      critical: true,
    },
  ];
}();
