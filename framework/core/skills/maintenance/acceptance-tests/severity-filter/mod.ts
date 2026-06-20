import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const MaintenanceSeverityFilterBench = new class
  extends AcceptanceTestScenario {
  id = "maintenance-severity-filter-critical-high";
  name = "Maintenance accepts a severity filter on the Resolution prompt";
  skill = "maintenance";
  stepTimeoutMs = 900_000;
  totalTimeoutMs = 1_800_000;
  interactive = true;
  userPersona =
    "You are a developer triaging a maintenance sweep and want to handle only the most urgent findings. The FIRST reply after the summary, EXACTLY: 'critical+high' (lowercase, plus-separated, no quotes, no surrounding text). For every per-finding question that follows, reply 'Skip'. When asked again how to proceed (if at all), reply 'done'.";
  agentsTemplateVars = {
    PROJECT_NAME: "SeverityFilterDemo",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  userQuery = `/maintenance. Use only standard CLI tools like cat, ls, grep, rg.

REPORT LANGUAGE — IMPORTANT, overrides any global language preference: render the findings summary in **English** with severity tags as the literal English strings '[Critical]', '[High]', '[Medium]', '[Low]'.`;

  checklist = [
    {
      id: "accepts_compound_severity_token",
      description:
        "After presenting the summary, did the agent ACCEPT the user's reply 'critical+high' as a valid filter — interpreting it as 'process all findings tagged Critical or High'? Acceptable evidence: the agent acknowledges the filter in plain text and enters the per-finding resolution loop. FAIL if the agent rejected the token as unknown, asked the user to rephrase, or treated 'critical+high' as a literal category-name search.",
      critical: true,
    },
    {
      id: "enters_resolution_loop_on_subset",
      description:
        "Did the agent enter the per-finding Apply/Skip/Edit loop ONLY on findings whose severity tag is '[Critical]' or '[High]'? Acceptable evidence: the per-finding prompts in the transcript reference only Critical or High tagged findings; the agent skipped Medium / Low ones without prompting the user about them.",
      critical: true,
    },
    {
      id: "ignores_medium_and_low",
      description:
        "Did the agent NOT open per-finding prompts for any '[Medium]' or '[Low]' tagged finding under this filter? FAIL if the agent walked through a Medium / Low finding's Apply/Skip/Edit prompt — that would mean the filter was ignored.",
      critical: true,
    },
    {
      id: "severity_tags_present_in_summary",
      description:
        "Was the summary (presented BEFORE the user's reply) tagged with one of '[Critical]', '[High]', '[Medium]', '[Low]' on every finding line? Without tags the filter has nothing to bind against — so this is a prerequisite.",
      critical: true,
    },
  ];
}();
