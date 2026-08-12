import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * Does the planner CONSUME what surface-scout returns, or merely launch it?
 *
 * Its siblings (`plan-affected-surface-scout`, `plan-surface-non-code`) check
 * that the dispatch happens and that a surface section lands. Neither can tell
 * whether the scout's findings ever reached the planner — and that gap produced
 * a false pass: subagent dispatch is asynchronous, so the tool call returns
 * `agentId` plus usage counters and nothing else (172 bytes, measured
 * 2026-08-11 in the passing run AND the failing one alike). A planner that
 * writes a block labelled "SCOUT OUTPUT (VERBATIM)" at that moment cannot have
 * copied it from the scout; it wrote the text itself, and one judge scored that
 * as a pass. Splitting the question out is the point of this scenario: the
 * other two stay cheap and check the call, this one checks the result.
 *
 * The fixture plants three implementations of the same truncation rule:
 * - `src/report/pdf_export.ts` — the site the request names;
 * - `src/report/csv_export.ts` — a parallel copy, reachable by grepping the
 *   shared `slice(0, 40)` shape;
 * - `legacy/exporters/report_writer.py` — a third copy sharing NO identifier
 *   with the other two, in another language, imported by nothing. A symbol
 *   grep never reaches it; only somebody reading the tree does.
 *
 * That third site is the discriminator. It is the finding an independent scout
 * pass is for, and its presence in the task file is evidence the planner used
 * what came back rather than its own quick look.
 */
export const PlanUsesScoutFindingsBench = new class
  extends AcceptanceTestScenario {
  id = "plan-uses-scout-findings";
  name = "Plan consumes the surface-scout result, not just the dispatch";
  skill = "plan";
  stepTimeoutMs = 420_000;
  agentsTemplateVars = {
    PROJECT_NAME: "ReportSuite",
    TOOLING_STACK: "- TypeScript\n- Deno\n- Python (legacy nightly job)",
  };

  async setup(sandboxPath: string) {
    await Deno.mkdir(join(sandboxPath, "documents"), { recursive: true });
  }

  userQuery =
    "/plan Bug report: long report titles are cut mid-word and end with three dots. " +
    "Product spec: (1) a truncated title must break on a word boundary, never mid-word; " +
    "(2) it must end with the single ellipsis character '…', not '...'. " +
    "The PDF export in src/report/pdf_export.ts shows the problem. Plan the fix.";

  checklist = [
    {
      id: "scout_subagent_dispatched",
      description:
        "Does the tool-call trace show a SUBAGENT dispatch targeting 'surface-scout' (a Task/Agent invocation whose agent type, name, or prompt names it)? Inline grep/search by the main agent does NOT count.",
      critical: true,
    },
    {
      id: "scout_result_obtained",
      description:
        "Did the scout's FINDINGS actually reach the planner before it wrote the task file? Look for the scout's returned report in the trace — a result payload carrying its enumeration, a completion notification the agent then reads, or an explicit wait/resume. A tool result that contains ONLY a launch handle (an agentId and usage counters, no enumeration) means the findings never arrived: score this item FAIL in that case, even though the dispatch itself happened.",
      critical: true,
    },
    {
      id: "legacy_site_in_surface",
      description:
        "Does the task file's '### Affected Surface' content name legacy/exporters/report_writer.py — the third implementation of the same truncation rule? It shares no identifier with the TypeScript exporters and nothing imports it, so a symbol grep does not surface it.",
      critical: true,
    },
    {
      id: "no_fabricated_verbatim",
      description:
        "If the task file presents any block as the scout's verbatim or raw output, does that text correspond to output the scout actually returned in the trace? Presenting the agent's own enumeration under a 'verbatim scout output' label is a FAIL — a fabricated quotation is worse than no quotation. No such block at all: PASS.",
      critical: true,
    },
    {
      id: "parallel_ts_site_in_surface",
      description:
        "Does the affected-surface content also name src/report/csv_export.ts, the parallel TypeScript copy the request never mentions?",
      critical: false,
    },
  ];
}();
