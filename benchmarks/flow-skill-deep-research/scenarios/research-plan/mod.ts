import { BenchmarkSkillScenario } from "../../../../scripts/benchmarks/lib/types.ts";

export const DeepResearchPlanBench = new class extends BenchmarkSkillScenario {
  id = "flow-skill-deep-research-plan";
  name = "Create a deep research plan with directions and queries";
  skill = "flow-skill-deep-research";
  stepTimeoutMs = 300_000;

  userQuery =
    "/flow-skill-deep-research Research the current state of WebAssembly adoption in server-side applications. Focus on performance benchmarks, production use cases, and limitations compared to native code.";

  maxSteps = 5;

  checklist = [
    {
      id: "search_method_detection",
      description:
        "Did the agent attempt to detect the available search method (built-in, playwright-cli, MCP) before planning?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "directions_count",
      description:
        "Did the agent decompose the topic into 3-6 non-overlapping research directions?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "queries_per_direction",
      description:
        "Did each direction include 3-5 search query variations (broad, narrow, criticism)?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "acceptance_criteria",
      description:
        "Did each direction specify acceptance criteria (source type, recency)?",
      critical: false,
      type: "semantic" as const,
    },
    {
      id: "output_files_defined",
      description:
        "Did the plan define output file paths in _research_tmp/ for each direction?",
      critical: true,
      type: "semantic" as const,
    },
    {
      id: "no_approval_wait",
      description:
        "Did the agent proceed automatically without asking for user approval of the plan?",
      critical: false,
      type: "semantic" as const,
    },
  ];
}();
