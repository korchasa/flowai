import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

/**
 * Tests that the agent compares templates against actual project artifacts,
 * not just analyzes `git diff` of template files vs their own HEAD.
 *
 * Reproduces a real failure mode: when many skill files change (mostly
 * formatting), the agent runs `git diff` on `.claude/skills/`, sees
 * "mostly formatting noise", concludes "no migration needed" — without
 * ever reading the actual project artifact (AGENTS.md) to compare.
 *
 * Scenario setup:
 * 1. AGENTS.template.md changed — with formatting noise
 * 2. Several other skill SKILL.md files changed — formatting only (noise)
 * 3. ONE substantive change hidden in AGENTS.template.md: new "Proactive
 *    Resolution" planning rule
 * 4. Project AGENTS.md is missing that rule
 * 5. Agent must NOT dismiss everything as formatting — must compare
 *    template against artifact to find the gap
 */
export const FlowUpdateTemplateVsArtifactBench = new class
  extends AcceptanceTestScenario {
  id = "flowai-update-template-vs-artifact";
  name =
    "Compares templates against project artifacts (not just template git diff)";
  skill = "flowai-update";
  stepTimeoutMs = 300_000;

  maxSteps = 25;

  agentsTemplateVars = {
    PROJECT_NAME: "MyProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override sandboxState = {
    commits: [
      {
        message: "Initial sync (baseline)",
        files: [
          ".claude/assets/AGENTS.template.md",
          ".claude/skills/flowai-reflect/SKILL.md",
          ".claude/skills/flowai-review/SKILL.md",
          ".claude/skills/flowai-commit/SKILL.md",
        ],
      },
    ],
    modified: [
      ".claude/assets/AGENTS.template.md",
      ".claude/skills/flowai-reflect/SKILL.md",
      ".claude/skills/flowai-review/SKILL.md",
      ".claude/skills/flowai-commit/SKILL.md",
    ],
    expectedOutcome:
      "Agent compares templates against project artifacts (not just git diff), finds missing Proactive Resolution rule in AGENTS.md, proposes adding it",
  };

  override async setup(sandboxPath: string) {
    // Overwrite template-generated AGENTS.md with version MISSING "Proactive Resolution"
    // so the agent must compare templates vs artifacts to find the gap
    await Deno.writeTextFile(
      join(sandboxPath, "AGENTS.md"),
      [
        "# MyProject",
        "",
        "## Project tooling Stack",
        "- TypeScript, Deno",
        "",
        "## Planning Rules",
        "",
        "- **Environment Side-Effects**: Changes to infra/DB/external services → plan MUST include migration/sync/deploy steps.",
        "- **Verification Steps**: Plan MUST include specific verification commands (tests, validation tools, connectivity checks).",
        "- **Functionality Preservation**: Refactoring/modifications → run existing tests before/after; add new tests if coverage missing.",
        "- **Data-First**: Integration with external APIs/processes → inspect protocol & data formats BEFORE planning.",
        "- **Architectural Validation**: Complex logic changes → visualize event sequence (sequence diagram/pseudocode).",
        "- **Variant Analysis**: Non-obvious path → propose variants with Pros/Cons/Risks per variant + Trade-offs across variants. Quality > quantity. 1 variant OK if path is clear.",
        "- **User Decision Gate**: Do NOT detail implementation plan until user explicitly selects a variant.",
        "- **Plan Persistence**: After variant selection, save the detailed plan to documents/tasks/<date>-<slug>.md using GODS format. Chat-only plans are lost between sessions.",
        "",
        "## TDD FLOW",
        "",
        "1. **RED**: Write test for new/changed logic or behavior.",
        "2. **GREEN**: Pass test.",
        "3. **REFACTOR**: Improve code/tests. No behavior change.",
        "4. **CHECK**: Run check command. Fix all.",
        "",
      ].join("\n"),
    );

    // --- Prepare "old" template versions (baseline) ---
    const skillsBase = join(sandboxPath, ".claude", "skills");
    const assetsBase = join(sandboxPath, ".claude", "assets");

    // 1. AGENTS.template.md — remove "Proactive Resolution" + add formatting noise
    const mainTemplatePath = join(
      assetsBase,
      "AGENTS.template.md",
    );
    const newMainTemplate = await Deno.readTextFile(mainTemplatePath);
    const oldMainTemplate = newMainTemplate
      .split("\n")
      .filter((line) => !line.includes("Proactive Resolution"))
      .join("\n")
      .replace("## Planning Rules\n", "## Planning Rules\n\n")
      .replace("## Project Information\n", "\n## Project Information\n\n")
      .replace("## Key Decisions\n", "\n## Key Decisions\n\n");

    // 2. Create additional formatting-only noise in other skills
    const noisySkills = [
      "flowai-reflect",
      "flowai-review",
      "flowai-commit",
    ];
    const noisyOldVersions: Map<string, { path: string; newContent: string }> =
      new Map();

    for (const skill of noisySkills) {
      const skillPath = join(skillsBase, skill, "SKILL.md");
      try {
        const content = await Deno.readTextFile(skillPath);
        noisyOldVersions.set(skill, { path: skillPath, newContent: content });
        // Add formatting noise: extra blank lines
        const oldContent = content
          .replace(/## Overview\n/g, "\n## Overview\n\n")
          .replace(/## Context\n/g, "\n## Context\n\n")
          .replace(/## Rules/g, "\n## Rules");
        await Deno.writeTextFile(skillPath, oldContent);
      } catch {
        // Skill doesn't exist in sandbox — skip
      }
    }

    // Write old version of template
    await Deno.writeTextFile(mainTemplatePath, oldMainTemplate);

    // Commit everything as "previous sync" baseline
    await runGit(sandboxPath, ["add", "-A"]);
    await runGit(sandboxPath, ["commit", "-m", "Initial sync (baseline)"]);

    // --- Restore "new" version (simulate flowai sync) ---
    await Deno.writeTextFile(mainTemplatePath, newMainTemplate);

    for (const [, { path, newContent }] of noisyOldVersions) {
      await Deno.writeTextFile(path, newContent);
    }

    // Now `git status` shows ~4 changed files, `git diff` is mostly formatting.
    // Only AGENTS.template.md has a substantive change (new planning rule).
    // Agent must compare template vs project artifact to find the gap.
  }

  userQuery =
    "/flowai-update I already ran `flowai sync` and it updated some skills. Please skip the CLI update and sync steps. Analyze the changes and propose any needed migrations to the project.";

  checklist = [
    {
      id: "detected_multiple_changes",
      description:
        "Did the agent detect multiple changed files in `.claude/skills/` (not just one template)?",
      critical: true,
    },
    {
      id: "read_project_agents_md",
      description:
        "Did the agent read the actual project `AGENTS.md` file (not just the template diff) to compare against the template?",
      critical: true,
    },
    {
      id: "found_missing_proactive_resolution",
      description:
        'Did the agent identify that the project `AGENTS.md` is missing the "Proactive Resolution" planning rule that exists in the template?',
      critical: true,
    },
    {
      id: "proposed_adding_rule",
      description:
        'Did the agent propose adding the "Proactive Resolution" rule to the project\'s Planning Rules section in AGENTS.md?',
      critical: true,
    },
    {
      id: "not_dismissed_as_formatting",
      description:
        'Did the agent NOT dismiss all changes as "just formatting" or "cosmetic only — no migration needed" without comparing templates to project artifacts?',
      critical: true,
    },
  ];
}();
