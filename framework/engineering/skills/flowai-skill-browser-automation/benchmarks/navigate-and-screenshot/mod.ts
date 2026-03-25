import { BenchmarkSkillScenario } from "../../../../../../scripts/benchmarks/lib/types.ts";

export const BrowserAutomationNavigateBench = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-browser-automation-navigate-and-screenshot";
  name = "Navigate to Page and Take Screenshot";
  skill = "flowai-skill-browser-automation";
  stepTimeoutMs = 120_000;
  maxSteps = 15;

  userQuery =
    "/flowai-skill-browser-automation Open https://example.com, capture the page structure, then take a screenshot.";

  checklist = [
    {
      id: "detects_tool",
      description:
        "Did the agent detect or select an available browser automation tool?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "navigates_to_url",
      description: "Did the agent navigate to or fetch https://example.com?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "captures_structure",
      description:
        "Did the agent capture page structure (snapshot, DOM, or HTML content)?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "takes_screenshot",
      description:
        "Did the agent take a screenshot or explain why it cannot (tool limitation)?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "cleans_up",
      description:
        "Did the agent close the browser session (if one was opened)?",
      critical: false,
      type: "semantic" as const,
    },
  ];
}();
