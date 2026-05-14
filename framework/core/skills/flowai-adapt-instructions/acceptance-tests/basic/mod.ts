import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * Re-adapt AGENTS.md from an updated template.
 *
 * Scenario: project AGENTS.md was generated from an older template. Upstream
 * template gained a new section (for example, a CHECK step in TDD). The
 * project copy drifted. Agent must read the current installed template from
 * `.claude/assets/AGENTS.template.md`, compare it with the project AGENTS.md,
 * propose a merge that preserves project-specific sections, show the diff,
 * and ask for confirmation before writing.
 */
export const FlowAdaptInstructionsBasicBench = new class
  extends AcceptanceTestScenario {
  id = "flowai-adapt-instructions-basic";
  name = "Re-adapt AGENTS.md from an updated template";
  skill = "flowai-adapt-instructions";
  stepTimeoutMs = 300_000;

  maxSteps = 15;

  agentsTemplateVars = {
    PROJECT_NAME: "MyProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
    KEY_DECISIONS: "- Save plans to documents/tasks/",
  };

  override sandboxState = {
    modified: ["AGENTS.md"],
    expectedOutcome:
      "Agent reads .claude/assets/AGENTS.template.md, diffs it against AGENTS.md, proposes adding missing CHECK step to TDD flow while preserving project-specific sections, asks for confirmation before writing.",
  };

  override async setup(sandboxPath: string) {
    // Write an outdated project AGENTS.md missing the CHECK step.
    // Keep enough project-specific content that the agent has to preserve it.
    const outdatedAgentsMd = [
      "# MyProject",
      "",
      "## Project Vision",
      "Build the best tool for widget assembly.",
      "",
      "## Project tooling Stack",
      "- TypeScript",
      "- Deno",
      "",
      "## Key Decisions",
      "- Save plans to documents/tasks/",
      "",
      "## TDD Flow",
      "",
      "1. **RED**: Write a failing test.",
      "2. **GREEN**: Write minimal code to pass.",
      "3. **REFACTOR**: Improve without changing behavior.",
      "",
      "## Planning Rules",
      "- One plan per task.",
      "",
    ].join("\n");
    await Deno.writeTextFile(
      join(sandboxPath, "AGENTS.md"),
      outdatedAgentsMd,
    );

    // The benchmark runner already copied the framework into .claude/,
    // so .claude/assets/AGENTS.template.md is the CURRENT upstream template
    // (which contains a CHECK step). That's the exact drift this skill
    // is designed to close — no further setup needed.
  }

  userQuery =
    "/flowai-adapt-instructions The AGENTS.md template in .claude/assets/ was updated recently. Please re-adapt my AGENTS.md so it matches the new template but keeps my project-specific sections (vision, stack, decisions, planning).";

  checklist = [
    {
      id: "read_installed_template",
      description:
        "Did the agent read the template from `.claude/assets/AGENTS.template.md` (or equivalent IDE assets path) — NOT re-invent it from memory?",
      critical: true,
    },
    {
      id: "read_project_artifact",
      description:
        "Did the agent read the existing `<cwd>/AGENTS.md` before proposing changes?",
      critical: true,
    },
    {
      id: "computed_diff",
      description:
        "Did the agent compute or show a diff (or clear before/after comparison) between the template and the project artifact?",
      critical: true,
    },
    {
      id: "proposed_check_step",
      description:
        "Did the agent propose adding the missing CHECK step (or an equivalent missing framework section) to AGENTS.md?",
      critical: true,
    },
    {
      id: "preserved_project_sections",
      description:
        "Did the proposal preserve project-specific sections verbatim (project name 'MyProject', vision, stack, decisions, planning rules)?",
      critical: true,
    },
    {
      id: "asked_confirmation",
      description:
        "Did the agent ask for user confirmation before writing AGENTS.md?",
      critical: true,
    },
    {
      id: "no_template_duplication",
      description:
        "Did the agent NOT inline a fresh template from scratch (i.e. it relied on the installed asset rather than regenerating AGENTS.md wholesale)?",
      critical: false,
    },
    {
      id: "explained_changes",
      description:
        "Did the agent explain WHY each proposed change is recommended (e.g. the CHECK step ensures formatter/linter/tests run)?",
      critical: false,
    },
  ];
}();
