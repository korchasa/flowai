import { join } from "@std/path";
import { copy } from "@std/fs";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * Scenario: a real failed run is pre-staged in the sandbox. The agent must
 * diagnose the failure from the run artifacts without editing any source
 * file. The fixture is a verbatim copy of an actual MD-PRIOR-BULLETS failure
 * captured during FR-UNIVERSAL.QA-FORMAT scoping work.
 *
 * What the agent should produce:
 *   - read acceptance-tests/runs/latest/<scenario-id>/run-1/judge-evidence.md
 *   - read sandbox/.claude/skills/flowai-skill-conduct-qa-session/SKILL.md
 *   - read framework/engineering/skills/flowai-skill-conduct-qa-session/
 *     benchmarks/multi-select-format/mod.ts
 *   - classify the failure as MD-PRIOR-BULLETS (or list it among primary
 *     candidates with the right reasoning)
 *   - quote evidence in the report
 *   - NOT modify any files
 */
export const DiagnoseBenchMdPriorBulletsBench = new class
  extends AcceptanceTestScenario {
  id = "flowai-skill-diagnose-benchmark-failure-md-prior-bullets";
  name = "Diagnose benchmark failure — MD-PRIOR-BULLETS fixture";
  skill = "flowai-skill-diagnose-benchmark-failure";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "diagnoseBenchSandbox",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  // Static one-shot scenario; no simulated user replies needed.
  interactive = false;

  userQuery =
    "/flowai-skill-diagnose-benchmark-failure flowai-skill-conduct-qa-session-multi-select-format";

  override async setup(sandboxDir: string): Promise<void> {
    // Stage the failed-run artifacts and the scenario source file the
    // diagnosing agent must read. The fixture mirrors the real layout:
    //   acceptance-tests/runs/latest/<scenario-id>/run-1/{judge-evidence.md, sandbox/.claude/skills/...}
    //   framework/engineering/skills/<primitive>/{SKILL.md, benchmarks/<scenario>/mod.ts}
    const fixture = new URL("./fixture/", import.meta.url).pathname;
    await copy(join(fixture, "benchmarks"), join(sandboxDir, "benchmarks"), {
      overwrite: true,
    });
    await copy(join(fixture, "framework"), join(sandboxDir, "framework"), {
      overwrite: true,
    });
  }

  checklist = [
    {
      id: "read_judge_evidence",
      description:
        "Did the agent read the judge-evidence.md file from the failed run dir (acceptance-tests/runs/latest/<scenario-id>/run-1/judge-evidence.md)? Look for a Read tool call (or bash cat) targeting that path.",
      critical: true,
    },
    {
      id: "read_sandbox_skill",
      description:
        "Did the agent read the sandbox SKILL.md the failing agent saw, at acceptance-tests/runs/latest/<scenario-id>/run-1/sandbox/.claude/skills/flowai-skill-conduct-qa-session/SKILL.md? Look for a Read tool call targeting that path.",
      critical: true,
    },
    {
      id: "read_scenario_mod",
      description:
        "Did the agent read the scenario file framework/engineering/skills/flowai-skill-conduct-qa-session/benchmarks/multi-select-format/mod.ts to recover the checklist contract?",
      critical: true,
    },
    {
      id: "classification_made",
      description:
        "Does the agent's final report state a Primary failure-mode classification using one of the taxonomy codes documented in the skill (e.g., MD-PRIOR-BULLETS, HEADING-INSTEAD-OF-ITEM, STALE-SKILL-IN-SANDBOX, SKILL-NOT-MOUNTED, COMPOSITE-DELEGATION-BYPASS, PERSONA-MISMATCH, TEST-FITTING-PERSONA, CROSS-PACK-REFERENCE-MISSING)?",
      critical: true,
    },
    {
      id: "classification_correct",
      description:
        "Is the Primary classification MD-PRIOR-BULLETS (or, if multiple primaries are listed, does the list include MD-PRIOR-BULLETS as one of them)? The evidence shows the agent emitted bulleted dashes for option lines despite the SKILL.md mandating numbers — that is the exact MD-PRIOR-BULLETS pattern.",
      critical: true,
    },
    {
      id: "evidence_cited_with_paths",
      description:
        "Does the report contain at least two file:line citations pointing into the run artifacts (judge-evidence.md, sandbox SKILL.md, or the scenario mod.ts)? Citations like '(judge-evidence.md:NN-MM)' or 'sandbox/.../SKILL.md:NN' count.",
      critical: true,
    },
    {
      id: "no_files_edited",
      description:
        "Did the agent NOT edit, create, or delete any file under framework/, documents/, or scripts/? Report-only behaviour. (Reading is fine; writing is not.)",
      critical: true,
    },
    {
      id: "structured_report_sections",
      description:
        "Does the final report contain at least these sections (case-insensitive headings or labels are fine): 'Run inspected', 'Evidence', 'Failure-mode classification', 'Proposed next iteration'?",
      critical: false,
    },
    {
      id: "anti_actions_listed",
      description:
        "Does the report list at least one anti-action (a fix-direction it explicitly does NOT recommend) drawn from the taxonomy (e.g., 'do not add more imperative prose to SKILL.md — that has been empirically rejected for this mode')?",
      critical: false,
    },
  ];
}();
